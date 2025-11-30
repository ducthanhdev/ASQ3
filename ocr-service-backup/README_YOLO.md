# YOLO-Based Parser V2

## Overview

This is the new YOLO-based parser for ASQ-3 questionnaire parsing. It replaces the old heuristic-based parser (>3000 lines) with a cleaner, more accurate approach using YOLO object detection.

## Architecture

```
PDF/Image → PaddleOCR (text only) + YOLO (checkbox detection) → Parser V2 → JSON Output
```

## Components

### 1. Parser Module (`parser/`)
- `structures.py`: Data structures (OCRBox, YOLOBox, CheckboxGroup, ParsedAnswer)
- `domain.py`: Domain detection from OCR text
- `question_loc.py`: Question number extraction
- `answer_parser.py`: Parser V2 logic for answer detection

### 2. Pipeline Module (`pipeline/`)
- `process_page.py`: Process a single page
- `process_document.py`: Process entire document

### 3. Utils Module (`utils/`)
- `yolo_detector.py`: YOLO detector wrapper
- `visualize.py`: Debug visualization tool

### 4. YOLO Model (`checkbox_model/`)
- `classes.txt`: YOLO class definitions
- Model file (`.pt`) should be placed here

## YOLO Classes

The YOLO model detects 6 classes:
1. `checkbox_empty` - Empty checkbox box
2. `checkbox_marked` - Checkbox with mark inside
3. `label_c` - Label "C" (Có)
4. `label_d` - Label "Đ" (Đôi khi)
5. `label_k` - Label "K" (Không)
6. `mark_x` - Mark "X" symbol

## Usage

### Basic Usage

```python
from services.yolo_parser_service import parse_answers_with_yolo

# Parse with YOLO
answers = parse_answers_with_yolo(
    pages=ocr_pages,
    question_ids=question_ids,
    yolo_model_path="checkbox_model/best.pt"  # Optional
)
```

### Integration with Existing API

The YOLO parser can be used as a drop-in replacement for the old parser. The API format remains the same:

```json
{
  "communication_q1": "Y",
  "communication_q2": "S",
  ...
}
```

## Model Training

To train a YOLO model:

1. Prepare dataset with labeled checkboxes, labels, and marks
2. Use YOLOv8 or YOLOv10 for training
3. Save model as `checkbox_model/best.pt`
4. The detector will automatically load it

## Fallback Behavior

If YOLO model is not available, the system will:
- Log a warning
- Return empty answers (or fallback to old parser if configured)

## Debug Visualization

Use the visualization tool to debug parsing:

```python
from utils.visualize import draw_debug

draw_debug(
    image=page_image,
    ocr_boxes=ocr_boxes,
    yolo_boxes=yolo_detections,
    answers=parsed_answers,
    out_path="debug.png"
)
```

## Migration Notes

- Old parser (`services/parser_service.py`) is still available for backward compatibility
- New parser is in `services/yolo_parser_service.py`
- Both can coexist during migration period
- API format remains unchanged

