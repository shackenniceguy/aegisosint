import json
from typing import Dict, List, Set
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # workspace_id -> set of active WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, workspace_id: str, websocket: WebSocket):
        await websocket.accept()
        if workspace_id not in self.active_connections:
            self.active_connections[workspace_id] = set()
        self.active_connections[workspace_id].add(websocket)

    def disconnect(self, workspace_id: str, websocket: WebSocket):
        if workspace_id in self.active_connections:
            self.active_connections[workspace_id].discard(websocket)
            if not self.active_connections[workspace_id]:
                del self.active_connections[workspace_id]

    async def broadcast_log(self, workspace_id: str, module: str, status: str, message: str, payload: dict = None):
        if workspace_id in self.active_connections:
            event = {
                "type": "log",
                "workspace_id": workspace_id,
                "module": module,
                "status": status,
                "message": message,
                "payload": payload or {}
            }
            data_str = json.dumps(event, default=str)
            dead = set()
            for ws in self.active_connections[workspace_id]:
                try:
                    await ws.send_text(data_str)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.active_connections[workspace_id].discard(ws)

    async def broadcast_graph_update(self, workspace_id: str, new_nodes: list, new_edges: list):
        if workspace_id in self.active_connections:
            event = {
                "type": "graph_update",
                "workspace_id": workspace_id,
                "nodes": new_nodes,
                "edges": new_edges
            }
            data_str = json.dumps(event, default=str)
            dead = set()
            for ws in self.active_connections[workspace_id]:
                try:
                    await ws.send_text(data_str)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.active_connections[workspace_id].discard(ws)

ws_manager = ConnectionManager()

