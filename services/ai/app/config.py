from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_service_role_key: str
    redis_url: str = "redis://localhost:6379/0"
    ai_service_secret: str
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    playwright_enabled: bool = False
    free_tag_limit: int = 10
    token_cap: int = 5000


settings = Settings()
