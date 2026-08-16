from app.config import settings


def truncate_tokens(text: str, cap: int | None = None) -> str:
    """Truncate scraped text to the configured tiktoken budget (4k–6k)."""
    cap = cap or settings.token_cap
    import tiktoken

    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(text)
    if len(tokens) <= cap:
        return text
    return enc.decode(tokens[:cap])
