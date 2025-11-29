"""
Process a single page of ASQ-3 questionnaire.
"""
import logging
from typing import Dict, List, Optional
from PIL import Image

from parser.structures import OCRBox, YOLOBox, ParsedAnswer
from parser.domain import detect_domain
from parser.question_loc import extract_question_numbers, get_question_y_position
from parser.answer_parser import parse_answers_from_yolo
from utils.yolo_detector import YOLODetector

logger = logging.getLogger(__name__)


def process_page(
    image: Image.Image,
    ocr_boxes: List[Dict[str, any]],
    yolo_detector: Optional[YOLODetector] = None
) -> List[ParsedAnswer]:
    """
    Process a single page to extract answers.
    
    Args:
        image: PIL Image of the page
        ocr_boxes: List of OCR text boxes from PaddleOCR (dict format)
        yolo_detector: YOLO detector instance (optional)
        
    Returns:
        List of ParsedAnswer objects
    """
    # Convert OCR boxes to OCRBox objects
    ocr_box_objects = []
    for box in ocr_boxes:
        ocr_box = OCRBox(
            text=box.get('text', ''),
            bbox=box.get('bbox', []),
            conf=box.get('conf', 1.0)
        )
        ocr_box_objects.append(ocr_box)
    
    # Detect domain
    domain = detect_domain(ocr_box_objects)
    if not domain:
        logger.warning("Could not detect domain, skipping page")
        return []
    
    # Extract question numbers
    question_nums = extract_question_numbers(ocr_box_objects, domain)
    if not question_nums:
        logger.warning(f"No questions found for domain '{domain}'")
        return []
    
    # Get Y positions for each question
    question_y_positions = {}
    for q_num in question_nums:
        y_pos = get_question_y_position(ocr_box_objects, q_num)
        if y_pos:
            question_y_positions[q_num] = y_pos
    
    # Run YOLO detection if available
    if yolo_detector:
        yolo_detections = yolo_detector.detect(image)
        labels = yolo_detector.get_labels(yolo_detections)
        checkboxes = yolo_detector.get_checkboxes(yolo_detections)
        marks = yolo_detector.get_marks(yolo_detections)
        
        logger.debug(
            f"YOLO detected: {len(labels)} labels, {len(checkboxes)} checkboxes, {len(marks)} marks"
        )
        
        # Parse answers using YOLO
        answers = parse_answers_from_yolo(
            question_nums=question_nums,
            question_y_positions=question_y_positions,
            labels=labels,
            checkboxes=checkboxes,
            marks=marks,
            domain=domain
        )
        
        return answers
    else:
        logger.warning("No YOLO detector available, cannot parse answers")
        return []

