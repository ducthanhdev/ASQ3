"""
YOLO + PaddleOCR Parser Service
Pipeline: PDF/IMG → PaddleOCR (text) + YOLO (checkbox) → Merge → Parse answers
"""
import logging
import os
from typing import List, Dict, Any, Optional
import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Global YOLO model (lazy loaded)
_yolo_model = None


def get_yolo_model():
    """Get or initialize YOLO model."""
    global _yolo_model
    if _yolo_model is None:
        try:
            from ultralytics import YOLO
            model_path = os.path.join(
                os.path.dirname(__file__),
                "..",
                "checkbox_model",
                "best.pt"
            )
            model_path = os.path.abspath(model_path)
            
            if not os.path.exists(model_path):
                logger.warning(f"YOLO model not found at {model_path}")
                return None
            
            logger.info(f"Loading YOLO model from {model_path}")
            _yolo_model = YOLO(model_path)
            logger.info("YOLO model loaded successfully")
        except ImportError:
            logger.error("ultralytics not installed. Install with: pip install ultralytics")
            return None
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            return None
    
    return _yolo_model


def detect_checkboxes_yolo(image: np.ndarray, conf_threshold: float = 0.01) -> List[Dict[str, Any]]:
    """
    Detect checkboxes using YOLO model.
    
    Args:
        image: OpenCV image (numpy array)
        conf_threshold: Confidence threshold for detection
        
    Returns:
        List of checkbox detections:
        [
            {
                "class": int,  # 0=empty, 1=marked
                "x1": int, "y1": int, "x2": int, "y2": int,
                "conf": float
            },
            ...
        ]
    """
    model = get_yolo_model()
    if model is None:
        logger.warning("YOLO model not available, returning empty detections")
        return []
    
    try:
        # Log image info
        logger.debug(f"Running YOLO detection on image shape: {image.shape}, dtype: {image.dtype}, conf_threshold: {conf_threshold}")
        
        # Ensure image is in correct format (BGR for OpenCV, but YOLO expects RGB)
        # Convert BGR to RGB if needed
        if len(image.shape) == 3 and image.shape[2] == 3:
            # Check if it's BGR (OpenCV default) and convert to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            image_rgb = image
        
        # Run YOLO inference
        results = model.predict(image_rgb, conf=conf_threshold, verbose=False, imgsz=800)
        result = results[0]
        boxes = result.boxes
        
        detections = []
        if boxes is not None and len(boxes) > 0:
            for box in boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                
                detections.append({
                    "class": cls,  # 0=checkbox_empty, 1=checkbox_marked
                    "x1": int(x1),
                    "y1": int(y1),
                    "x2": int(x2),
                    "y2": int(y2),
                    "conf": conf
                })
            logger.info(f"YOLO detected {len(detections)} checkboxes (conf_threshold={conf_threshold})")
        else:
            logger.warning(f"YOLO returned no boxes (conf_threshold={conf_threshold}, image_shape={image.shape})")
        
        return detections
    
    except Exception as e:
        logger.error(f"YOLO detection error: {e}", exc_info=True)
        return []


def get_bbox_center(bbox: List[int]) -> tuple:
    """Get center point of bbox."""
    x_coords = [bbox[i] for i in range(0, len(bbox), 2)]
    y_coords = [bbox[i] for i in range(1, len(bbox), 2)]
    cx = sum(x_coords) / len(x_coords)
    cy = sum(y_coords) / len(y_coords)
    return (cx, cy)


def parse_yolo_checkboxes(
    yolo_boxes: List[Dict[str, Any]],
    labels_positions: List[Dict[str, Any]]
) -> Dict[str, str]:
    """
    Map YOLO checkbox detections to answers.
    
    Args:
        yolo_boxes: List of YOLO detections
            [
                {
                    "class": int,  # 0=empty, 1=marked
                    "x1": int, "y1": int, "x2": int, "y2": int,
                    "conf": float
                },
                ...
            ]
        labels_positions: List of question data with label positions
            [
                {
                    "question_id": str,  # e.g., "communication_q1"
                    "labels": [
                        {
                            "type": str,  # "C", "D", "K"
                            "bbox": List[int],  # [x1, y1, x2, y2, ...]
                        },
                        ...
                    ]
                },
                ...
            ]
    
    Returns:
        Dictionary mapping question_id to answer ("Y", "S", "N", or None)
    """
    results = {}
    
    for q_data in labels_positions:
        qid = q_data["question_id"]
        labels = q_data.get("labels", [])
        
        # Map each label (C, D, K) to nearest checkbox
        answers = {"C": None, "D": None, "K": None}
        
        for label in labels:
            label_type = label["type"]  # "C", "D", or "K"
            label_bbox = label["bbox"]
            
            # Get label center
            lx, ly = get_bbox_center(label_bbox)
            
            # Find nearest checkbox
            best_box = None
            best_dist = float('inf')
            
            for box in yolo_boxes:
                # Get checkbox center
                bx = (box["x1"] + box["x2"]) / 2
                by = (box["y1"] + box["y2"]) / 2
                
                # Calculate Manhattan distance
                dist = abs(lx - bx) + abs(ly - by)
                
                if dist < best_dist:
                    best_dist = dist
                    best_box = box
            
            # Only accept if distance is reasonable (within 150 pixels for larger images)
            if best_box and best_dist < 150:
                answers[label_type] = best_box["class"]
                logger.debug(f"  Label {label_type}: matched checkbox class={best_box['class']}, dist={best_dist:.1f}")
            else:
                logger.debug(f"  Label {label_type}: no checkbox found (best_dist={best_dist:.1f})")
        
        # Convert to final answer: Y/S/N
        # Y = C marked (class 1), S = D marked (class 1), N = K marked (class 1)
        if answers["C"] == 1:
            results[qid] = "Y"
            logger.debug(f"  {qid}: C marked → Y")
        elif answers["D"] == 1:
            results[qid] = "S"
            logger.debug(f"  {qid}: D marked → S")
        elif answers["K"] == 1:
            results[qid] = "N"
            logger.debug(f"  {qid}: K marked → N")
        else:
            results[qid] = None  # No checkbox marked
            logger.debug(f"  {qid}: No checkbox marked (C={answers['C']}, D={answers['D']}, K={answers['K']})")
    
    return results


def extract_labels_from_ocr_texts(page_texts: List[Dict[str, Any]], domain: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Extract label positions (C, D, K) from OCR texts.
    
    Args:
        page_texts: List of OCR text detections
        domain: Domain name (for filtering, e.g., "overall" only has C and K)
    
    Returns:
        List of question data with labels:
        [
            {
                "question_id": str,
                "labels": [
                    {"type": "C", "bbox": [...]},
                    {"type": "D", "bbox": [...]},
                    {"type": "K", "bbox": [...]},
                ]
            },
            ...
        ]
    """
    import re
    from services.parser_service import get_question_numbers, detect_domain
    
    # Detect domain if not provided
    if domain is None:
        domain = detect_domain(page_texts)
    
    # Get question numbers
    question_nums = get_question_numbers(page_texts, domain)
    logger.debug(f"Found {len(question_nums)} question numbers: {question_nums}, domain: {domain}")
    
    # Build question_id to labels mapping
    questions_data = []
    
    for q_num in question_nums:
        # Find question text
        question_text = None
        for text_item in page_texts:
            text = text_item['text'].strip()
            match = re.match(r'^(\d+)\.?', text)
            if match and int(match.group(1)) == q_num:
                question_text = text_item
                break
        
        if not question_text:
            continue
        
        # Get question Y position
        question_y = min(question_text['bbox'][i] for i in range(1, len(question_text['bbox']), 2))
        question_y_max = max(question_text['bbox'][i] for i in range(1, len(question_text['bbox']), 2))
        
        # Find labels (C, D, K) near this question
        labels = []
        for text_item in page_texts:
            text = text_item['text'].strip()
            
            # Filter by domain - be more lenient with text matching
            text_upper = text.upper().strip()
            # Remove common OCR artifacts
            text_clean = text_upper.replace('□', '').replace('☐', '').replace('☑', '').replace('☒', '')
            
            if domain == 'overall':
                # Overall only has C and K
                if text_clean not in ['C', 'K']:
                    continue
            else:
                # Other domains have C, D, K
                if text_clean not in ['C', 'D', 'Đ', 'K']:
                    continue
            
            # Use cleaned text for label type
            label_type = text_clean
            # Normalize Đ to D
            if label_type == 'Đ':
                label_type = 'D'
            
            # Check if label is near question (same row)
            label_y = min(text_item['bbox'][i] for i in range(1, len(text_item['bbox']), 2))
            # Increase tolerance for larger images (1190x1684)
            if question_y - 20 <= label_y <= question_y_max + 50:
                labels.append({
                    "type": label_type,
                    "bbox": text_item['bbox']
                })
        
        if labels:
            # Generate question_id
            if domain:
                qid = f"{domain}_q{q_num}"
            else:
                qid = f"q{q_num}"
            
            questions_data.append({
                "question_id": qid,
                "labels": labels
            })
            logger.debug(f"Question {qid}: found {len(labels)} labels: {[l['type'] for l in labels]}")
        else:
            logger.debug(f"Question {q_num}: no labels found")
    
    logger.info(f"Extracted {len(questions_data)} questions with labels from {len(question_nums)} question numbers")
    return questions_data


def parse_page_with_yolo(
    page_texts: List[Dict[str, Any]],
    page_image: Optional[np.ndarray],
    question_ids: List[str],
    domain: Optional[str] = None
) -> Dict[str, str]:
    """
    Parse a single page using YOLO + PaddleOCR.
    
    Args:
        page_texts: OCR text detections from PaddleOCR
        page_image: OpenCV image (numpy array) for YOLO detection
        question_ids: List of question IDs to parse
        domain: Optional domain name
    
    Returns:
        Dictionary mapping question_id to answer
    """
    if page_image is None:
        logger.warning("No image provided for YOLO detection")
        return {}
    
    logger.debug(f"Page image shape: {page_image.shape if page_image is not None else None}")
    
    # 1. Detect checkboxes with YOLO
    # Try multiple confidence thresholds if no detections
    yolo_boxes = detect_checkboxes_yolo(page_image, conf_threshold=0.01)
    if not yolo_boxes:
        logger.debug("No detections at conf=0.01, trying conf=0.001")
        yolo_boxes = detect_checkboxes_yolo(page_image, conf_threshold=0.001)
    if not yolo_boxes:
        logger.debug("No detections at conf=0.001, trying conf=0.0001")
        yolo_boxes = detect_checkboxes_yolo(page_image, conf_threshold=0.0001)
    logger.info(f"YOLO detected {len(yolo_boxes)} checkboxes")
    
    if not yolo_boxes:
        logger.warning("No checkboxes detected by YOLO")
        return {}
    
    # Log checkbox positions for debugging
    for i, box in enumerate(yolo_boxes[:5]):  # Log first 5
        logger.debug(f"  Checkbox {i}: class={box['class']}, bbox=({box['x1']}, {box['y1']}, {box['x2']}, {box['y2']}), conf={box['conf']:.3f}")
    
    # 2. Extract label positions from OCR texts
    labels_positions = extract_labels_from_ocr_texts(page_texts, domain)
    logger.info(f"Extracted {len(labels_positions)} questions with labels")
    
    if not labels_positions:
        logger.warning("No labels found in OCR texts")
        return {}
    
    # 3. Map YOLO checkboxes to answers
    logger.debug(f"Mapping {len(yolo_boxes)} checkboxes to {len(labels_positions)} questions...")
    all_answers = parse_yolo_checkboxes(yolo_boxes, labels_positions)
    logger.info(f"Mapped to {len(all_answers)} answers: {list(all_answers.keys())[:5]}...")
    
    # 4. Filter to only requested question IDs
    filtered_answers = {
        qid: all_answers.get(qid)
        for qid in question_ids
        if qid in all_answers
    }
    
    logger.info(f"Filtered to {len(filtered_answers)} answers for requested question IDs")
    return filtered_answers


def parse_answers_with_yolo_paddleocr(
    pages: List[Dict[str, Any]],
    question_ids: List[str],
    file_data: Optional[bytes] = None,
    file_name: Optional[str] = None
) -> Dict[str, str]:
    """
    Parse answers from pages using YOLO + PaddleOCR pipeline.
    
    Args:
        pages: List of page data from OCR service
        question_ids: List of question IDs to parse
        file_data: Optional file data (base64 string or bytes) to extract images
        file_name: Optional file name to determine format
    
    Returns:
        Dictionary mapping question_id to answer ("Y", "S", "N")
    """
    all_answers = {}
    
    logger.info(f"Parsing {len(pages)} pages for {len(question_ids)} questions")
    logger.info(f"File data provided: {file_data is not None}, File name: {file_name}")
    
    # Extract images from file if provided
    page_images = []
    if file_data:
        try:
            import base64
            from services.ocr_service import extract_pdf_pages, extract_gif_frames
            
            # Decode base64 if needed
            if isinstance(file_data, str):
                file_bytes = base64.b64decode(file_data)
            else:
                file_bytes = file_data
            
            # Extract images based on file type
            if file_name and file_name.lower().endswith('.pdf'):
                frames = extract_pdf_pages(file_bytes)
                logger.info(f"Extracted {len(frames)} frames from PDF")
                page_images = []
                for i, f in enumerate(frames):
                    # frames are already PNG bytes from extract_pdf_pages
                    nparr = np.frombuffer(f, np.uint8)
                    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    if img is not None:
                        page_images.append(img)
                        logger.debug(f"Frame {i}: decoded image shape {img.shape}")
                    else:
                        logger.warning(f"Frame {i}: failed to decode image")
            else:
                frames = extract_gif_frames(file_bytes)
                page_images = []
                for f in frames:
                    frame_bytes = f.read() if hasattr(f, 'read') else f
                    nparr = np.frombuffer(frame_bytes, np.uint8)
                    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    if img is not None:
                        page_images.append(img)
            
            logger.info(f"Extracted {len(page_images)} images from file for YOLO detection")
        except Exception as e:
            logger.warning(f"Failed to extract images from file: {e}")
            page_images = []
    
    for idx, page in enumerate(pages):
        page_texts = page.get('texts', [])
        
        # Try to get image from extracted images or page data
        page_image = None
        if idx < len(page_images) and page_images[idx] is not None:
            page_image = page_images[idx]
        else:
            page_image_data = page.get('image')
            if page_image_data is not None:
                if isinstance(page_image_data, bytes):
                    nparr = np.frombuffer(page_image_data, np.uint8)
                    page_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                elif isinstance(page_image_data, np.ndarray):
                    page_image = page_image_data
                elif isinstance(page_image_data, list):
                    # Convert list to numpy array
                    page_image = np.array(page_image_data, dtype=np.uint8)
        
        # Detect domain from texts
        from services.parser_service import detect_domain
        domain = detect_domain(page_texts)
        
        # Parse page
        page_answers = parse_page_with_yolo(
            page_texts,
            page_image,
            question_ids,
            domain
        )
        
        logger.info(f"Page {idx}: domain={domain}, image={'yes' if page_image is not None else 'no'}, answers={len(page_answers)}")
        
        # Merge answers (later pages override earlier ones)
        all_answers.update(page_answers)
    
    logger.info(f"Total answers parsed: {len(all_answers)}")
    return all_answers

