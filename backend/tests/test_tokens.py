import sys
from unittest.mock import MagicMock

import pytest


class _FakeEncoding:
    def encode(self, text: str) -> list[int]:
        return list(range(len(text)))

    def decode(self, tokens: list[int]) -> str:
        return "x" * len(tokens)


@pytest.fixture(autouse=True)
def fake_tiktoken(monkeypatch: pytest.MonkeyPatch) -> None:
    mod = MagicMock()
    mod.get_encoding.return_value = _FakeEncoding()
    monkeypatch.setitem(sys.modules, "tiktoken", mod)


def test_truncate_tokens_keeps_short_text() -> None:
    from app.tokens import truncate_tokens

    assert truncate_tokens("ab", cap=10) == "ab"


def test_truncate_tokens_caps_long_text() -> None:
    from app.tokens import truncate_tokens

    assert truncate_tokens("abcdefghij", cap=4) == "xxxx"
