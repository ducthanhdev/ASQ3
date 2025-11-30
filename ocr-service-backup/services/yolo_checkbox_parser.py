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
            
            try:
                logger.info(f"YOLO model loaded successfully. Model type: {type(_yolo_model).__name__}")
            except:
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
        logger.debug(f"Running YOLO detection on image shape: {image.shape}, dtype: {image.dtype}, conf_threshold: {conf_threshold}")
        
        if len(image.shape) == 3 and image.shape[2] == 3:
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            image_rgb = image
        
        # Try multiple image sizes - prioritize larger sizes for better detection
        # Test results show imgsz=1024 works better than 800 for marked checkboxes
        imgsz_options = [1024, 1280, 800, 640]
        detections = []
        
        # Try multiple confidence thresholds - start with higher for better quality
        conf_options = [0.1, 0.05, conf_threshold, 0.001] if conf_threshold < 0.1 else [conf_threshold, 0.05, 0.01, 0.001]
        
        for imgsz in imgsz_options:
            for conf in conf_options:
                logger.debug(f"Trying YOLO detection with imgsz={imgsz}, conf={conf}")
                
                results = model.predict(
                    image_rgb, 
                    conf=conf, 
                    verbose=False, 
                    imgsz=imgsz,
                    iou=0.7,
                    agnostic_nms=False
                )
                result = results[0]
                boxes = result.boxes
                
                if boxes is not None and len(boxes) > 0:
                    logger.info(f"Found {len(boxes)} detections with imgsz={imgsz}, conf={conf}")
                    # Use this result
                    break
            if boxes is not None and len(boxes) > 0:
                break
        
        # If still no detections, try with very low confidence as last resort
        if (boxes is None or len(boxes) == 0):
            logger.debug(f"No detections with standard settings, trying with very low confidence: 0.0001")
            for imgsz in [1024, 800, 640]:
                results = model.predict(
                    image_rgb,
                    conf=0.0001,
                    verbose=False,
                    imgsz=imgsz,
                    iou=0.5,
                    agnostic_nms=False
                )
                result = results[0]
                boxes = result.boxes
                if boxes is not None and len(boxes) > 0:
                    logger.info(f"Found {len(boxes)} detections with imgsz={imgsz}, conf=0.0001")
                    break
        
        detections = []
        if boxes is not None and len(boxes) > 0:
            for box in boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                
                # Filter: Keep detections with conf >= 0.01
                # But be more lenient for marked checkboxes (class 1) which may have lower confidence
                min_conf = 0.01 if cls == 0 else 0.005  # Lower threshold for marked checkboxes
                if conf >= min_conf:
                    detections.append({
                        "class": cls,
                        "x1": int(x1),
                        "y1": int(y1),
                        "x2": int(x2),
                        "y2": int(y2),
                        "conf": conf
                    })
            
            marked_count = sum(1 for d in detections if d["class"] == 1)
            empty_count = sum(1 for d in detections if d["class"] == 0)
            avg_conf = sum(d["conf"] for d in detections) / len(detections) if detections else 0
            logger.info(f"YOLO detected {len(detections)} checkboxes: {marked_count} marked, {empty_count} empty, avg_conf={avg_conf:.3f}")
        else:
            logger.warning(f"YOLO returned no boxes (conf_threshold={conf_threshold}, image_shape={image.shape})")
            logger.debug(f"Model info: {type(model)}, device: {getattr(model, 'device', 'unknown')}")
        
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
    labels_positions: List[Dict[str, Any]],
    page_image: Optional[np.ndarray] = None
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
    
    # Log checkbox and label positions for debugging
    logger.debug(f"Mapping {len(yolo_boxes)} YOLO boxes to {len(labels_positions)} questions:")
    for i, box in enumerate(yolo_boxes[:10]):
        bx = (box["x1"] + box["x2"]) / 2
        by = (box["y1"] + box["y2"]) / 2
        logger.debug(f"  YOLO box {i}: pos=({bx:.0f},{by:.0f}), class={box['class']}, conf={box['conf']:.3f}")
    
    for q_data in labels_positions:
        qid = q_data["question_id"]
        labels = q_data.get("labels", [])
        
        # Log label positions for this question
        for label in labels:
            lx, ly = get_bbox_center(label["bbox"])
            logger.debug(f"  {qid} Label {label['type']}: pos=({lx:.0f},{ly:.0f})")
        
        answers = {"C": None, "D": None, "K": None}
        
        for label in labels:
            label_type = label["type"]
            label_bbox = label["bbox"]
            
            lx, ly = get_bbox_center(label_bbox)
            
            best_box = None
            best_dist = float('inf')
            
            for box in yolo_boxes:
                bx = (box["x1"] + box["x2"]) / 2
                by = (box["y1"] + box["y2"]) / 2
                
                # Important: checkboxes should be to the LEFT of labels (in ASQ-3 form)
                # But on large images, X distance can be very large (400-600px)
                # So we validate: checkbox should be left of label (bx < lx)
                # But we don't set strict max X distance - use distance threshold instead
                if bx > lx:
                    continue  # Checkbox is to the right of label, skip
                
                # Use weighted distance: prioritize Y distance (vertical alignment)
                # Labels and checkboxes should be on similar Y level
                y_dist = abs(ly - by)
                x_dist = abs(lx - bx)
                
                # On very large images (2200x1700), X distance can be 500-600px
                # Y distance should be small (<100px) for same row
                # Adjust weighting to prioritize Y alignment more
                dist = y_dist * 2.0 + x_dist * 0.2  # Much more weight on Y
                
                if dist < best_dist:
                    best_dist = dist
                    best_box = box
            
            # Increase distance threshold for larger images and adjust based on image size
            # For 2200x1700 images, checkboxes can be much further apart
            # Distance scales with image size
            if page_image is not None:
                img_h, img_w = page_image.shape[:2]
                if img_h > 2000 or img_w > 1500:
                    max_dist = 500  # Very large images (2200x1700)
                elif img_h > 1500 or img_w > 1000:
                    max_dist = 350  # Large images (1684x1190)
                elif img_h > 1000 or img_w > 800:
                    max_dist = 250  # Medium images
                else:
                    max_dist = 200  # Small images (640x800)
            else:
                max_dist = 350  # Default
            
            if best_box and best_dist < max_dist:
                answers[label_type] = best_box["class"]
                bx = (best_box["x1"] + best_box["x2"]) / 2
                by = (best_box["y1"] + best_box["y2"]) / 2
                logger.info(f"  {qid} Label {label_type}: matched checkbox class={best_box['class']}, dist={best_dist:.1f}, label_pos=({lx:.0f},{ly:.0f}), box_pos=({bx:.0f},{by:.0f})")
            else:
                logger.warning(f"  {qid} Label {label_type}: no checkbox found (best_dist={best_dist:.1f}, max_dist={max_dist}, label_pos=({lx:.0f},{ly:.0f}))")
                # Log nearest checkbox for debugging
                if best_box:
                    bx = (best_box["x1"] + best_box["x2"]) / 2
                    by = (best_box["y1"] + best_box["y2"]) / 2
                    logger.debug(f"    Nearest checkbox: pos=({bx:.0f},{by:.0f}), class={best_box['class']}, conf={best_box['conf']:.3f}")
        
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
            results[qid] = None
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
    
    if domain is None:
        domain = detect_domain(page_texts)
    
    question_nums = get_question_numbers(page_texts, domain)
    logger.debug(f"Found {len(question_nums)} question numbers: {question_nums}, domain: {domain}")
    
    if not question_nums:
        logger.warning(f"No question numbers found for domain: {domain}")
        # Try to find any question numbers manually
        for text_item in page_texts:
            text = text_item['text'].strip()
            match = re.match(r'^(\d+)\.?', text)
            if match:
                q_num = int(match.group(1))
                if q_num not in question_nums:
                    question_nums.append(q_num)
                    logger.debug(f"Manually found question number: {q_num}")
    
    questions_data = []
    
    for q_num in question_nums:
        question_text = None
        for text_item in page_texts:
            text = text_item['text'].strip()
            match = re.match(r'^(\d+)\.?', text)
            if match and int(match.group(1)) == q_num:
                question_text = text_item
                break
        
        if not question_text:
            logger.debug(f"Question {q_num} text not found in OCR texts")
            continue
        
        question_y = min(question_text['bbox'][i] for i in range(1, len(question_text['bbox']), 2))
        question_y_max = max(question_text['bbox'][i] for i in range(1, len(question_text['bbox']), 2))
        
        labels = []
        for text_item in page_texts:
            text = text_item['text'].strip()
            
            text_upper = text.upper().strip()
            # More aggressive cleaning - remove all checkbox symbols, spaces, tabs
            # Also handle OCR artifacts like Chinese characters (区, 日, etc.)
            # These are often OCR misreads of checkbox symbols
            # IMPORTANT: "日" is often OCR misread of "Đ" (Vietnamese Đ)
            # So we need to replace "日" with "Đ" BEFORE removing it
            text_clean = text_upper.replace('日', 'Đ')  # Replace 日 with Đ first (OCR error)
            text_clean = text_clean.replace('□', '').replace('☐', '').replace('☑', '').replace('☒', '')
            text_clean = text_clean.replace('区', '').replace('凶', '').replace('冈', '')  # Other OCR artifacts
            text_clean = text_clean.replace(' ', '').replace('\t', '').strip()
            
            # Also handle OCR errors where "Đ" is read as "B" or "0"
            # In non-overall domains, "B" and "0" are almost certainly "Đ" (OCR errors)
            # We can be more aggressive here since "B" and "0" are not valid labels
            if domain != 'overall':
                # Replace "B" with "Đ" (common OCR error)
                text_clean = text_clean.replace('B', 'Đ')
                # Replace "0" with "Đ" (common OCR error, especially in "区C□0□K")
                text_clean = text_clean.replace('0', 'Đ')
            
            # Handle cases where OCR reads multiple labels together (e.g., "□C区D", "C□D□K")
            # Extract all valid label letters from the text
            found_labels = []
            for char in text_clean:
                char_upper = char.upper()
                # Check if this character is a valid label
                if domain == 'overall':
                    if char_upper in ['C', 'K']:
                        found_labels.append(char_upper)
                else:
                    if char_upper in ['C', 'D', 'Đ', 'K']:
                        # Normalize 'Đ' to 'D'
                        label_char = 'D' if char_upper == 'Đ' else char_upper
                        found_labels.append(label_char)
            
            # If no labels found, try lowercase
            if not found_labels:
                for char in text_clean:
                    char_lower = char.lower()
                    if domain == 'overall':
                        if char_lower in ['c', 'k']:
                            found_labels.append(char_lower.upper())
                    else:
                        if char_lower in ['c', 'd', 'đ', 'k']:
                            # Normalize 'đ' to 'D'
                            label_char = 'D'
                            found_labels.append(label_char)
            
            # Add all found labels
            for label_type in found_labels:
                # Check if label is near question (same row)
                label_y = min(text_item['bbox'][i] for i in range(1, len(text_item['bbox']), 2))
                label_x = min(text_item['bbox'][i] for i in range(0, len(text_item['bbox']), 2))
                question_x = min(question_text['bbox'][i] for i in range(0, len(question_text['bbox']), 2))
                
                # Increase tolerance for larger images (1190x1684)
                # Also check X position - allow labels slightly to the left (OCR positioning error)
                y_tolerance = 60 if question_y_max - question_y > 30 else 40
                x_tolerance = 50  # Allow labels up to 50px to the left
                if question_y - 25 <= label_y <= question_y_max + y_tolerance and label_x > question_x - x_tolerance:
                    # Check if we already have this label type for this question
                    if not any(l['type'] == label_type for l in labels):
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
            logger.debug(f"Question {q_num}: no labels found (domain: {domain})")
            # Debug: log all text items near this question
            question_y = min(question_text['bbox'][i] for i in range(1, len(question_text['bbox']), 2))
            question_y_max = max(question_text['bbox'][i] for i in range(1, len(question_text['bbox']), 2))
            y_tolerance = 60 if question_y_max - question_y > 30 else 40
            nearby_texts = []
            for text_item in page_texts:
                text = text_item['text'].strip()
                label_y = min(text_item['bbox'][i] for i in range(1, len(text_item['bbox']), 2))
                if question_y - 25 <= label_y <= question_y_max + y_tolerance:
                    text_upper = text.upper().strip()
                    text_clean = text_upper.replace('□', '').replace('☐', '').replace('☑', '').replace('☒', '').replace(' ', '').replace('\t', '').strip()
                    nearby_texts.append(f"'{text}' (clean: '{text_clean}')")
            if nearby_texts:
                logger.debug(f"  Nearby texts: {nearby_texts[:10]}")
    
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
    # Start with low confidence threshold to catch all possible detections
    yolo_boxes = detect_checkboxes_yolo(page_image, conf_threshold=0.001)
    
    # If still no detections, try even lower
    if not yolo_boxes:
        logger.debug("No detections at conf=0.001, trying conf=0.0001")
        yolo_boxes = detect_checkboxes_yolo(page_image, conf_threshold=0.0001)
    
    # Filter by minimum confidence after detection
    # Keep only detections with confidence >= 0.01 for final results
    if yolo_boxes:
        filtered_boxes = [b for b in yolo_boxes if b["conf"] >= 0.01]
        if len(filtered_boxes) < len(yolo_boxes):
            logger.debug(f"Filtered {len(yolo_boxes)} detections to {len(filtered_boxes)} with conf >= 0.01")
        yolo_boxes = filtered_boxes
    logger.info(f"YOLO detected {len(yolo_boxes)} checkboxes")
    
    if not yolo_boxes:
        logger.warning(f"No checkboxes detected by YOLO (image_shape: {page_image.shape if page_image is not None else None}), will use OCR fallback parser")
        # Don't return empty - let it fall through to OCR parser
        # But we still need to return something for this function
        # The router will handle fallback
        return {}
    
    # Log checkbox positions for debugging
    for i, box in enumerate(yolo_boxes[:5]):  # Log first 5
        logger.debug(f"  Checkbox {i}: class={box['class']}, bbox=({box['x1']}, {box['y1']}, {box['x2']}, {box['y2']}), conf={box['conf']:.3f}")
    
    # 2. Extract label positions from OCR texts
    labels_positions = extract_labels_from_ocr_texts(page_texts, domain)
    logger.info(f"Extracted {len(labels_positions)} questions with labels (domain: {domain})")
    
    if not labels_positions:
        logger.warning(f"No labels found in OCR texts (domain: {domain}, {len(page_texts)} text items)")
        # Debug: log some OCR texts to see what we're working with
        sample_texts = [t['text'] for t in page_texts[:20]]
        logger.debug(f"Sample OCR texts: {sample_texts}")
        
        # Try without domain constraint
        if domain:
            logger.debug(f"Retrying label extraction without domain constraint...")
            labels_positions_no_domain = extract_labels_from_ocr_texts(page_texts, None)
            if labels_positions_no_domain:
                logger.info(f"Found {len(labels_positions_no_domain)} questions without domain constraint")
                labels_positions = labels_positions_no_domain
            else:
                logger.warning("Still no labels found even without domain constraint")
                return {}
        else:
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
            elif file_name and file_name.lower().endswith('.gif'):
                frames = extract_gif_frames(file_bytes)
                logger.info(f"Extracted {len(frames)} frames from GIF")
                page_images = []
                for f in frames:
                    frame_bytes = f.read() if hasattr(f, 'read') else f
                    nparr = np.frombuffer(frame_bytes, np.uint8)
                    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    if img is not None:
                        page_images.append(img)
            else:
                # Direct image file (PNG, JPG, etc.)
                logger.info(f"Processing direct image file: {file_name}")
                nparr = np.frombuffer(file_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is not None:
                    page_images.append(img)
                    logger.info(f"Decoded image shape: {img.shape}")
                else:
                    logger.warning("Failed to decode image file")
            
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
            logger.debug(f"Page {idx}: using image from file_data extraction")
        else:
            page_image_data = page.get('image')
            if page_image_data is not None:
                logger.debug(f"Page {idx}: using image from page.image (type: {type(page_image_data).__name__})")
                if isinstance(page_image_data, str):
                    # Base64 encoded string
                    import base64
                    img_bytes = base64.b64decode(page_image_data)
                    nparr = np.frombuffer(img_bytes, np.uint8)
                    page_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    if page_image is not None:
                        logger.debug(f"Page {idx}: decoded image from base64, shape: {page_image.shape}")
                elif isinstance(page_image_data, bytes):
                    nparr = np.frombuffer(page_image_data, np.uint8)
                    page_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                elif isinstance(page_image_data, np.ndarray):
                    page_image = page_image_data
                elif isinstance(page_image_data, list):
                    # Convert list to numpy array
                    page_image = np.array(page_image_data, dtype=np.uint8)
            else:
                logger.debug(f"Page {idx}: no image data available")
        
        # Detect domain from texts
        from services.parser_service import detect_domain
        domain = detect_domain(page_texts)
        
        # Parse page
        logger.info(f"Processing page {idx}: domain={domain}, image={'yes' if page_image is not None else 'no'}, {len(page_texts)} OCR texts, {len(question_ids)} question_ids")
        
        page_answers = parse_page_with_yolo(
            page_texts,
            page_image,
            question_ids,
            domain
        )
        
        logger.info(f"Page {idx}: domain={domain}, image={'yes' if page_image is not None else 'no'}, answers={len(page_answers)}: {list(page_answers.keys())[:5] if page_answers else 'none'}")
        
        # Merge answers (later pages override earlier ones)
        all_answers.update(page_answers)
    
    logger.info(f"Total answers parsed: {len(all_answers)}")
    return all_answers

