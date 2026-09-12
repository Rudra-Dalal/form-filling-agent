from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "tests" / "fixtures"
DOCX_FIXTURE = str(FIXTURES_DIR / "sample-admission-record.docx")

@pytest.mark.asyncio
async def test_health_check_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_parse_document_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/documents/parse", json={"filePath": DOCX_FIXTURE, "dryRun": True})
        assert res.status_code == 200
        data = res.json()
        assert data["student"]["fullName"] == "Aditi Rakesh Sharma"
        assert data["student"]["dateOfBirth"] == "2015-03-12"
        assert data["parent"]["fatherName"] == "Rakesh Kumar Sharma"
        assert len(data["warnings"]) > 0

@pytest.mark.asyncio
async def test_session_lifecycle_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/sessions", json={
            "targetUrl": "about:blank",
            "instruction": "Test session",
            "dryRun": True,
        })
        assert res.status_code == 200
        session_id = res.json()["sessionId"]

        # Pause
        pause_res = await ac.post(f"/sessions/{session_id}/pause")
        assert pause_res.status_code == 200
        assert pause_res.json()["ok"] is True

        # Status
        status_res = await ac.get(f"/sessions/{session_id}")
        assert status_res.status_code == 200
        assert status_res.json()["state"] == "paused"

        # Resume
        resume_res = await ac.post(f"/sessions/{session_id}/resume")
        assert resume_res.status_code == 200
        assert resume_res.json()["ok"] is True
