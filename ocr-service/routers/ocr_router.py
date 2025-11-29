from fastapi import APIRouter, File, UploadFile, HTTPException
import logging

from schemas import OcrResponse, ParseRequest, ParseResponse, HealthResponse
from services.ocr_service import recognize_file
from services.parser_service import parse_answers_from_pages
from services.yolo_checkbox_parser import parse_answers_with_yolo_paddleocr

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ocr"])


@router.post("/recognize", response_model=OcrResponse, summary="Recognize text from image/PDF")
async def recognize(file: UploadFile = File(...)) -> OcrResponse:
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    content = await file.read()
    
    if not content or len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    try:
        result = recognize_file(content, file.filename or "")
        return OcrResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/parse", response_model=ParseResponse, summary="Parse OCR results to extract answers")
async def parse_answers(request: ParseRequest) -> ParseResponse:
    try:
        logger.info("Parsing %d pages for %d questions", len(request.pages), len(request.question_ids))
        
        # Try YOLO parser first, fallback to old parser
        try:
            file_data = None
            if request.file_data:
                import base64
                file_data = base64.b64decode(request.file_data)
                logger.info(f"Decoded file_data: {len(file_data)} bytes, file_name: {request.file_name}")
            else:
                logger.warning("No file_data provided in parse request")
            
            answers = parse_answers_with_yolo_paddleocr(
                request.pages, 
                request.question_ids,
                file_data=file_data,
                file_name=request.file_name
            )
            logger.info("Used YOLO parser, found %d answers", len(answers))
        except Exception as yolo_error:
            logger.warning(f"YOLO parser failed: {yolo_error}, falling back to OCR parser", exc_info=True)
            answers = parse_answers_from_pages(request.pages, request.question_ids)
        
        # Filter out None values and convert to empty string for schema validation
        # Or keep None if schema allows it
        filtered_answers = {
            k: v if v is not None else "" 
            for k, v in answers.items()
        }
        
        return ParseResponse(
            status='ok',
            answers=filtered_answers,
            total_parsed=len([v for v in filtered_answers.values() if v]),
            total_questions=len(request.question_ids),
        )
    except Exception as e:
        logger.error("Parse error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="ocr")

