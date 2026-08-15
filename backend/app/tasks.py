from app.celery_app import celery
from app.pipeline import digest_for_user, digest_tick, run_extract_and_tag
from app.db import get_db
from app.config import settings
from app.llm import embed_text
import urllib.request


@celery.task(
    name="app.tasks.extract_and_tag_task",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def extract_and_tag_task(self, link_id: str, user_id: str, force: bool = False):
    return run_extract_and_tag(link_id, user_id, force=force)


@celery.task(name="app.tasks.digest_task")
def digest_task(user_id: str, frequency: str | None = None, force: bool = False):
    return digest_for_user(user_id, frequency, force=force)


@celery.task(name="app.tasks.digest_tick_task")
def digest_tick_task():
    return digest_tick()


@celery.task(name="app.tasks.poll_pending_task")
def poll_pending_task():
    db = get_db()
    rows = (
        db.table("links")
        .select("id,user_id")
        .eq("scrape_status", "pending")
        .limit(20)
        .execute()
        .data
        or []
    )
    for row in rows:
        extract_and_tag_task.delay(row["id"], row["user_id"])
    missing = (
        db.table("links")
        .select("id,user_id,title,url,content_raw")
        .is_("embedding", "null")
        .neq("content_raw", None)
        .limit(10)
        .execute()
        .data
        or []
    )
    for row in missing:
        text = row.get("content_raw") or row.get("title") or row.get("url") or ""
        embedding = embed_text(text)
        if embedding:
            db.table("links").update({"embedding": embedding}).eq("id", row["id"]).eq(
                "user_id", row["user_id"]
            ).execute()
    return len(rows)


@celery.task(name="app.tasks.notify_tick_task")
def notify_tick_task():
    if not settings.cron_secret:
        return {"ok": False, "error": "CRON_SECRET not set"}
    url = settings.app_url.rstrip("/") + "/api/cron/notify"
    req = urllib.request.Request(
        url,
        data=b"{}",
        headers={
            "Content-Type": "application/json",
            "X-Cron-Secret": settings.cron_secret,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return {"ok": True, "status": response.status}
