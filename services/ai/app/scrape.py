import logging
import re

import httpx
import tiktoken
import trafilatura
from lxml import html as lxml_html
from readability import Document

from app.config import settings
from app.ssrf import UnsafeUrlError, assert_public_http_url

logger = logging.getLogger(__name__)

MAX_BYTES = 2_000_000
FETCH_TIMEOUT = 15.0
MIN_TEXT_LEN = 280

USER_AGENT = "Mozilla/5.0 (compatible; SmartBookmarkManager/2.0)"


def _attr(html: str, names: list[str]) -> str | None:
    for name in names:
        re1 = re.compile(
            rf'<meta[^>]+(?:property|name)=["\']{re.escape(name)}["\'][^>]+content=["\']([^"\']+)["\']',
            re.I,
        )
        match = re1.search(html)
        if match:
            return match.group(1)
        re2 = re.compile(
            rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']{re.escape(name)}["\']',
            re.I,
        )
        match = re2.search(html)
        if match:
            return match.group(1)
    return None


def truncate_tokens(text: str, cap: int | None = None) -> str:
    cap = cap or settings.token_cap
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(text)
    if len(tokens) <= cap:
        return text
    return enc.decode(tokens[:cap])


def _extract_html(raw: str) -> str:
    extracted = trafilatura.extract(raw, include_comments=False, include_tables=False) or ""
    if len(extracted.strip()) >= MIN_TEXT_LEN:
        return extracted
    try:
        doc = Document(raw)
        summary = doc.summary()
        tree = lxml_html.fromstring(summary)
        text = " ".join(tree.text_content().split())
        if text:
            return text
    except Exception:
        logger.debug("Readability failed", exc_info=True)
    return extracted


def _playwright_html(url: str) -> str | None:
    if not settings.playwright_enabled:
        return None
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        logger.warning("Playwright requested but not available")
        return None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="networkidle", timeout=20_000)
            content = page.content()
            browser.close()
            return content
    except Exception:
        logger.warning("Playwright scrape failed for %s", url, exc_info=True)
        return None


def scrape_url(url: str) -> dict:
    assert_public_http_url(url)
    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
    html = ""
    try:
        with httpx.Client(follow_redirects=True, timeout=FETCH_TIMEOUT) as client:
            res = client.get(url, headers=headers)
            res.raise_for_status()
            html = res.content[:MAX_BYTES].decode(res.encoding or "utf-8", errors="replace")
    except (httpx.HTTPError, UnsafeUrlError):
        raise
    except Exception as exc:
        raise RuntimeError(f"Fetch failed: {exc}") from exc

    text = _extract_html(html)
    if len(text.strip()) < MIN_TEXT_LEN:
        spa = _playwright_html(url)
        if spa:
            html = spa
            text = _extract_html(spa)

    title_tag = re.search(r"<title[^>]*>([^<]+)</title>", html, re.I)
    title = _attr(html, ["og:title", "twitter:title"]) or (
        title_tag.group(1).strip() if title_tag else None
    )
    og = _attr(html, ["og:image", "twitter:image"])
    return {
        "text": truncate_tokens(text.strip()),
        "title": title,
        "og_image_url": og,
    }
