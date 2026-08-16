import pytest

from app.ssrf import UnsafeUrlError, assert_public_http_url


def test_rejects_non_http() -> None:
    with pytest.raises(UnsafeUrlError):
        assert_public_http_url("file:///etc/passwd")


def test_rejects_localhost() -> None:
    with pytest.raises(UnsafeUrlError):
        assert_public_http_url("http://localhost/admin")


def test_rejects_loopback_ip() -> None:
    with pytest.raises(UnsafeUrlError):
        assert_public_http_url("http://127.0.0.1/")
