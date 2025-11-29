"""
Question number extraction from OCR text.
"""
import re
import logging
from typing import List, Optional

from parser.structures import OCRBox

logger = logging.getLogger(__name__)


def extract_question_numbers(ocr_boxes: List[OCRBox], domain: Optional[str] = None) -> List[int]:
    """
    Extract question numbers from OCR text boxes.
    
    Rules:
    - Match pattern: ^\d+\.?
    - Domain questions: q1-q6
    - Overall domain: q1-q8
    
    Args:
        ocr_boxes: List of OCRBox objects
        domain: Domain name (to determine max question number)
        
    Returns:
        List of question numbers found
    """
    question_numbers = set()
    max_question = 6  # Default for regular domains
    
    if domain == 'overall':
        max_question = 8
    
    for box in ocr_boxes:
        text = box.text.strip()
        # Match pattern: number followed by optional period
        match = re.match(r'^(\d+)\.?', text)
        if match:
            num = int(match.group(1))
            if 1 <= num <= max_question:
                question_numbers.add(num)
    
    result = sorted(list(question_numbers))
    logger.debug(f"Extracted question numbers for domain '{domain}': {result}")
    return result


def get_question_y_position(ocr_boxes: List[OCRBox], question_num: int) -> Optional[int]:
    """
    Get Y position of a specific question number.
    
    Args:
        ocr_boxes: List of OCRBox objects
        question_num: Question number to find
        
    Returns:
        Y coordinate of question text or None if not found
    """
    for box in ocr_boxes:
        text = box.text.strip()
        match = re.match(r'^(\d+)\.?', text)
        if match and int(match.group(1)) == question_num:
            return box.y
    
    return None

