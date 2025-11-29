# 📄 ASQ-3 YOLO-BASED CHECKBOX PARSER

### **Refactor Specification – Version 1.0**

---

## 0. Introduction

Hệ thống hiện tại thực hiện OCR phiếu ASQ-3 bằng:

* **PaddleOCR** để đọc toàn bộ text
* **Parser heuristic rất dài (>3000 dòng)** để:

  * nhận diện domain
  * nhận diện số câu hỏi
  * xác định checkbox C/Đ/K
  * suy luận dấu X bằng nhiều rule phức tạp

Nhưng mô hình OCR truyền thống gặp vấn đề:

* OCR đọc sai dấu X thành các ký tự như: `区`, `冈`, `凶`, `☑c`, `□c`, `区日`…
* OCR không ổn định với checkbox nhỏ, nghiêng, lệch
* Code parser quá dài → khó bảo trì
* Accuracy chỉ 85–92%, không đạt chuẩn production

## 🎯 **Mục tiêu refactor**

Chuyển toàn bộ hệ thống sang mô hình hiện đại hơn:

```
OCR (text only) + YOLO (detect checkboxes) + Parser V2
```

* PaddleOCR **chỉ** đọc text (domain + câu hỏi), **không** đọc checkbox
* YOLO detect checkbox dạng hình: empty / marked
* YOLO detect label C / D / K
* Parser V2 đơn giản, mạnh mẽ, accuracy ~100%

---

# 1. New Architecture Overview

```
PDF page → Convert to Image
    ├─ PaddleOCR → Extract text boxes
    ├─ YOLO Detector → Detect:
    │      - checkbox_empty
    │      - checkbox_marked
    │      - label_c
    │      - label_d
    │      - label_k
    │      - mark_x
    └─ Parser V2 → map checkbox → Y/S/N → JSON Output
```

---

# 2. YOLO Detection Specification

## 2.1 YOLO Classes

Tạo file:

```
/checkbox_model/classes.txt
```

Nội dung:

```
checkbox_empty
checkbox_marked
label_c
label_d
label_k
mark_x
```

## 2.2 YOLO Output Format

Mỗi detection gồm:

* class_name
* confidence
* bbox `[x1, y1, x2, y2]`

YOLO có thể là: **YOLOv8, YOLOv10, FastSAM hoặc Detectron2**.

---

# 3. Required Data Structures

Tạo file:

```
/parser/structures.py
```

```python
from dataclasses import dataclass
from typing import List

@dataclass
class OCRBox:
    text: str
    bbox: List[int]
    conf: float
    x: int
    y: int
    w: int
    h: int

@dataclass
class YOLOBox:
    cls: str
    conf: float
    x1: int
    y1: int
    x2: int
    y2: int

@dataclass
class CheckboxGroup:
    question_num: int
    c_box: YOLOBox
    d_box: YOLOBox
    k_box: YOLOBox

@dataclass
class ParsedAnswer:
    question_id: str
    answer: str  # "Y", "S", "N"
```

---

# 4. Domain Detection (OCR-Based)

Domain keywords map như sau:

| Domain          | Keyword OCR       |
| --------------- | ----------------- |
| communication   | GIAO TIẾP         |
| gross_motor     | VẬN ĐỘNG THÔ      |
| fine_motor      | VẬN ĐỘNG TINH     |
| problem_solving | GIẢI QUYẾT VẤN ĐỀ |
| personal_social | CÁ NHÂN - XÃ HỘI  |
| overall         | TỔNG QUAN         |

File:

```
/parser/domain.py
```

Hàm:

* `normalize_text()`
* `detect_domain(ocr_boxes)`

---

# 5. Question Number Extraction

File:

```
/parser/question_loc.py
```

Rule:

* Match `^\d+\.?`
* Map theo domain:

  * Domains thường: q1–q6
  * Overall: q1–q8

---

# 6. Checkbox Assignment Logic (YOLO-Based)

Đây là trọng tâm Parser V2.

### Với mỗi câu hỏi:

1. Lấy label (label_c/d/k) theo y-range gần câu hỏi
2. Với mỗi label tìm checkbox_empty gần nhất bên trái
3. Kiểm tra xem checkbox đó có mark (mark_x hoặc checkbox_marked) không
4. Mapping:

```
C → Y
D → S
K → N
```

---

# 7. Parser V2 – New Logic

File:

```
/parser/answer_parser.py
```

## 7.1 Bước 1 – Extract labels

```python
labels = [b for b in yolo_boxes if b.cls in ["label_c","label_d","label_k"]]
```

## 7.2 Bước 2 – Extract checkboxes

```python
checkboxes = [b for b in yolo_boxes if b.cls == "checkbox_empty"]
```

## 7.3 Bước 3 – Extract marks

```python
marks = [b for b in yolo_boxes if b.cls in ["mark_x","checkbox_marked"]]
```

## 7.4 Bước 4 – Group thành CheckboxGroup

Cursor phải tạo hàm:

```python
def build_checkbox_group(question_y, labels, checkboxes) -> CheckboxGroup:
```

## 7.5 Bước 5 – Detect answer

```python
def detect_answer(group: CheckboxGroup, marks):
    # detect mark inside c_box/d_box/k_box
```

Rules đơn giản:

* Nếu mark nằm trong bbox → đó là lựa chọn
* Nếu có nhiều mark → chọn mark có IoU lớn nhất

---

# 8. Scoring System (Optional but Recommended)

File:

```
/parser/scoring.py
```

Weight:

* IoU weight: 0.6
* Distance weight: 0.3
* Confidence weight: 0.1

---

# 9. Visualization Tool

File:

```
/utils/visualize.py
```

```python
def draw_debug(image, ocr_boxes, yolo_boxes, answers, out_path):
    # blue → checkbox_empty
    # green → checkbox_marked
    # yellow → labels C/D/K
    # red → mark_x
    # purple → matched checkbox
```

---

# 10. Full Processing Pipeline

File:

```
/pipeline/process_page.py
```

Pseudocode:

```python
def process_page(image):
    ocr_boxes = run_paddleocr(image)
    yolo_boxes = run_yolo(image)

    domain = detect_domain(ocr_boxes)
    question_nums = detect_question_numbers(ocr_boxes, domain)

    groups = build_groups_for_questions(question_nums, yolo_boxes)

    answers = {}
    for q in question_nums:
        answers[f"{domain}_q{q}"] = detect_answer(groups[q], yolo_boxes)

    return answers
```

File:

```
/pipeline/process_document.py
```

* Loop tất cả trang
* Merge kết quả
* Trả JSON

---

# 11. API Specification (Không thay đổi)

Hàm xuất ra:

```json
{
  "communication_q1": "Y",
  "communication_q2": "S",
  ...
}
```

API không thay đổi input/output.

---

# 12. Requirements for Cursor

Cursor cần:

* Tạo toàn bộ module theo cấu trúc mới
* Chuyển toàn bộ logic checkbox sang YOLO
* Xóa toàn bộ heuristic cũ (>3000 dòng)
* Viết code sạch, nhiều comment, type-hint đầy đủ
* Dễ debug
* Tối ưu độ chính xác → gần 100%
* Không thay đổi format JSON output

---

# 13. Prompt cho Cursor (copy & dán)

```
Refactor toàn bộ dự án ASQ-3 OCR theo tài liệu 
“ASQ-3 YOLO-BASED CHECKBOX PARSER – REFACTOR SPECIFICATION”.

- Tạo cấu trúc module mới
- PaddleOCR chỉ đọc text (không xử lý checkbox)
- YOLO detect checkbox và mark
- Parser V2 chỉ dựa trên YOLO
- Xóa toàn bộ heuristic OCR checkbox cũ
- Giữ nguyên API JSON output
- Tạo debug visualization
- Code sạch, gọn, comment đầy đủ
```

---

# 14. Kết luận

Tài liệu này mô tả đầy đủ:

* Kiến trúc mới
* Danh sách file
* Logic parser
* Định nghĩa model YOLO
* Cách grouping checkbox
* Debug visualization
* Cách refactor bằng Cursor

Hoàn toàn sẵn sàng để Cursor refactor code dự án ASQ-3 lên pipeline hiện đại và ổn định hơn.


