import json
import logging

from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)

TAG_SYSTEM = """You assign tags to a saved bookmark.
Return JSON only with keys:
- existing_tags: array of names chosen from the provided existing tag list (subset)
- new_tags: up to 3 new short tag names (1-3 words) not already in the list
- collection_id: one of the provided collection ids, or null
Do not invent collection ids. Prefer existing tags when they fit."""

DIGEST_SYSTEM = """Write a markdown digest of the user's recently saved bookmarks.
Use headings and bullet points. Be concise. Honor any extra instructions from the user."""


def _client() -> OpenAI | None:
    if not settings.openai_api_key:
        return None
    return OpenAI(api_key=settings.openai_api_key)


def suggest_tags(
    title: str,
    url: str,
    content: str,
    existing_tags: list[dict],
    collections: list[dict],
) -> dict:
    client = _client()
    if not client:
        raise RuntimeError("OPENAI_API_KEY is not set")
    payload = {
        "title": title,
        "url": url,
        "content": content[:12000],
        "existing_tags": existing_tags,
        "collections": collections,
    }
    response = client.chat.completions.create(
        model=settings.openai_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": TAG_SYSTEM},
            {"role": "user", "content": json.dumps(payload)},
        ],
        temperature=0.2,
    )
    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)
    existing_names = {t["name"].lower() for t in existing_tags}
    chosen_existing = [
        name
        for name in data.get("existing_tags") or []
        if isinstance(name, str) and name.lower() in existing_names
    ]
    new_tags = [
        name.strip()
        for name in data.get("new_tags") or []
        if isinstance(name, str) and name.strip() and name.lower() not in existing_names
    ][:3]
    allowed_ids = {c["id"] for c in collections}
    collection_id = data.get("collection_id")
    if collection_id not in allowed_ids:
        collection_id = None
    return {
        "existing_tags": chosen_existing,
        "new_tags": new_tags,
        "collection_id": collection_id,
    }


def embed_text(text: str) -> list[float] | None:
    client = _client()
    if not client:
        return None
    clipped = text.strip()[:8000]
    if not clipped:
        return None
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=clipped,
    )
    return response.data[0].embedding


def write_digest(links: list[dict], prompt_override: str | None) -> str:
    client = _client()
    if not client:
        raise RuntimeError("OPENAI_API_KEY is not set")
    extra = prompt_override.strip() if prompt_override else "No extra instructions."
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": DIGEST_SYSTEM},
            {
                "role": "user",
                "content": json.dumps({"instructions": extra, "links": links}),
            },
        ],
        temperature=0.4,
    )
    return (response.choices[0].message.content or "").strip()
