from unittest.mock import patch

import pytest
from httpx import AsyncClient

SECRET = {"X-AI-Service-Secret": "test-secret"}


@pytest.mark.asyncio
async def test_health(client: AsyncClient) -> None:
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"ok": True}


@pytest.mark.asyncio
async def test_extract_unauthorized(client: AsyncClient) -> None:
    res = await client.post(
        "/api/v1/extract",
        json={"link_id": "a", "user_id": "b"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_jobs_unprocessable(client: AsyncClient) -> None:
    res = await client.post("/api/v1/jobs", headers=SECRET, json={})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_jobs_unknown_type(client: AsyncClient) -> None:
    res = await client.post(
        "/api/v1/jobs",
        headers=SECRET,
        json={"type": "not-a-job"},
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Unknown job type"


@pytest.mark.asyncio
async def test_jobs_missing_ids(client: AsyncClient) -> None:
    res = await client.post(
        "/api/v1/jobs",
        headers=SECRET,
        json={"type": "extract_and_tag"},
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_extract_server_error(client: AsyncClient) -> None:
    with patch("app.main.extract_content", side_effect=RuntimeError("boom")):
        res = await client.post(
            "/api/v1/extract",
            headers=SECRET,
            json={"link_id": "a", "user_id": "b"},
        )
    assert res.status_code == 500


@pytest.mark.asyncio
async def test_enqueue_extract_and_tag(client: AsyncClient) -> None:
    with patch("app.main.extract_and_tag_task.delay") as delay:
        res = await client.post(
            "/api/v1/jobs",
            headers=SECRET,
            json={
                "type": "extract_and_tag",
                "link_id": "11111111-1111-1111-1111-111111111111",
                "user_id": "22222222-2222-2222-2222-222222222222",
            },
        )
    assert res.status_code == 200
    delay.assert_called_once()
