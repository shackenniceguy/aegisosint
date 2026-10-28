from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.api.ws import ws_manager
from app.schemas.socmint import UsernameScanRequest, UsernameScanResponse
from app.services.socmint_scanner import SocmintScannerService
from app.services.graph_correlator import GraphCorrelatorService

router = APIRouter(prefix="/recon", tags=["SOCMINT & Identity"])

@router.post("/username", response_model=UsernameScanResponse)
async def scan_username(
    payload: UsernameScanRequest,
    db: AsyncSession = Depends(get_db)
):
    service = SocmintScannerService()
    user = payload.username.strip()

    if payload.workspace_id:
        await ws_manager.broadcast_log(
            payload.workspace_id,
            "SOCMINT",
            "STARTED",
            f"Scanning 30+ public platforms for username '@{user}'..."
        )

    try:
        res = await service.scan_username(username=user, enrich_gh=payload.enrich_github)

        if payload.workspace_id:
            await ws_manager.broadcast_log(
                payload.workspace_id,
                "SOCMINT",
                "SUCCESS",
                f"Identified {res.found_count} active public profiles across {res.total_checked} platforms."
            )

            # Correlate into graph
            correlator = GraphCorrelatorService(db)
            await correlator.correlate_socmint(payload.workspace_id, res.dict())

            # Broadcast updated graph
            elements = await correlator.get_cytoscape_elements(payload.workspace_id)
            await ws_manager.broadcast_graph_update(
                payload.workspace_id,
                [n.dict() for n in elements.nodes],
                [e.dict() for e in elements.edges]
            )

        return res

    except Exception as e:
        if payload.workspace_id:
            await ws_manager.broadcast_log(
                payload.workspace_id,
                "SOCMINT",
                "ERROR",
                f"Username scan failed: {str(e)}"
            )
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")

