# ASQ-3 OCR Service

FastAPI service sử dụng Google Gemini Vision để trích xuất dữ liệu từ phiếu ASQ-3 đã điền tay. Không cần train mô hình, không dùng PaddleOCR/YOLO.

## Setup từ đầu

### 1. Clone repository

```bash
git clone <repository-url>
cd ASQ3/ocr-service
```

### 2. Tạo virtual environment (khuyến nghị)

```bash
python3 -m venv venv

# Linux/Mac
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Environment variables

Tạo file `.env` trong thư mục `ocr-service/`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**Lấy API key:**
- Truy cập: https://makersuite.google.com/app/apikey
- Tạo API key mới
- Copy vào file `.env`

### 5. Start service

```bash
# Development mode (auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Hoặc sử dụng script
chmod +x run.sh
./run.sh
```

Service sẽ chạy tại: `http://localhost:8000`

## Tech Stack

- **FastAPI** - Python web framework
- **Google Gemini Vision** - LLM Vision models cho OCR
- **PyMuPDF** - PDF to image converter
- **Pillow** - Image processing
- **Uvicorn** - ASGI server

## Project Structure

```
ocr-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── schemas.py           # Pydantic models
│   ├── routers/
│   │   ├── __init__.py
│   │   └── ocr_router.py    # OCR endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── gemini_ocr.py    # Gemini Vision OCR service
│   │   ├── pdf_converter.py # PDF to image converter
│   │   └── utils.py         # Utility functions
│   └── config/
│       ├── __init__.py
│       └── models.py        # Model configuration
├── checkbox_model/          # Model files (if any)
├── requirements.txt         # Python dependencies
├── run.sh                  # Startup script
├── .env                    # Environment variables (create this)
└── README.md
```

## API Endpoints

### POST `/ocr/parse`

Parse ASQ-3 form sử dụng Gemini Vision OCR.

**Request Body (JSON):**
```json
{
  "pages": [...],  // Optional: OCR results từ /recognize
  "question_ids": ["communication_q1", "communication_q2", ...],
  "file_data": "base64_encoded_file",  // Optional: PDF hoặc image (base64)
  "file_name": "form.pdf"  // Optional: tên file (để detect type)
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
curl -X POST http://localhost:8000/ocr/parse \
  -H "Content-Type: application/json" \
  -d '{
    "question_ids": ["communication_q1", "communication_q2"],
    "file_data": "iVBORw0KGgoAAAANS...",
    "file_name": "asq3_form.pdf"
  }'
```

### POST `/ocr/recognize`

Legacy endpoint cho compatibility với NestJS backend. Trả về minimal response vì Gemini Vision không cần separate text recognition.

**Request:**
- Multipart form data với file upload

**Response:**
```json
{
  "status": "ok",
  "result": {
    "status": "ok",
    "pages": [...],
    "full_text": "...",
    "confidence": 0.99,
    "total_frames": 1
  },
  "ocrResultId": 123,
  "fileId": 456
}
```

### GET `/ocr/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "gemini-ocr"
}
```

## Gemini Models

Service sử dụng fallback đa mô hình theo thứ tự:

1. `gemini-2.5-pro` - Độ chính xác cao nhất (99-100%)
2. `gemini-2.5-flash` - Cân bằng tốc độ và độ chính xác (97-99%)
3. `gemini-2.0-flash` - Nhanh hơn (95-97%)
4. `gemini-2.5-flash-lite` - Nhanh nhất

## ASQ-3 Domain Mapping

- **Communication**: `communication_q1` → `communication_q6`
- **Gross Motor**: `gross_motor_q1` → `gross_motor_q6`
- **Fine Motor**: `fine_motor_q1` → `fine_motor_q6`
- **Problem Solving**: `problem_solving_q1` → `problem_solving_q6`
- **Personal Social**: `personal_social_q1` → `personal_social_q6`
- **Overall**: `overall_q1` → `overall_q8`

**Checkbox Mapping:**
- `C` (Có) → `Y` (Yes)
- `D` (Đôi khi) → `S` (Sometimes)
- `K` (Không) → `N` (No)

## OCR Prompt

Service sử dụng prompt được tối ưu cho Gemini Vision:

```
You are an OCR + Checkbox Reasoning Assistant.
Rules:
- C = Y (Có = Yes)
- D = S (Đôi khi = Sometimes)
- K = N (Không = No)
- Return ONLY JSON.
```

## Accuracy

| Model | Accuracy | Speed |
|-------|----------|-------|
| gemini-2.5-pro | 99-100% | Chậm |
| gemini-2.5-flash | 97-99% | Trung bình |
| gemini-2.0-flash | 95-97% | Nhanh |
| gemini-2.5-flash-lite | 90-95% | Rất nhanh |

## Development

### Run với auto-reload

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Run production

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Test API

```bash
# Health check
curl http://localhost:8000/ocr/health

# Parse form
curl -X POST http://localhost:8000/ocr/parse \
  -H "Content-Type: application/json" \
  -d @test_request.json
```

## Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**Lưu ý:**
- API key bắt buộc phải có
- Không commit file `.env` vào git
- Sử dụng environment variables trong production

## Dependencies

Xem `requirements.txt` để biết danh sách đầy đủ dependencies.

**Main dependencies:**
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `google-generativeai` - Gemini API client
- `PyMuPDF` - PDF processing
- `pillow` - Image processing
- `pydantic` - Data validation
- `python-dotenv` - Environment variables

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8000
npx kill-port 8000

# Or use different port
uvicorn app.main:app --reload --port 8001
```

### Module Not Found
```bash
# Ensure virtual environment is activated
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate      # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

### Gemini API Key Error
- Verify `GEMINI_API_KEY` in `.env`
- Check API key is valid at https://makersuite.google.com/app/apikey
- Ensure API key has proper permissions

### PDF Conversion Error
- Ensure `PyMuPDF` is installed correctly
- Check PDF file is not corrupted
- Verify file format is supported

## Production Deployment

### Using Gunicorn

```bash
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Using Docker (example)

```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## License

Private project
