from typing import List
from .tool_registry import ToolDefinition, ToolRegistry

TOOL_DEFINITIONS: List[ToolDefinition] = [
    ToolDefinition(
        name="read_form",
        description="Scans the current page and returns all detected interactive form fields with labels, types, and current values.",
        input_schema={
            "type": "object",
            "properties": {},
        },
        safety_classification="safe",
    ),
    ToolDefinition(
        name="fill_text",
        description="Types a text value into an input or textarea element identified by its element index.",
        input_schema={
            "type": "object",
            "properties": {
                "elementIndex": {"type": "integer", "description": "The numeric index of the form field."},
                "value": {"type": "string", "description": "The exact text string to fill."},
            },
            "required": ["elementIndex", "value"],
        },
        safety_classification="interactive",
    ),
    ToolDefinition(
        name="clear_field",
        description="Empties the text contents of a form field identified by its element index.",
        input_schema={
            "type": "object",
            "properties": {
                "elementIndex": {"type": "integer", "description": "The numeric index of the form field."},
            },
            "required": ["elementIndex"],
        },
        safety_classification="interactive",
    ),
    ToolDefinition(
        name="select_option",
        description="Selects an option from a <select> dropdown by its visible label text.",
        input_schema={
            "type": "object",
            "properties": {
                "elementIndex": {"type": "integer", "description": "The numeric index of the select element."},
                "optionLabel": {"type": "string", "description": "The visible option text to choose."},
            },
            "required": ["elementIndex", "optionLabel"],
        },
        safety_classification="interactive",
    ),
    ToolDefinition(
        name="set_checkbox",
        description="Sets the checked state of a checkbox identified by its element index.",
        input_schema={
            "type": "object",
            "properties": {
                "elementIndex": {"type": "integer", "description": "The numeric index of the checkbox."},
                "checked": {"type": "boolean", "description": "True to check, False to uncheck."},
            },
            "required": ["elementIndex", "checked"],
        },
        safety_classification="interactive",
    ),
    ToolDefinition(
        name="verify_field",
        description="Re-reads a field from the page to verify that its current value matches the expected value.",
        input_schema={
            "type": "object",
            "properties": {
                "elementIndex": {"type": "integer", "description": "The numeric index of the field to verify."},
                "expectedValue": {
                    "description": "The expected value to verify against.",
                },
            },
            "required": ["elementIndex", "expectedValue"],
        },
        safety_classification="safe",
    ),
    ToolDefinition(
        name="click_element",
        description="Clicks an interactive non-submitting element. Autonomous form submission is strictly prohibited.",
        input_schema={
            "type": "object",
            "properties": {
                "elementIndex": {"type": "integer", "description": "The numeric index of the element to click."},
            },
            "required": ["elementIndex"],
        },
        safety_classification="restricted",
    ),
    ToolDefinition(
        name="ask_user",
        description="Asks the user for clarification when required data is missing, ambiguous, or contradictory.",
        input_schema={
            "type": "object",
            "properties": {
                "question": {"type": "string", "description": "The clarifying question to display to the user."},
                "context": {"type": "string", "description": "Optional context explaining why clarification is needed."},
            },
            "required": ["question"],
        },
        safety_classification="safe",
    ),
    ToolDefinition(
        name="hand_over_to_user",
        description="Pauses autonomous execution and invites the user to perform actions directly in the visible browser.",
        input_schema={
            "type": "object",
            "properties": {
                "reason": {"type": "string", "description": "The reason why human intervention is requested."},
            },
            "required": ["reason"],
        },
        safety_classification="safe",
    ),
    ToolDefinition(
        name="finish_filling",
        description="Declares that all fields have been filled and verified. Leaves the form ready for human review.",
        input_schema={
            "type": "object",
            "properties": {
                "summary": {"type": "string", "description": "Summary of filled fields ready for human review."},
            },
            "required": ["summary"],
        },
        safety_classification="safe",
    ),
]

def build_standard_tool_registry() -> ToolRegistry:
    registry = ToolRegistry()
    for t in TOOL_DEFINITIONS:
        registry.register(t)
    return registry
