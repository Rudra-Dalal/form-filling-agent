import pytest
from app.registry.definitions import build_standard_tool_registry, ToolDefinition

def test_tool_registry_contains_phase_1_tools():
    registry = build_standard_tool_registry()
    required = [
        "read_form",
        "fill_text",
        "clear_field",
        "select_option",
        "set_checkbox",
        "verify_field",
        "click_element",
        "ask_user",
        "hand_over_to_user",
        "finish_filling",
    ]
    for name in required:
        assert registry.has(name) is True
        tool = registry.get(name)
        assert tool.name == name
        assert "type" in tool.input_schema

def test_tool_registry_strictly_prohibits_submit_form():
    registry = build_standard_tool_registry()
    assert registry.has("submit_form") is False

    with pytest.raises(ValueError) as exc:
        registry.register(ToolDefinition(
            name="submit_form",
            description="Attempt to submit",
            input_schema={"type": "object", "properties": {}},
        ))
    assert "strictly prohibited" in str(exc.value)
