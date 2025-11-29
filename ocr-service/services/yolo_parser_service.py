"""
YOLO-based parser service for ASQ-3.
This is the new parser V2 that uses YOLO for checkbox detection.
"""
import logging
from typing import Dict, List, Optional
from PIL import Image
import io

from pipeline.process_document import process_document
from utils.yolo_detector import YOLODetector
from services.ocr_service import extract_pdf_pages

logger = logging.getLogger(__name__)

# Global YOLO detector instance (lazy loaded)
_yolo_detector: Optional[YOLODetector] = None


def get_yolo_detector(model_path: Optional[str] = None) -> Optional[YOLODetector]:
    """
    Get or create YOLO detector instance.
    
    Args:
        model_path: Path to YOLO model file
        
    Returns:
        YOLODetector instance or None if not available
    """
    global _yolo_detector
    
    if _yolo_detector is None:
        if model_path:
            _yolo_detector = YOLODetector(model_path=model_path)
        else:
            # Try default path
            import os
            default_path = os.path.join(
                os.path.dirname(__file__),
                "..",
                "checkbox_model",
                "best.pt"
            )
            default_path = os.path.abspath(default_path)
            if os.path.exists(default_path):
                _yolo_detector = YOLODetector(model_path=default_path)
            else:
                logger.warning("No YOLO model found, using dummy detector")
                _yolo_detector = YOLODetector()
    
    return _yolo_detector


def parse_answers_with_yolo(
    pages: List[Dict],
    question_ids: List[str],
    yolo_model_path: Optional[str] = None
) -> Dict[str, str]:
    """
    Parse answers using YOLO-based parser V2.
    
    Args:
        pages: List of page data from OCR
        question_ids: List of question IDs to parse
        yolo_model_path: Optional path to YOLO model
        
    Returns:
        Dictionary mapping question_id to answer
    """
    # Get YOLO detector
    detector = get_yolo_detector(yolo_model_path)
    
    # Convert pages to format expected by process_document
    # We need to add images to pages
    processed_pages = []
    
    for page in pages:
        # Try to get image from page data
        image = page.get('image')
        
        if image is None:
            # If image not in page data, we can't use YOLO
            logger.warning(f"Page {page.get('frame_index', 0)}: No image available")
            continue
        
        processed_pages.append({
            'frame_index': page.get('frame_index', 0),
            'width': page.get('width', 0),
            'height': page.get('height', 0),
            'texts': page.get('texts', []),
            'image': image
        })
    
    if not processed_pages:
        logger.warning("No pages with images available for YOLO parsing")
        return {}
    
    # Process document
    answers = process_document(processed_pages, yolo_detector=detector)
    
    # Filter to only requested question IDs
    filtered_answers = {
        qid: answers[qid]
        for qid in question_ids
        if qid in answers
    }
    
    return filtered_answers

