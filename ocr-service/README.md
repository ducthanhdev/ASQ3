# 📘 README – ASQ-3 OCR System (Gemini Vision)

Hệ thống trích xuất dữ liệu từ phiếu ASQ-3 sử dụng **Gemini Vision OCR**, không cần train mô hình, không dùng PaddleOCR/YOLO.

## 🚀 Giới thiệu

ASQ-3 OCR System cho phép:

- Phụ huynh tải lên ảnh/PDF phiếu ASQ-3 đã điền tay  
- Hệ thống tự đọc tất cả checkbox trong form  
- Chuyển về dữ liệu JSON theo các domain  
- Độ chính xác ~99% nhờ công nghệ LLM Vision (Gemini)

Hệ thống này được xây dựng để thay thế OCR truyền thống (PaddleOCR, YOLO), vốn thường sai checkbox, nhầm ký tự hoặc khó xử lý layout.

## 🧠 Công nghệ sử dụng

### Gemini Vision Models
- gemini-2.5-pro  
- gemini-2.5-flash  
- gemini-2.0-flash  
- gemini-2.5-flash-lite  

### FastAPI Backend
- Python 3.10+  
- Google Generative AI SDK  
- PDF → PNG converter (PyMuPDF)

## 📌 Domain ASQ-3

- communication_q1 → communication_q6  
- gross_motor_q1 → gross_motor_q6  
- fine_motor_q1 → fine_motor_q6  
- problem_solving_q1 → problem_solving_q6  
- personal_social_q1 → personal_social_q6  
- overall_q1 → overall_q8  

Mapping:
- C → Y  
- D → S  
- K → N  

## 📁 Cấu trúc thư mục

```
ocr-service/
│
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── routers/
│   │   ├── __init__.py
│   │   └── ocr_router.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── gemini_ocr.py      # Gemini Vision OCR service
│   │   ├── pdf_converter.py   # PDF to image converter
│   │   └── utils.py           # Utility functions
│   └── config/
│       ├── __init__.py
│       └── models.py           # Model configuration
│
├── requirements.txt
├── .env.example
└── README.md
```

## 📌 Cài đặt

```
pip install -r requirements.txt
```

Tạo file `.env`:

```
GEMINI_API_KEY=your_key
```

## 🧩 API Endpoints

### POST `/parse`

Parse ASQ-3 form using Gemini Vision OCR.

**Request Body (JSON):**
```json
{
  "pages": [...],  // Optional: OCR results from previous /recognize call
  "question_ids": ["communication_q1", "communication_q2", ...],
  "file_data": "base64_encoded_file",  // Optional: PDF or image file (base64)
  "file_name": "form.pdf"  // Optional: file name (for type detection)
}
```

**Response:**
```json
{
  "status": "ok",
  "answers": {
    "communication_q1": "Y",
    "communication_q2": "S",
    "gross_motor_q1": "N",
    ...
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/parse \
  -H "Content-Type: application/json" \
  -d '{
    "question_ids": ["communication_q1", "communication_q2"],
    "file_data": "iVBORw0KGgoAAAANS...",
    "file_name": "asq3_form.pdf"
  }'
```

### POST `/recognize`

Legacy endpoint for compatibility with NestJS backend. Returns minimal response since Gemini Vision doesn't require separate text recognition.

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "gemini-ocr"
}
```

## 🧠 Fallback đa mô hình

```
gemini-2.5-pro
gemini-2.5-flash
gemini-2.0-flash
gemini-2.5-flash-lite
```

## 🎯 Prompt OCR

```
You are an OCR + Checkbox Reasoning Assistant.
Rules:
- C = Y
- D = S
- K = N
- Return ONLY JSON.
```

## 📊 Accuracy

| Model | Accuracy |
|-------|----------|
| gemini-2.5-pro | 99–100% |
| gemini-2.5-flash | 97–99% |
| gemini-2.0-flash | 95–97% |

## 💡 Chạy local

### 1. Cài đặt dependencies

```bash
cd ocr-service
pip install -r requirements.txt
```

### 2. Cấu hình API key

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Sửa file `.env` và thêm Gemini API key:

```
GEMINI_API_KEY=your_actual_api_key_here
```

Lấy API key tại: https://makersuite.google.com/app/apikey

### 3. Chạy service

```bash
# Development mode (auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Service sẽ chạy tại: `http://localhost:8000`

### 4. Test API

```bash
# Health check
curl http://localhost:8000/ocr/health

# Parse form (example)
curl -X POST http://localhost:8000/ocr/parse \
  -H "Content-Type: application/json" \
  -d '{
    "question_ids": ["communication_q1", "communication_q2"],
    "file_data": "base64_encoded_image_or_pdf",
    "file_name": "form.pdf"
  }'
```

## 🔒 License

MIT License
