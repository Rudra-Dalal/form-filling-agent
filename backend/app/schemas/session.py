from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict
from .common import AgentState
from .document import DocumentData

class StartSessionRequest(BaseModel):
    documentData: Optional[DocumentData] = None
    documentPath: Optional[str] = None
    targetUrl: str
    instruction: str
    dryRun: bool = False

class AnswerPromptRequest(BaseModel):
    promptId: str
    answer: str

class SessionStatusResponse(BaseModel):
    sessionId: str
    state: AgentState
    statusMessage: str
    targetUrl: str
    dryRun: bool
    pendingPromptId: Optional[str] = None
    pendingQuestion: Optional[str] = None
    pendingContext: Optional[str] = None

class AgentEvent(BaseModel):
    model_config = ConfigDict(extra="allow")
    type: str
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
