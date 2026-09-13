from enum import Enum

class AgentState(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    WAITING_FOR_USER = "waiting_for_user"
    HUMAN_TAKEOVER = "human_takeover"
    READY_FOR_REVIEW = "ready_for_review"
    ERROR = "error"

class EventType(str, Enum):
    STATUS = "status"
    THOUGHT = "agent-thought"
    TOOL_CALL = "tool-call"
    TOOL_ERROR = "tool-error"
    FORM_SNAPSHOT = "form-snapshot"
    VERIFY_RESULT = "verify-result"
    FIELD_VERIFIED = "verify-result"
    FIELD_FILLED = "field-filled"
    FILE_UPLOADED = "file-uploaded"
    STEP_CHANGED = "step-changed"
    DYNAMIC_FIELD_DETECTED = "dynamic-field-detected"
    SAFETY_BLOCKED = "safety-blocked"
    ASK_USER = "ask-user"
    PAUSED = "paused"
    RESUMED = "resumed"
    HANDED_OVER = "handed-over"
    READY_FOR_REVIEW = "ready_for_review"
    COMPLETE = "ready_for_review"
    ERROR = "error"

class ControlClassification(str, Enum):
    TEXT = "text"
    SELECT = "select"
    CHECKBOX = "checkbox"
    RADIO = "radio"
    BUTTON = "button"
    SUBMIT = "submit"
    UNKNOWN = "unknown"

class Confidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
