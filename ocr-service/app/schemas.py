from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class OcrTextItem(BaseModel):
    text: str
    bbox: List[int] = Field(..., min_items=4, max_items=4)
    conf: float = Field(..., ge=0.0, le=1.0)


class OcrPage(BaseModel):
    frame_index: int
    width: int
    height: int
    texts: List[OcrTextItem] = Field(default_factory=list)
    question_numbers: List[int] = Field(default_factory=list)
    image: Optional[str] = None


class ParseRequest(BaseModel):
    pages: Optional[List[Dict[str, Any]]] = None
    question_ids: List[str] = Field(..., min_items=1)
    file_data: Optional[str] = None
    file_name: Optional[str] = None


class ParseResponse(BaseModel):
    status: str = "ok"
    answers: Dict[str, str]


class RecognizeResponse(BaseModel):
    status: str = "ok"
    pages: List[OcrPage]
    full_text: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    total_frames: int
    file_data: Optional[str] = None
    file_name: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "gemini-ocr"

