from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery = Celery(
    "bookmark_ai",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks"],
)
celery.conf.timezone = "UTC"
celery.conf.beat_schedule = {
    "poll-pending-scrapes": {
        "task": "app.tasks.poll_pending_task",
        "schedule": 30.0,
    },
    "digest-tick-hourly": {
        "task": "app.tasks.digest_tick_task",
        "schedule": crontab(minute=10),
    },
}
