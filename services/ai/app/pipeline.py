import logging
from datetime import datetime, timedelta, timezone

from app.db import get_db
from app.llm import suggest_tags, write_digest
from app.scrape import scrape_url
from app.ssrf import UnsafeUrlError

logger = logging.getLogger(__name__)


def _link(link_id: str, user_id: str) -> dict | None:
    db = get_db()
    res = (
        db.table("links")
        .select("*")
        .eq("id", link_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


def extract_content(link_id: str, user_id: str, force: bool = False) -> dict:
    row = _link(link_id, user_id)
    if not row:
        return {"ok": False, "error": "Link not found"}
    if (
        not force
        and row.get("scrape_status") == "ready"
        and (row.get("content_raw") or "").strip()
    ):
        return {"ok": True, "skipped": True}

    db = get_db()
    try:
        result = scrape_url(row["url"])
    except UnsafeUrlError as exc:
        db.table("links").update(
            {
                "scrape_status": "failed",
                "scrape_error": str(exc),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", link_id).eq("user_id", user_id).execute()
        return {"ok": False, "error": str(exc)}
    except Exception as exc:
        db.table("links").update(
            {
                "scrape_status": "failed",
                "scrape_error": str(exc)[:500],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", link_id).eq("user_id", user_id).execute()
        raise

    patch = {
        "content_raw": result["text"] or None,
        "scrape_status": "ready" if result["text"] else "failed",
        "scrape_error": None if result["text"] else "No extractable text",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if result.get("title") and (
        not row.get("title") or row.get("title") == row.get("domain")
    ):
        patch["title"] = result["title"][:300]
    if result.get("og_image_url") and not row.get("og_image_url"):
        patch["og_image_url"] = result["og_image_url"]
    db.table("links").update(patch).eq("id", link_id).eq("user_id", user_id).execute()
    return {"ok": True, "skipped": False}


def auto_tag(link_id: str, user_id: str) -> dict:
    row = _link(link_id, user_id)
    if not row:
        return {"ok": False, "error": "Link not found"}
    db = get_db()
    tags = (
        db.table("tags").select("id,name").eq("user_id", user_id).execute().data or []
    )
    collections = (
        db.table("collections")
        .select("id,name")
        .eq("user_id", user_id)
        .execute()
        .data
        or []
    )
    content = row.get("content_raw") or ""
    if not content:
        db.table("links").update(
            {
                "auto_tag_status": "failed",
                "scrape_error": row.get("scrape_error") or "No content to tag",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", link_id).eq("user_id", user_id).execute()
        return {"ok": False, "error": "No content"}

    try:
        suggestion = suggest_tags(
            row.get("title") or "",
            row["url"],
            content,
            tags,
            collections,
        )
    except Exception as exc:
        db.table("links").update(
            {
                "auto_tag_status": "failed",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", link_id).eq("user_id", user_id).execute()
        logger.warning("auto-tag failed: %s", exc)
        return {"ok": False, "error": str(exc)}

    names = []
    for name in suggestion["existing_tags"] + suggestion["new_tags"]:
        if name not in names:
            names.append(name)

    db.table("links").update(
        {
            "suggested_tag_names": names,
            "suggested_collection_id": suggestion["collection_id"],
            "auto_tag_status": "ready",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", link_id).eq("user_id", user_id).execute()
    return {"ok": True, "suggested": names}


def run_extract_and_tag(link_id: str, user_id: str, force: bool = False) -> dict:
    extracted = extract_content(link_id, user_id, force=force)
    tagged = auto_tag(link_id, user_id)
    return {"extract": extracted, "auto_tag": tagged}


def digest_for_user(
    user_id: str, frequency: str | None = None, force: bool = False
) -> dict:
    db = get_db()
    settings_row = (
        db.table("user_ai_settings")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    freq = frequency or (
        settings_row[0]["digest_frequency"] if settings_row else "weekly"
    )
    if freq == "off":
        if not force:
            return {"ok": True, "skipped": True}
        freq = "weekly"
    hours = 24 if freq == "daily" else 24 * 7
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    links = (
        db.table("links")
        .select("title,url,domain,content_raw,created_at")
        .eq("user_id", user_id)
        .gte("created_at", since.isoformat())
        .order("created_at", desc=True)
        .limit(40)
        .execute()
        .data
        or []
    )
    prompt = settings_row[0].get("prompt_override") if settings_row else None
    if not links:
        content = "_No links saved in this period._"
    else:
        compact = [
            {
                "title": row.get("title"),
                "url": row.get("url"),
                "domain": row.get("domain"),
                "excerpt": (row.get("content_raw") or "")[:800],
            }
            for row in links
        ]
        content = write_digest(compact, prompt)
    db.table("ai_summaries").insert(
        {
            "user_id": user_id,
            "collection_id": None,
            "content": content,
            "prompt_used": prompt,
        }
    ).execute()
    return {"ok": True, "skipped": False}


def digest_tick() -> int:
    db = get_db()
    users = (
        db.table("user_ai_settings")
        .select("user_id,digest_frequency")
        .neq("digest_frequency", "off")
        .execute()
        .data
        or []
    )
    count = 0
    now = datetime.now(timezone.utc)
    for row in users:
        freq = row["digest_frequency"]
        window = timedelta(hours=24 if freq == "daily" else 24 * 7)
        latest = (
            db.table("ai_summaries")
            .select("generated_at")
            .eq("user_id", row["user_id"])
            .order("generated_at", desc=True)
            .limit(1)
            .execute()
            .data
            or []
        )
        if latest:
            generated = datetime.fromisoformat(latest[0]["generated_at"].replace("Z", "+00:00"))
            if now - generated < window:
                continue
        digest_for_user(row["user_id"], freq)
        count += 1
    return count
