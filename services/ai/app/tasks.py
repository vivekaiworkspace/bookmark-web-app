from app.celery_app import celery
from app.pipeline import digest_for_user, digest_tick, run_extract_and_tag
from app.db import get_db


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
    return len(rows)
