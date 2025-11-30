import io
import os
import re
import tempfile
import logging
import threading
import base64
import warnings
from typing import List, Dict, Any, Optional
import numpy as np
import cv2
from PIL import Image
import fitz
from paddleocr import PaddleOCR

logger = logging.getLogger(__name__)

# Suppress PaddleOCR verbose logs and warnings
logging.getLogger("paddle").setLevel(logging.ERROR)
logging.getLogger("paddlex").setLevel(logging.ERROR)
warnings.filterwarnings("ignore", category=UserWarning, module="paddle")
warnings.filterwarnings("ignore", message=".*ccache.*")

_ocr_engine: Optional[PaddleOCR] = None
_ocr_lock = threading.Lock()


def get_ocr_engine() -> PaddleOCR:
    global _ocr_engine
    if _ocr_engine is None:
        with _ocr_lock:
            if _ocr_engine is None:
                logger.info("Initializing PaddleOCR...")
                try:
                    # Suppress PaddleOCR verbose output during initialization
                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore")
                        _ocr_engine = PaddleOCR(use_angle_cls=True, lang='ch')
                except Exception as e:
                    logger.warning(f"Failed to init with use_angle_cls: {e}, trying without")
                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore")
                        _ocr_engine = PaddleOCR(lang='ch')
                logger.info("PaddleOCR initialized")
    return _ocr_engine


def extract_pdf_pages(data: bytes) -> List[bytes]:
    pages = []
    try:
        pdf_doc = fitz.open(stream=data, filetype="pdf")
        total_pages = pdf_doc.page_count
        logger.info(f"PDF has {total_pages} pages")
        
        for page_num in range(total_pages):
            page = pdf_doc[page_num]
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img_bytes = pix.tobytes("png")
            pages.append(img_bytes)
            logger.info(f"Extracted page {page_num + 1}/{total_pages}")
        
        pdf_doc.close()
    except Exception as e:
        logger.error(f"Error extracting PDF pages: {e}", exc_info=True)
        raise
    
    return pages if pages else [data]


def extract_gif_frames(data: bytes) -> List[bytes]:
    frames = []
    try:
        img_bytes_io = io.BytesIO(data)
        img_bytes_io.seek(0)
        img = Image.open(img_bytes_io)
        
        if img.format != 'GIF':
            buf = io.BytesIO()
            img = img.convert('RGB')
            img.save(buf, format='PNG')
            buf.seek(0)
            return [buf.getvalue()]
        
        i = 0
        while True:
            try:
                img.seek(i)
                frame = img.convert('RGB')
                buf = io.BytesIO()
                frame.save(buf, format='PNG')
                buf.seek(0)
                frames.append(buf.getvalue())
                i += 1
            except EOFError:
                break
    except Exception as e:
        logger.error(f"Error extracting GIF frames: {e}")
        return [data]
    
    return frames if frames else [data]


def deduplicate_frames(frames: List[bytes], threshold: float = 0.95) -> List[bytes]:
    if len(frames) <= 1:
        return frames
    
    try:
        from skimage.metrics import structural_similarity as ssim
    except ImportError:
        logger.warning("scikit-image not available, skipping frame deduplication")
        return frames
    
    unique_frames = [frames[0]]
    
    for i in range(1, len(frames)):
        try:
            img1 = Image.open(io.BytesIO(unique_frames[-1]))
            img2 = Image.open(io.BytesIO(frames[i]))
            
            img1 = img1.resize((200, 200))
            img2 = img2.resize((200, 200))
            
            img1_arr = np.array(img1.convert('L'))
            img2_arr = np.array(img2.convert('L'))
            
            similarity = ssim(img1_arr, img2_arr)
            
            if similarity < threshold:
                unique_frames.append(frames[i])
        except Exception as e:
            logger.warning(f"Error comparing frames: {e}, keeping frame")
            unique_frames.append(frames[i])
    
    return unique_frames


def process_image_bytes(data: bytes, frame_index: int = 0) -> Dict[str, Any]:
    if isinstance(data, io.BytesIO):
        data.seek(0)
        data = data.read()
    
    if not data or len(data) == 0:
        raise ValueError("Image data is empty")
    
    if not isinstance(data, bytes):
        data = bytes(data)
    
    img_bytes_io = io.BytesIO(data)
    img_bytes_io.seek(0)
    img = Image.open(img_bytes_io)
    img = img.convert('RGB')
    
    img_width, img_height = img.size
    
    img_np = np.array(img)
    img_cv2 = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    
    ocr = get_ocr_engine()
    if ocr is None:
        raise RuntimeError("PaddleOCR engine not initialized")
    
    texts = []
    tmp_path = None
    
    try:
        result = ocr.ocr(img_cv2)
    except Exception as e:
        logger.debug(f"Direct OCR failed, using temp file: {e}")
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
            tmp_path = tmp_file.name
            cv2.imwrite(tmp_path, img_cv2)
        result = ocr.ocr(tmp_path)
    
    try:
        if not result:
            logger.warning("PaddleOCR returned None or empty result")
        elif isinstance(result, list) and len(result) > 0:
            ocr_result = result[0]
            
            rec_texts = ocr_result.get('rec_texts', [])
            rec_scores = ocr_result.get('rec_scores', [])
            
            bboxes = None
            if ocr_result.get('rec_polys'):
                bboxes = ocr_result.get('rec_polys')
            elif ocr_result.get('rec_boxes') is not None:
                bboxes = ocr_result.get('rec_boxes')
            elif ocr_result.get('dt_polys'):
                bboxes = ocr_result.get('dt_polys')
            
            for idx, text in enumerate(rec_texts):
                try:
                    if not text or text.strip() == '':
                        continue
                    
                    conf = float(rec_scores[idx]) if idx < len(rec_scores) else 1.0
                    
                    bbox_flat = []
                    if bboxes is not None and idx < len(bboxes):
                        bbox = bboxes[idx]
                        if hasattr(bbox, 'tolist'):
                            bbox = bbox.tolist()
                        
                        if isinstance(bbox, (list, tuple)) and len(bbox) > 0:
                            for point in bbox:
                                if isinstance(point, (list, tuple)) and len(point) >= 2:
                                    bbox_flat.extend([int(float(point[0])), int(float(point[1]))])
                        elif isinstance(bbox, np.ndarray):
                            if bbox.ndim == 1:
                                bbox_flat = [int(float(x)) for x in bbox]
                            elif bbox.ndim == 2:
                                for point in bbox:
                                    if len(point) >= 2:
                                        bbox_flat.extend([int(float(point[0])), int(float(point[1]))])
                    
                    if text and bbox_flat:
                        texts.append({
                            'text': text,
                            'bbox': bbox_flat,
                            'conf': conf,
                        })
                except Exception as e:
                    logger.error(f"Error processing text {idx}: {e}", exc_info=True)
                    continue
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except:
                pass
    
    question_numbers = set()
    for text_item in texts:
        text = text_item['text'].strip()
        match = re.match(r'^(\d+)\.?', text)
        if match:
            num = int(match.group(1))
            if 1 <= num <= 6:
                question_numbers.add(num)
    
    result = {
        'frame_index': frame_index,
        'width': img_width,
        'height': img_height,
        'texts': texts,
        'question_numbers': sorted(list(question_numbers)),
    }
    
    return result


def recognize_file(content: bytes, filename: str) -> Dict[str, Any]:
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.pdf'):
        logger.info("Processing PDF file...")
        frames = extract_pdf_pages(content)
        unique_frames = frames
    else:
        frames = extract_gif_frames(content)
        unique_frames = deduplicate_frames(frames, threshold=0.95)
    
    pages = []
    all_texts = []
    
    for idx, frame_bytes in enumerate(unique_frames):
        if isinstance(frame_bytes, io.BytesIO):
            frame_bytes.seek(0)
            frame_bytes = frame_bytes.read()
        elif not isinstance(frame_bytes, bytes):
            frame_bytes = bytes(frame_bytes)
        
        page_result = process_image_bytes(frame_bytes, frame_index=idx)
        if 'image' in page_result:
            del page_result['image']
        pages.append(page_result)
        
        for text_item in page_result.get('texts', []):
            all_texts.append(text_item['text'])
    
    full_text = '\n'.join(all_texts)
    
    all_confs = []
    for page in pages:
        if page:
            for text_item in page.get('texts', []):
                all_confs.append(text_item.get('conf', 0))
    
    avg_confidence = sum(all_confs) / len(all_confs) if all_confs else 0.0
    
    file_data_b64 = base64.b64encode(content).decode('utf-8') if content else None
    
    return {
        'status': 'ok',
        'pages': pages,
        'full_text': full_text,
        'confidence': avg_confidence,
        'total_frames': len(unique_frames),
        'file_data': file_data_b64,  
        'file_name': filename,
    }

