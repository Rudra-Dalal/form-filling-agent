import pytest
from app.agent.prompts.system_prompt import SYSTEM_PROMPT
from app.agent.prompts.form_prompt import build_initial_task_prompt
from app.registry.definitions import build_standard_tool_registry

def test_system_prompt_strictly_prohibits_submission():
    assert "NEVER ATTEMPT TO SUBMIT THE FORM" in SYSTEM_PROMPT
    assert "READY FOR HUMAN REVIEW" in SYSTEM_PROMPT
    assert "DO NOT GUESS" in SYSTEM_PROMPT

def test_tool_definitions_contain_phase_1_tools_and_no_submit_tool():
    registry = build_standard_tool_registry()
    tools = registry.all_tools()
    tool_names = [t.name for t in tools]

    assert "read_form" in tool_names
    assert "fill_text" in tool_names
    assert "clear_field" in tool_names
    assert "select_option" in tool_names
    assert "set_checkbox" in tool_names
    assert "verify_field" in tool_names
    assert "click_element" in tool_names
    assert "ask_user" in tool_names
    assert "hand_over_to_user" in tool_names
    assert "finish_filling" in tool_names

    # CRITICAL: No submit_form tool
    assert "submit_form" not in tool_names

def test_build_initial_task_prompt():
    prompt = build_initial_task_prompt("Test instruction", "http://example.com/form", {"student": {"fullName": "Aditi"}})
    assert "Instruction: Test instruction" in prompt
    assert "Target URL: http://example.com/form" in prompt
    assert "Aditi" in prompt
