import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import init_db
from app.api.ws import ws_manager
from app.api.v1.workspaces import router as workspaces_router
from app.api.v1.domain import router as domain_router
from app.api.v1.socmint import router as socmint_router
from app.api.v1.metadata import router as metadata_router
from app.api.v1.dork import router as dork_router
from app.api.v1.graph import router as graph_router
from app.api.v1.report import router as report_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database Tables
    await init_db()
    yield
    # Shutdown logic if any

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Production-grade, White-Zone Open-Source Intelligence & Digital Footprint Auditing Platform",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Routers
app.include_router(workspaces_router, prefix=settings.API_V1_STR)
app.include_router(domain_router, prefix=settings.API_V1_STR)
app.include_router(socmint_router, prefix=settings.API_V1_STR)
app.include_router(metadata_router, prefix=settings.API_V1_STR)
app.include_router(dork_router, prefix=settings.API_V1_STR)
app.include_router(graph_router, prefix=settings.API_V1_STR)
app.include_router(report_router, prefix=settings.API_V1_STR)

# Real-time WebSocket Endpoint
@app.websocket("/api/v1/ws/{workspace_id}")
async def websocket_endpoint(websocket: WebSocket, workspace_id: str):
    await ws_manager.connect(workspace_id, websocket)
    try:
        while True:
            # Keep-alive ping/pong
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(workspace_id, websocket)
    except Exception:
        ws_manager.disconnect(workspace_id, websocket)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "mode": "production" if not settings.DEBUG else "debug"
    }

# Serve compiled frontend SPA if present
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(static_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))

