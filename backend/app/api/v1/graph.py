from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.api.deps import get_db
from app.api.ws import ws_manager
from app.models.entity import Entity
from app.models.relationship import Relationship
from app.schemas.graph import GraphElements, AddNodeRequest, PivotRequest
from app.services.graph_correlator import GraphCorrelatorService
from app.services.socmint_scanner import SocmintScannerService
from app.services.domain_recon import DomainReconService

router = APIRouter(prefix="/graph", tags=["Link Analysis & Graph"])

@router.get("/{workspace_id}", response_model=GraphElements)
async def get_workspace_graph(workspace_id: str, db: AsyncSession = Depends(get_db)):
    correlator = GraphCorrelatorService(db)
    return await correlator.get_cytoscape_elements(workspace_id)

@router.post("/{workspace_id}/node")
async def add_custom_node(
    workspace_id: str,
    payload: AddNodeRequest,
    db: AsyncSession = Depends(get_db)
):
    correlator = GraphCorrelatorService(db)
    entity = await correlator.get_or_create_entity(
        workspace_id=workspace_id,
        entity_type=payload.type,
        value=payload.value,
        label=payload.label,
        risk_level=payload.risk_level,
        metadata=payload.metadata
    )
    await db.commit()

    elements = await correlator.get_cytoscape_elements(workspace_id)
    await ws_manager.broadcast_graph_update(
        workspace_id,
        [n.dict() for n in elements.nodes],
        [e.dict() for e in elements.edges]
    )

    return {"status": "success", "entity_id": entity.id}

@router.delete("/{workspace_id}/node/{node_id}")
async def delete_node(
    workspace_id: str,
    node_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Entity).where(Entity.id == node_id, Entity.workspace_id == workspace_id)
    res = await db.execute(stmt)
    entity = res.scalars().first()
    if not entity:
        raise HTTPException(status_code=404, detail="Node not found")

    await db.delete(entity)
    await db.commit()

    correlator = GraphCorrelatorService(db)
    elements = await correlator.get_cytoscape_elements(workspace_id)
    await ws_manager.broadcast_graph_update(
        workspace_id,
        [n.dict() for n in elements.nodes],
        [e.dict() for e in elements.edges]
    )

    return {"status": "success", "deleted_node_id": node_id}

@router.post("/{workspace_id}/pivot")
async def pivot_node(
    workspace_id: str,
    payload: PivotRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Entity).where(Entity.id == payload.entity_id, Entity.workspace_id == workspace_id)
    res = await db.execute(stmt)
    entity = res.scalars().first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity for pivot not found")

    correlator = GraphCorrelatorService(db)

    # 1. Pivot on Username -> Run SOCMINT scan
    if entity.type == "username" or payload.pivot_type == "SOCMINT_SCAN":
        username_clean = entity.value.lstrip("@")
        await ws_manager.broadcast_log(
            workspace_id, "Pivot", "STARTED", f"Pivoting on username '@{username_clean}'..."
        )
        soc_svc = SocmintScannerService()
        soc_res = await soc_svc.scan_username(username_clean)
        await correlator.correlate_socmint(workspace_id, soc_res.dict())

    # 2. Pivot on IP -> Reverse DNS & ASN Lookup
    elif entity.type == "ip" or payload.pivot_type == "REVERSE_DNS":
        await ws_manager.broadcast_log(
            workspace_id, "Pivot", "STARTED", f"Pivoting on IP address '{entity.value}'..."
        )
        recon_svc = DomainReconService()
        ip_detail = await recon_svc.lookup_ip_details(entity.value)
        asn_val = ip_detail.get("as")
        if asn_val:
            asn_node = await correlator.get_or_create_entity(
                workspace_id, "asn", asn_val, asn_val[:25], "INFO", metadata=ip_detail
            )
            await correlator.create_relationship(
                workspace_id, entity.id, asn_node.id, "ANNOUNCED_BY", "BGP"
            )
            await db.commit()

    elements = await correlator.get_cytoscape_elements(workspace_id)
    await ws_manager.broadcast_graph_update(
        workspace_id,
        [n.dict() for n in elements.nodes],
        [e.dict() for e in elements.edges]
    )

    return {"status": "success", "message": f"Pivot executed on {entity.type} '{entity.label}'"}

