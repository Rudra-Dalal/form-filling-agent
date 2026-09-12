import json
from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self._active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self._active_connections:
            self._active_connections[session_id] = []
        self._active_connections[session_id].append(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self._active_connections:
            if websocket in self._active_connections[session_id]:
                self._active_connections[session_id].remove(websocket)
            if not self._active_connections[session_id]:
                del self._active_connections[session_id]

    async def broadcast(self, session_id: str, event: dict):
        if session_id in self._active_connections:
            dead_sockets = []
            for ws in self._active_connections[session_id]:
                try:
                    await ws.send_json(event)
                except Exception:
                    dead_sockets.append(ws)
            for ws in dead_sockets:
                self.disconnect(session_id, ws)

manager = ConnectionManager()
