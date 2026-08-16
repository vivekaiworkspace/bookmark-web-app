from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
import logging

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.auth import require_secret
from app.pipeline import auto_tag, digest_for_user, digest_tick, extract_content
from app.tasks import digest_task, extract_and_tag_task

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    yield


app = FastAPI(
    title="Bookmark AI service",
    description=(
        "Internal FastAPI + Celery worker for scrape, auto-tag, embeddings, "
        "and digest jobs. Authenticate with `X-AI-Service-Secret`."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def unhandled_error(_request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    logger.exception("Unhandled error")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


class LinkJob(BaseModel):
    link_id: str = Field(..., description="UUID of the bookmark to process")
    user_id: str = Field(..., description="Owning auth.users UUID")
    force: bool = Field(default=False, description="Re-run even if already ready")


class EnqueueJob(BaseModel):
    type: str = Field(..., description="Job type to enqueue")
    link_id: str | None = None
    user_id: str | None = None
    force: bool = False
    frequency: str | None = None


@app.get("/health", summary="Liveness check")
async def health() -> dict[str, bool]:
    """Return process liveness for Docker and load balancers."""
    return {"ok": True}


@app.post(
    "/api/v1/extract",
    dependencies=[Depends(require_secret)],
    summary="Extract page text and OpenGraph metadata",
)
async def extract_endpoint(body: LinkJob) -> dict:
    """Scrape a saved link with Trafilatura, Readability, then Playwright.

    Token-truncates `content_raw` (4,000–6,000 tokens) and writes via the
    Supabase service role, always filtered by `user_id`.
    """
    return await run_in_threadpool(
        extract_content, body.link_id, body.user_id, body.force
    )


@app.post(
    "/api/v1/auto-tag",
    dependencies=[Depends(require_secret)],
    summary="Suggest global tags and a collection",
)
async def auto_tag_endpoint(body: LinkJob) -> dict:
    """Map scraped text to existing tags or suggest up to three new tags."""
    return await run_in_threadpool(auto_tag, body.link_id, body.user_id)


@app.post(
    "/api/v1/jobs",
    dependencies=[Depends(require_secret)],
    summary="Enqueue scrape, auto-tag, or digest work",
)
async def enqueue(body: EnqueueJob) -> dict:
    """Push long-running work onto Redis/Celery instead of blocking HTTP.

    Supported `type` values: `extract_content`, `auto_tag`, `extract_and_tag`,
    `digest`, `digest_tick`.
    """
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
            return await run_in_threadpool(
                digest_for_user, body.user_id, body.frequency, True
            )
        digest_task.delay(body.user_id, body.frequency)
        return {"ok": True, "queued": "digest"}
    if job_type == "digest_tick":
        await run_in_threadpool(digest_tick)
        return {"ok": True, "queued": "digest_tick"}
    raise HTTPException(status_code=400, detail="Unknown job type")
