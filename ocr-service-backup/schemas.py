from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class OcrTextItem(BaseModel):
    text: str
    bbox: List[int]
    conf: float


class OcrPage(BaseModel):
    frame_index: int
    width: int
    height: int
    texts: List[OcrTextItem]
    question_numbers: Optional[List[int]] = None


class OcrResponse(BaseModel):
    status: str
    pages: List[OcrPage]
    full_text: str
    confidence: float
    total_frames: int
    file_data: Optional[str] = None  
    file_name: Optional[str] = None


class ParseRequest(BaseModel):
    pages: List[Dict[str, Any]]
    question_ids: List[str]
    file_data: Optional[str] = None
    file_name: Optional[str] = None


class ParseResponse(BaseModel):
    status: str
    answers: Dict[str, Optional[str]]
    total_parsed: int
    total_questions: int


class HealthResponse(BaseModel):
    status: str
    service: str

