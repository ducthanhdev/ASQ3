"""
Domain detection for ASQ-3 questionnaire.
"""
import re
import unicodedata
import logging
from typing import List, Dict, Any, Optional

from parser.structures import OCRBox

logger = logging.getLogger(__name__)


def normalize_text(text: str) -> str:
    """
    Normalize text for domain detection.
    
    Args:
        text: Input text
        
    Returns:
        Normalized text (lowercase, no accents, no special chars)
    """
    text = text.lower()
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def detect_domain(ocr_boxes: List[OCRBox]) -> Optional[str]:
    """
    Detect domain from OCR text boxes.
    
    Domain keywords map:
    - communication: GIAO TIẾP
    - gross_motor: VẬN ĐỘNG THÔ
    - fine_motor: VẬN ĐỘNG TINH
    - problem_solving: GIẢI QUYẾT VẤN ĐỀ
    - personal_social: CÁ NHÂN - XÃ HỘI
    - overall: TỔNG QUAN
    
    Args:
        ocr_boxes: List of OCRBox objects
        
    Returns:
        Domain name or None if not detected
    """
    domain_keywords = {
        'communication': [
            'giao tiếp', 'giao tiep', 'giao tiêp', 'giaotiep',
        ],
        'gross_motor': [
            'vận động toàn thân', 'vận động thô', 'van dong toan than', 
            'van dong tho', 'vận động thỏ', 'van dong tho',
        ],
        'fine_motor': [
            'vận động tinh', 'van dong tinh',
        ],
        'problem_solving': [
            'giải quyết vấn đề', 'giai quyet van de', 'tìm kiếm', 'tim kiem',
        ],
        'personal_social': [
            'cá nhân-xã hội', 'cá nhân xã hội', 'ca nhan xa hoi', 
            'cười', 'cuoi', 'cá nhân - xã hội',
        ],
        'overall': [
            'tổng quan', 'tong quan', 'toan quan', 'tongquan', 'toanquan',
        ],
    }
    
    # Combine all OCR texts
    all_texts = [box.text for box in ocr_boxes]
    full_text = ' '.join(all_texts)
    normalized_text = normalize_text(full_text)
    
    # Check overall first (it may appear with other domains)
    for keyword in domain_keywords['overall']:
        normalized_keyword = normalize_text(keyword)
        if normalized_keyword in normalized_text:
            logger.debug(f"Detected overall domain with keyword: {keyword}")
            return 'overall'
    
    # Check other domains
    for domain, keywords in domain_keywords.items():
        if domain == 'overall':
            continue
        for keyword in keywords:
            normalized_keyword = normalize_text(keyword)
            if normalized_keyword in normalized_text:
                logger.debug(f"Detected domain '{domain}' with keyword: {keyword}")
                return domain
    
    # Fallback: check raw text for common patterns
    full_text_upper = full_text.upper()
    if 'TONG QUAN' in full_text_upper or 'TỔNG QUAN' in full_text:
        return 'overall'
    
    logger.warning("No domain detected from OCR text")
    return None

