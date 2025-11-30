from fastapi import APIRouter, UploadFile, File, HTTPException
import logging
import base64
from typing import Optional

from app.services.ocr_service import OCRService
from app.schemas import ParseRequest, ParseResponse, RecognizeResponse, HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ocr"])

_ocr_service: Optional[OCRService] = None


def get_ocr_service() -> OCRService:
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = OCRService()
    return _ocr_service


@router.post("/parse", response_model=ParseResponse)
async def parse_ocr(request: ParseRequest) -> ParseResponse:
    if not request.question_ids:
        raise HTTPException(status_code=400, detail="question_ids is required")

    try:
        ocr_service = get_ocr_service()
        images = ocr_service.extract_images(
            file_data=request.file_data,
            file_name=request.file_name,
            pages=request.pages,
        )
        
        answers = ocr_service.parse_answers(images, request.question_ids)
        
        return ParseResponse(answers=answers)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error in parse_ocr: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("/recognize", response_model=RecognizeResponse)
async def recognize_file(file: UploadFile = File(...)) -> RecognizeResponse:
    try:
        ocr_service = get_ocr_service()
        file_bytes = await file.read()
        file_name = file.filename or "unknown"
        
        pages, full_text, confidence, total_frames = ocr_service.recognize_file(
            file_bytes, file_name
        )
        
        file_data_base64 = base64.b64encode(file_bytes).decode('utf-8')
        
        return RecognizeResponse(
            pages=pages,
            full_text=full_text,
            confidence=confidence,
            total_frames=total_frames,
            file_data=file_data_base64,
            file_name=file_name,
        )
    except Exception as e:
        logger.error("Error in recognize_file: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse()
