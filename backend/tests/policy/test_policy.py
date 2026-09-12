import pytest
from app.policy.engine import PolicyEngine, PolicyViolationError, SafetyViolationError
from app.schemas.common import AgentState
from app.schemas.browser import FormSnapshot, FormElement

def test_policy_engine_rejects_submit_form():
    policy = PolicyEngine()
    with pytest.raises(SafetyViolationError) as exc:
        policy.evaluate("submit_form", {}, AgentState.RUNNING)
    assert "strictly prohibited" in str(exc.value)

def test_policy_engine_rejects_unpermitted_tools():
    policy = PolicyEngine()
    with pytest.raises(PolicyViolationError) as exc:
        policy.evaluate("arbitrary_exec", {}, AgentState.RUNNING)
    assert "outside Phase-1" in str(exc.value)

def test_policy_engine_rejects_actions_when_paused():
    policy = PolicyEngine()
    with pytest.raises(PolicyViolationError) as exc:
        policy.evaluate("fill_text", {"elementIndex": 0, "value": "test"}, AgentState.PAUSED)
    assert "paused" in str(exc.value)

def test_policy_engine_rejects_actions_when_human_takeover():
    policy = PolicyEngine()
    with pytest.raises(PolicyViolationError) as exc:
        policy.evaluate("fill_text", {"elementIndex": 0, "value": "test"}, AgentState.HUMAN_TAKEOVER)
    assert "human takeover" in str(exc.value)

def test_policy_engine_blocks_click_on_submit_button():
    policy = PolicyEngine()
    snapshot = FormSnapshot(
        url="http://test.example",
        elements=[
            FormElement(elementIndex=0, tagName="input", type="text", label="Name"),
            FormElement(elementIndex=1, tagName="button", type="submit", label="Submit Registration", isSubmit=True),
        ],
    )
    with pytest.raises(SafetyViolationError) as exc:
        policy.evaluate("click_element", {"elementIndex": 1}, AgentState.RUNNING, snapshot)
    assert "submit-intent control" in str(exc.value)

def test_policy_engine_allows_safe_actions():
    policy = PolicyEngine()
    snapshot = FormSnapshot(
        url="http://test.example",
        elements=[
            FormElement(elementIndex=0, tagName="input", type="text", label="Name"),
        ],
    )
    # Should not raise
    policy.evaluate("fill_text", {"elementIndex": 0, "value": "Aditi"}, AgentState.RUNNING, snapshot)
