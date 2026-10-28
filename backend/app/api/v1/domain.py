from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.api.ws import ws_manager
from app.schemas.domain import DomainScanRequest, DomainReconResponse
from app.services.domain_recon import DomainReconService
from app.services.graph_correlator import GraphCorrelatorService

router = APIRouter(prefix="/recon", tags=["Domain Reconnaissance"])

@router.post("/domain", response_model=DomainReconResponse)
async def scan_domain(
    payload: DomainScanRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    service = DomainReconService()
    domain = payload.domain.strip()

    if payload.workspace_id:
        await ws_manager.broadcast_log(
            payload.workspace_id,
            "DomainRecon",
            "STARTED",
            f"Initiating reconnaissance for target domain '{domain}'..."
        )

    try:
        recon_data = await service.perform_full_recon(
            domain=domain,
            resolve_subs=payload.resolve_subdomains,
            check_http=payload.check_http
        )

        if payload.workspace_id:
            await ws_manager.broadcast_log(
                payload.workspace_id,
                "DomainRecon",
                "SUCCESS",
                f"Discovered {len(recon_data.subdomains)} subdomains, {len(recon_data.ip_details)} IPs, and assessed security posture ({recon_data.security_posture_score}/100)."
            )

            # Auto-correlate into link graph
            correlator = GraphCorrelatorService(db)
            await correlator.correlate_domain_recon(payload.workspace_id, recon_data.dict())

            # Notify UI to refresh graph
            elements = await correlator.get_cytoscape_elements(payload.workspace_id)
            await ws_manager.broadcast_graph_update(payload.workspace_id, [n.dict() for n in elements.nodes], [e.dict() for e in elements.edges])

        return recon_data

    except Exception as e:
        if payload.workspace_id:
            await ws_manager.broadcast_log(
                payload.workspace_id,
                "DomainRecon",
                "ERROR",
                f"Domain recon error: {str(e)}"
            )
        raise HTTPException(status_code=500, detail=f"Domain recon failed: {str(e)}")

