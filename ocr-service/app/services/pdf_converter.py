import fitz
from typing import List
import io
from PIL import Image
import logging

logger = logging.getLogger(__name__)


def pdf_to_images(pdf_bytes: bytes) -> List[Image.Image]:
    try:
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        images: List[Image.Image] = []
        
        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            images.append(img)
            logger.debug(f"Converted PDF page {page_num + 1} to image: {img.size}")
        
        pdf_document.close()
        logger.info(f"Converted PDF to {len(images)} images")
        return images
        
    except Exception as e:
        logger.error(f"Error converting PDF to images: {e}")
        raise


def image_bytes_to_pil(image_bytes: bytes) -> Image.Image:
    try:
        img = Image.open(io.BytesIO(image_bytes))
        logger.debug(f"Loaded image: {img.size}, format: {img.format}")
        return img
    except Exception as e:
        logger.error(f"Error loading image: {e}")
        raise

