from typing import Dict, Any, Callable, Awaitable, List, Optional
from pydantic import BaseModel, Field

class ToolDefinition(BaseModel):
    name: str
    description: str
    input_schema: Dict[str, Any]
    safety_classification: str = "safe"  # safe | interactive | restricted
    # Handler is attached at runtime
    handler: Optional[Callable[..., Awaitable[Any]]] = Field(default=None, exclude=True)

class ToolRegistry:
    """Central registry of strictly allowed agent actions with schemas and safety classifications."""
    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}

    def register(self, tool: ToolDefinition) -> None:
        if tool.name == "submit_form":
            raise ValueError(
                "CRITICAL INVARIANT VIOLATION: submit_form tool is strictly prohibited in Phase 1."
            )
        self._tools[tool.name] = tool

    def get(self, name: str) -> ToolDefinition:
        if name not in self._tools:
            raise KeyError(f"Tool '{name}' is not registered in ToolRegistry.")
        return self._tools[name]

    def has(self, name: str) -> bool:
        return name in self._tools

    def all_tools(self) -> List[ToolDefinition]:
        return list(self._tools.values())

    def get_anthropic_tools(self) -> List[Dict[str, Any]]:
        """Formats registered tools for Anthropic messages API."""
        result = []
        for t in self._tools.values():
            result.append({
                "name": t.name,
                "description": t.description,
                "input_schema": t.input_schema,
            })
        return result
