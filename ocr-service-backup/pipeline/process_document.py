"""
Process entire ASQ-3 document (multiple pages).
"""
import logging
from typing import Dict, List
from PIL import Image

from pipeline.process_page import process_page
from utils.yolo_detector import YOLODetector

logger = logging.getLogger(__name__)


def process_document(
    pages: List[Dict[str, any]],
    yolo_detector: YOLODetector = None
) -> Dict[str, str]:
    """
    Process entire document with multiple pages.
    
    Args:
        pages: List of page data, each containing:
            - 'frame_index': int
            - 'width': int
            - 'height': int
            - 'texts': List of OCR boxes (dict format)
            - 'image': PIL Image (optional, will be created if not provided)
        yolo_detector: YOLO detector instance (optional)
        
    Returns:
        Dictionary mapping question_id to answer ("Y", "S", or "N")
    """
    all_answers = {}
    
    for page_data in pages:
        frame_index = page_data.get('frame_index', 0)
        texts = page_data.get('texts', [])
        
        # Get or create image
        image = page_data.get('image')
        if image is None:
            # If image not provided, we can't run YOLO
            logger.warning(f"Page {frame_index}: No image provided, skipping YOLO detection")
            continue
        
        logger.info(f"Processing page {frame_index}")
        
        # Process page
        page_answers = process_page(
            image=image,
            ocr_boxes=texts,
            yolo_detector=yolo_detector
        )
        
        # Merge answers
        for answer in page_answers:
            all_answers[answer.question_id] = answer.answer
        
        logger.debug(f"Page {frame_index}: Found {len(page_answers)} answers")
    
    logger.info(f"Total answers parsed: {len(all_answers)}")
    return all_answers

