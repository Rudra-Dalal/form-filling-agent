import asyncio
import pytest
from app.agent.session import AgentSession
from app.schemas.common import AgentState, EventType
from app.schemas.document import DocumentData, StudentInfo

@pytest.mark.asyncio
async def test_session_lifecycle_pause_resume_takeover_and_ask_user():
    events = []
    session = AgentSession(
        target_url="about:blank",
        instruction="Test workflow",
        document_data=DocumentData(student=StudentInfo(fullName="Aditi")),
        dry_run=True,
        on_event=lambda evt: events.append(evt),
    )

    assert session.state == AgentState.IDLE

    # Test Pause
    session.pause()
    assert session.state == AgentState.PAUSED
    assert any(e["type"] == EventType.PAUSED.value for e in events)

    # Test Resume
    session.resume()
    assert session.state == AgentState.RUNNING
    assert any(e["type"] == EventType.RESUMED.value for e in events)

    # Test Human Takeover
    await session.hand_over_to_user("User takeover test")
    assert session.state == AgentState.HUMAN_TAKEOVER
    assert any(e["type"] == EventType.HANDED_OVER.value for e in events)

    # Test resume from takeover
    session.resume()
    assert session.state == AgentState.RUNNING

    # Test ask_user flow
    ask_task = asyncio.create_task(session._ask_user("Which address should be used?", "Context"))
    await asyncio.sleep(0.05)
    assert session.state == AgentState.WAITING_FOR_USER
    assert any(e["type"] == EventType.ASK_USER.value for e in events)

    # Answer prompt
    ask_evt = next(e for e in events if e["type"] == EventType.ASK_USER.value)
    prompt_id = ask_evt["promptId"]
    session.provide_user_answer(prompt_id, "14 Lotus Lane")

    answered_val = await ask_task
    assert answered_val == "14 Lotus Lane"
    assert session.state == AgentState.RUNNING
