import asyncio
from pathlib import Path
import pytest
from app.agent.session import AgentSession
from app.document.extractor import extract_document
from app.schemas.common import AgentState, EventType

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "tests" / "fixtures"
DOCX_FIXTURE = FIXTURES_DIR / "sample-admission-record.docx"
HTML_FIXTURE_URL = (FIXTURES_DIR / "sample-registration-form.html").as_uri()

@pytest.mark.asyncio
async def test_fixture_dryrun_end_to_end():
    # 1. Parse document
    doc_data = extract_document(DOCX_FIXTURE, dry_run=True)
    assert doc_data.student.fullName == "Aditi Rakesh Sharma"

    events = []
    session = AgentSession(
        target_url=HTML_FIXTURE_URL,
        instruction="Read this document and fill the student registration form.",
        document_data=doc_data,
        dry_run=True,
        on_event=lambda evt: events.append(evt),
    )

    # 2. Run session in background task to handle ask_user interaction
    run_task = asyncio.create_task(session.run())

    # Wait for ask_user event (address ambiguity)
    for _ in range(50):
        if session.state == AgentState.WAITING_FOR_USER:
            break
        await asyncio.sleep(0.05)

    if session.state == AgentState.WAITING_FOR_USER:
        ask_evt = next((e for e in events if e["type"] == EventType.ASK_USER.value), None)
        assert ask_evt is not None
        session.provide_user_answer(ask_evt["promptId"], "14 Lotus Lane")

    # Await completion
    await run_task

    # Verify session completed successfully
    assert session.state == AgentState.COMPLETED

    # Verify field verifications occurred
    verify_events = [e for e in events if e["type"] == EventType.VERIFY_RESULT.value]
    assert len(verify_events) >= 8
    assert all(v["matches"] for v in verify_events)

    # Verify complete event with summary
    complete_evt = next((e for e in events if e["type"] == EventType.COMPLETE.value), None)
    assert complete_evt is not None
    assert "Ready for user review" in complete_evt["summary"]

    await session.close()
