from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.api.deps import get_db
from app.api.ws import ws_manager
from app.schemas.metadata import FileMetadataResponse
from app.services.metadata_extractor import MetadataExtractorService
from app.services.graph_correlator import GraphCorrelatorService

router = APIRouter(prefix="/forensics", tags=["Metadata & File Forensics"])

@router.post("/metadata", response_model=FileMetadataResponse)
async def analyze_file_metadata(
    file: UploadFile = File(...),
    workspace_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    service = MetadataExtractorService()
    file_bytes = await file.read()
    filename = file.filename or "uploaded_file"
    mime = file.content_type or "application/octet-stream"

    if workspace_id:
        await ws_manager.broadcast_log(
            workspace_id,
            "Forensics",
            "STARTED",
            f"Parsing metadata & EXIF from uploaded artifact '{filename}' ({len(file_bytes)} bytes)..."
        )

    try:
        result = service.analyze_file(filename, file_bytes, mime)

        if workspace_id:
            await ws_manager.broadcast_log(
                workspace_id,
                "Forensics",
                "SUCCESS",
                f"Analysis completed. GPS leak: {bool(result.gps_info)}. Warnings: {len(result.leak_warnings)}."
            )

            # Correlate into graph
            correlator = GraphCorrelatorService(db)
            await correlator.correlate_metadata(workspace_id, result.dict())

            elements = await correlator.get_cytoscape_elements(workspace_id)
            await ws_manager.broadcast_graph_update(
                workspace_id,
                [n.dict() for n in elements.nodes],
                [e.dict() for e in elements.edges]
            )

        return result

    except Exception as e:
        if workspace_id:
            await ws_manager.broadcast_log(
                workspace_id,
                "Forensics",
                "ERROR",
                f"Metadata extraction failed: {str(e)}"
            )
        raise HTTPException(status_code=500, detail=f"Forensics analysis failed: {str(e)}")

@router.post("/sanitize")
async def sanitize_file_metadata(
    file: UploadFile = File(...)
):
    service = MetadataExtractorService()
    file_bytes = await file.read()
    filename = file.filename or "document.bin"

    try:
        clean_bytes, clean_name = service.sanitize_file(filename, file_bytes)
        
        media_type = file.content_type or "application/octet-stream"
        return Response(
            content=clean_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{clean_name}"',
                "X-Sanitized": "true"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sanitization failed: {str(e)}")

