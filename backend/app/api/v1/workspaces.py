from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.api.deps import get_db
from app.models.workspace import Workspace
from app.models.entity import Entity
from app.models.relationship import Relationship
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(db: AsyncSession = Depends(get_db)):
    stmt = select(Workspace).order_by(Workspace.updated_at.desc())
    res = await db.execute(stmt)
    workspaces = res.scalars().all()
    
    out = []
    for w in workspaces:
        ent_count_stmt = select(func.count(Entity.id)).where(Entity.workspace_id == w.id)
        rel_count_stmt = select(func.count(Relationship.id)).where(Relationship.workspace_id == w.id)
        
        ent_cnt = (await db.execute(ent_count_stmt)).scalar() or 0
        rel_cnt = (await db.execute(rel_count_stmt)).scalar() or 0
        
        out.append(WorkspaceResponse(
            id=w.id,
            name=w.name,
            target=w.target,
            description=w.description,
            created_at=w.created_at,
            updated_at=w.updated_at,
            entity_count=ent_cnt,
            relationship_count=rel_cnt
        ))
    return out

@router.post("", response_model=WorkspaceResponse)
async def create_workspace(payload: WorkspaceCreate, db: AsyncSession = Depends(get_db)):
    w = Workspace(
        name=payload.name,
        target=payload.target,
        description=payload.description or ""
    )
    db.add(w)
    await db.commit()
    await db.refresh(w)
    return WorkspaceResponse(
        id=w.id,
        name=w.name,
        target=w.target,
        description=w.description,
        created_at=w.created_at,
        updated_at=w.updated_at,
        entity_count=0,
        relationship_count=0
    )

@router.delete("/{workspace_id}")
async def delete_workspace(workspace_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Workspace).where(Workspace.id == workspace_id)
    res = await db.execute(stmt)
    w = res.scalars().first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found")
    await db.delete(w)
    await db.commit()
    return {"status": "success", "deleted_id": workspace_id}

