from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.dork import DorkGenerateRequest, DorkQuery, WaybackRequest, WaybackResponse
from app.services.dork_archive import DorkArchiveService

router = APIRouter(prefix="/archive", tags=["Dork Builder & Archive Explorer"])

@router.post("/dorks", response_model=List[DorkQuery])
async def get_dorks(payload: DorkGenerateRequest):
    service = DorkArchiveService()
    try:
        return service.generate_dorks(payload.target)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate dorks: {str(e)}")

@router.post("/wayback", response_model=WaybackResponse)
async def query_wayback(payload: WaybackRequest):
    service = DorkArchiveService()
    try:
        return await service.query_wayback_cdx(
            domain=payload.domain,
            limit=payload.limit,
            mime_filter=payload.mimetype_filter
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Wayback Machine query failed: {str(e)}")

