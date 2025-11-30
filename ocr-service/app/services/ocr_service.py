import base64
import logging
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image
import google.generativeai as genai

from app.services.gemini_ocr import get_ocr_service
from app.services.pdf_converter import pdf_to_images, image_bytes_to_pil
from app.services.utils import validate_question_ids
from app.schemas import OcrPage, OcrTextItem

logger = logging.getLogger(__name__)


class OCRService:
    def __init__(self):
        self.gemini_service = get_ocr_service()

    def extract_images(
        self,
        file_data: Optional[str] = None,
        file_name: Optional[str] = None,
        pages: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Image.Image]:
        images: List[Image.Image] = []

        if file_data:
            try:
                file_bytes = base64.b64decode(file_data)
                if file_name and file_name.lower().endswith('.pdf'):
                    images = pdf_to_images(file_bytes)
                else:
                    images = [image_bytes_to_pil(file_bytes)]
            except Exception as e:
                logger.error(f"Error processing file_data: {e}")
                raise ValueError(f"Invalid file_data: {e}")

        if pages:
            for page in pages:
                page_image = page.get('image')
                if page_image:
                    try:
                        img_bytes = base64.b64decode(page_image)
                        images.append(image_bytes_to_pil(img_bytes))
                    except Exception as e:
                        logger.warning(f"Failed to decode page.image: {e}")

        if not images:
            raise ValueError("No images found. Provide either file_data or pages with image data")

        return images

    def parse_answers(
        self,
        images: List[Image.Image],
        question_ids: List[str],
    ) -> Dict[str, str]:
        answers = self.gemini_service.parse_images_with_fallback(images, question_ids)
        return validate_question_ids(question_ids, answers)

    def extract_text_from_image(self, image: Image.Image, model_name: str) -> Tuple[str, List[OcrTextItem]]:
        model = genai.GenerativeModel(model_name)
        prompt = "Extract all text from this image. Return the text as plain text, preserving line breaks and structure. Do not parse or interpret, just extract the visible text."
        
        response = model.generate_content([prompt, image])
        
        if not response.text:
            return "", []

        text = response.text.strip()
        width, height = image.size
        
        text_items = []
        for line in text.split('\n'):
            if line.strip():
                text_items.append(OcrTextItem(
                    text=line.strip(),
                    bbox=[0, 0, width, height],
                    conf=0.95
                ))

        return text, text_items

    def recognize_file(
        self,
        file_bytes: bytes,
        file_name: str,
    ) -> Tuple[List[OcrPage], str, float, int]:
        images: List[Image.Image] = []
        
        if file_name.lower().endswith('.pdf'):
            images = pdf_to_images(file_bytes)
        else:
            images = [image_bytes_to_pil(file_bytes)]

        pages_data: List[OcrPage] = []
        all_texts: List[str] = []
        total_conf = 0.0
        conf_count = 0

        for idx, img in enumerate(images):
            try:
                text, text_items = self.extract_text_from_image(img, self.gemini_service.default_model)
                if text:
                    all_texts.append(text)
                    conf_count += len(text_items)
                    total_conf += sum(item.conf for item in text_items)

                pages_data.append(OcrPage(
                    frame_index=idx,
                    width=img.size[0],
                    height=img.size[1],
                    texts=text_items,
                    question_numbers=[],
                ))
            except Exception as e:
                logger.warning(f"Error extracting text from page {idx}: {e}")
                pages_data.append(OcrPage(
                    frame_index=idx,
                    width=img.size[0],
                    height=img.size[1],
                    texts=[],
                    question_numbers=[],
                ))

        full_text = "\n\n".join(all_texts)
        avg_confidence = total_conf / conf_count if conf_count > 0 else 0.0

        return pages_data, full_text, avg_confidence, len(images)

