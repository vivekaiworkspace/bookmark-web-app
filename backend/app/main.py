from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from app.auth import require_secret
from app.pipeline import auto_tag, digest_for_user, digest_tick, extract_content
from app.tasks import digest_task, extract_and_tag_task

app = FastAPI(title="Bookmark AI service")


class LinkJob(BaseModel):
    link_id: str
    user_id: str
    force: bool = False


class DigestJob(BaseModel):
    user_id: str
    frequency: str | None = None


class EnqueueJob(BaseModel):
    type: str
    link_id: str | None = None
    user_id: str | None = None
    force: bool = False
    frequency: str | None = None


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/v1/extract", dependencies=[Depends(require_secret)])
def extract_endpoint(body: LinkJob):
    return extract_content(body.link_id, body.user_id, force=body.force)


@app.post("/api/v1/auto-tag", dependencies=[Depends(require_secret)])
def auto_tag_endpoint(body: LinkJob):
    return auto_tag(body.link_id, body.user_id)


@app.post("/api/v1/jobs", dependencies=[Depends(require_secret)])
def enqueue(body: EnqueueJob):
    job_type = body.type
    if job_type in {"extract_content", "auto_tag", "extract_and_tag"}:
        if not body.link_id or not body.user_id:
            raise HTTPException(status_code=400, detail="link_id and user_id required")
        extract_and_tag_task.delay(body.link_id, body.user_id, body.force)
        return {"ok": True, "queued": job_type}
    if job_type == "digest":
        if not body.user_id:
            raise HTTPException(status_code=400, detail="user_id required")
        if body.force:
            return digest_for_user(body.user_id, body.frequency, force=True)
        digest_task.delay(body.user_id, body.frequency)
        return {"ok": True, "queued": "digest"}
    if job_type == "digest_tick":
        digest_tick()
        return {"ok": True, "queued": "digest_tick"}
    raise HTTPException(status_code=400, detail="Unknown job type")
