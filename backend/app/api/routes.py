import asyncio
from typing import Dict, Optional, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel

from ..schemas.session import (
    StartSessionRequest,
    AnswerPromptRequest,
    SessionStatusResponse,
)
from ..schemas.document import DocumentData
from ..document.extractor import extract_document
from ..agent.session import AgentSession
from .websocket import manager

router = APIRouter()

# Active sessions store
sessions: Dict[str, AgentSession] = {}

class ParseDocumentRequest(BaseModel):
    filePath: str
    dryRun: bool = False

@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.post("/documents/parse", response_model=DocumentData)
async def parse_document_endpoint(req: ParseDocumentRequest):
    try:
        data = extract_document(req.filePath, dry_run=req.dryRun)
        return data
    except Exception as err:
        raise HTTPException(status_code=400, detail=str(err))

@router.post("/sessions")
async def create_session(req: StartSessionRequest):
    session = AgentSession(
        target_url=req.targetUrl,
        instruction=req.instruction,
        document_data=req.documentData,
        document_path=req.documentPath,
        dry_run=req.dryRun,
        on_event=lambda evt: asyncio.create_task(manager.broadcast(session.session_id, evt)),
    )
    sessions[session.session_id] = session

    # Start the session loop in background
    asyncio.create_task(session.run())

    return {"ok": True, "sessionId": session.session_id}

@router.get("/sessions/{session_id}", response_model=SessionStatusResponse)
async def get_session_status(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")

    prompt_id = None
    prompt_q = None
    if session._pending_prompts:
        prompt_id = next(iter(session._pending_prompts.keys()))

    return SessionStatusResponse(
        sessionId=session.session_id,
        state=session.state,
        statusMessage=session.status_message,
        targetUrl=session.target_url,
        dryRun=session.dry_run,
        pendingPromptId=prompt_id,
        pendingQuestion=prompt_q,
    )

@router.post("/sessions/{session_id}/pause")
async def pause_session(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    session.pause()
    return {"ok": True}

@router.post("/sessions/{session_id}/resume")
async def resume_session(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    session.resume()
    return {"ok": True}

@router.post("/sessions/{session_id}/takeover")
async def takeover_session(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    await session.hand_over_to_user("User takeover via API.")
    return {"ok": True}

@router.post("/sessions/{session_id}/give-back")
async def give_back_session(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    await session.resume_from_user()
    return {"ok": True}

@router.post("/sessions/{session_id}/user-answer")
async def user_answer_session(session_id: str, req: AnswerPromptRequest):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    session.provide_user_answer(req.promptId, req.answer)
    return {"ok": True}

@router.get("/sessions/{session_id}/snapshot")
async def get_session_snapshot(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    snapshot = await session.browser_session.read_form()
    return {"ok": True, "snapshot": [el.model_dump() for el in snapshot.elements]}

@router.get("/sessions/{session_id}/dom-values")
async def get_session_dom_values(session_id: str):
    session = sessions.get(session_id)
    if not session or not session.browser_session or not session.browser_session.page:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found or browser not active.")
    page = session.browser_session.page
    values = await page.evaluate("""
    () => {
        const result = {};
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(el => {
            const key = el.id || el.name;
            if (!key) return;
            if (el.type === 'checkbox' || el.type === 'radio') {
                result[key] = el.checked;
            } else if (el.tagName === 'SELECT') {
                result[key] = el.value;
            } else {
                result[key] = el.value;
            }
        });
        return result;
    }
    """)
    return {"ok": True, "values": values}

@router.websocket("/sessions/{session_id}/ws")
async def session_websocket(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    try:
        while True:
            # Keep socket open and listen for possible client commands
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
