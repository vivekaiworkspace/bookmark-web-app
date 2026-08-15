from fastapi import Header, HTTPException

from app.config import settings


def require_secret(x_ai_service_secret: str | None = Header(default=None)) -> None:
    if not x_ai_service_secret or x_ai_service_secret != settings.ai_service_secret:
        raise HTTPException(status_code=401, detail="Invalid service secret")
