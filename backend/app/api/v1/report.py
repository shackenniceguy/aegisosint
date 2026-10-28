from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.schemas.report import ReportGenerateRequest, ReportResponse
from app.services.report_generator import ReportGeneratorService

router = APIRouter(prefix="/reports", tags=["Reporting & Export"])

@router.post("/generate", response_model=ReportResponse)
async def generate_investigation_report(
    payload: ReportGenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    service = ReportGeneratorService(db)
    try:
        return await service.generate_report(
            workspace_id=payload.workspace_id,
            lang=payload.language,
            output_format=payload.format
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

