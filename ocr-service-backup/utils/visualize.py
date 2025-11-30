"""
Visualization tool for debugging ASQ-3 parsing.
"""
import logging
from typing import List, Optional
from PIL import Image, ImageDraw, ImageFont
import numpy as np

from parser.structures import OCRBox, YOLOBox, CheckboxGroup, ParsedAnswer

logger = logging.getLogger(__name__)

# Color scheme
COLORS = {
    'checkbox_empty': (0, 0, 255),      # Blue
    'checkbox_marked': (0, 255, 0),    # Green
    'label_c': (255, 255, 0),          # Yellow
    'label_d': (255, 255, 0),          # Yellow
    'label_k': (255, 255, 0),          # Yellow
    'mark_x': (255, 0, 0),              # Red
    'matched_checkbox': (255, 0, 255),  # Purple
    'question_text': (0, 255, 255),     # Cyan
}


def draw_debug(
    image: Image.Image,
    ocr_boxes: List[OCRBox],
    yolo_boxes: List[YOLOBox],
    answers: List[ParsedAnswer],
    checkbox_groups: Optional[List[CheckboxGroup]] = None,
    out_path: str = "debug_output.png"
) -> Image.Image:
    """
    Draw debug visualization with OCR boxes, YOLO detections, and answers.
    
    Args:
        image: Input PIL Image
        ocr_boxes: List of OCR text boxes
        yolo_boxes: List of YOLO detections
        answers: List of parsed answers
        checkbox_groups: Optional list of CheckboxGroup objects
        out_path: Output path for saved image
        
    Returns:
        Annotated PIL Image
    """
    # Create a copy for drawing
    img = image.copy()
    draw = ImageDraw.Draw(img)
    
    try:
        # Try to load a font
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
    except:
        try:
            font = ImageFont.truetype("arial.ttf", 12)
        except:
            font = ImageFont.load_default()
    
    # Draw OCR boxes (cyan for question numbers)
    import re
    for box in ocr_boxes:
        if re.match(r'^\d+\.?', box.text.strip()):
            # Question number
            bbox = box.bbox
            if len(bbox) >= 8:
                points = [
                    (bbox[0], bbox[1]),
                    (bbox[2], bbox[3]),
                    (bbox[4], bbox[5]),
                    (bbox[6], bbox[7])
                ]
                draw.polygon(points, outline=COLORS['question_text'], width=2)
                draw.text((bbox[0], bbox[1] - 15), box.text, fill=COLORS['question_text'], font=font)
    
    # Draw YOLO boxes
    for yolo_box in yolo_boxes:
        color = COLORS.get(yolo_box.cls, (128, 128, 128))
        
        # Draw rectangle
        draw.rectangle(
            [(yolo_box.x1, yolo_box.y1), (yolo_box.x2, yolo_box.y2)],
            outline=color,
            width=2
        )
        
        # Draw label
        label = f"{yolo_box.cls} ({yolo_box.conf:.2f})"
        draw.text(
            (yolo_box.x1, yolo_box.y1 - 15),
            label,
            fill=color,
            font=font
        )
    
    # Draw checkbox groups
    if checkbox_groups:
        for group in checkbox_groups:
            # Draw matched checkboxes in purple
            for cb in group.get_all_boxes():
                draw.rectangle(
                    [(cb.x1, cb.y1), (cb.x2, cb.y2)],
                    outline=COLORS['matched_checkbox'],
                    width=3
                )
    
    # Draw answers as text overlay
    answer_text = "\n".join([f"{a.question_id}: {a.answer}" for a in answers])
    if answer_text:
        # Draw semi-transparent background
        text_bbox = draw.textbbox((10, 10), answer_text, font=font)
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rectangle(
            [(text_bbox[0] - 5, text_bbox[1] - 5), (text_bbox[2] + 5, text_bbox[3] + 5)],
            fill=(0, 0, 0, 180)
        )
        img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
        draw = ImageDraw.Draw(img)
        draw.text((10, 10), answer_text, fill=(255, 255, 255), font=font)
    
    # Save image
    img.save(out_path)
    logger.info(f"Debug visualization saved to {out_path}")
    
    return img

