# ASQ3 OCR Service

Python OCR service sử dụng FastAPI + PaddleOCR + YOLO để xử lý scan phiếu đánh giá ASQ3.

## Features

- ✅ Nhận dạng text từ ảnh/GIF/PDF bằng PaddleOCR
- ✅ Phát hiện checkbox bằng YOLO model
- ✅ Xử lý GIF: giải nén frames, loại bỏ trùng lặp
- ✅ Trả về text + bounding boxes + confidence scores
- ✅ Parse answers từ checkbox và OCR text
- ✅ Hỗ trợ tiếng Việt

## 📋 Yêu cầu hệ thống

- Python 3.10+
- pip
- (Tùy chọn) CUDA GPU để tăng tốc độ xử lý

## 🚀 Hướng dẫn cài đặt cho người mới

### Bước 1: Clone repository

```bash
git clone <repository-url>
cd ASQ3/ocr-service
```

### Bước 2: Tạo virtual environment (Khuyến nghị)

```bash
# Tạo virtual environment
python3 -m venv venv

# Kích hoạt virtual environment
# Trên Linux/Mac:
source venv/bin/activate
# Trên Windows:
# venv\Scripts\activate
```

### Bước 3: Cài đặt dependencies

```bash
# Cài đặt tất cả packages cần thiết
pip install -r requirements.txt
```

**Lưu ý:** 
- Quá trình cài đặt có thể mất 5-10 phút
- PaddleOCR và PyTorch là các package lớn
- Nếu có GPU, cài đặt PyTorch với CUDA support (xem [install_pytorch_cuda.sh](install_pytorch_cuda.sh))

### Bước 4: Download YOLO model (Nếu chưa có)

Nếu bạn đã có model file `checkbox_model/best.pt`, bỏ qua bước này.

Nếu chưa có, bạn có 2 lựa chọn:

#### Option A: Download từ nơi lưu trữ (Nhanh nhất)
```bash
# Download best.pt từ Google Drive/Cloud Storage
# Đặt vào: ocr-service/checkbox_model/best.pt
mkdir -p checkbox_model
# Sau đó copy file best.pt vào đây
```

#### Option B: Train model mới (Mất thời gian)
```bash
# Train model từ đầu (mất vài giờ)
python3 train_yolo_quick.py

# Hoặc train nhanh (5 epochs, ~30 phút)
python3 train_yolo_very_quick.py
```

### Bước 5: Chạy service

```bash
# Chạy development server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Hoặc chạy production server
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Service sẽ chạy tại: `http://localhost:8000`

**Lưu ý lần đầu chạy:**
- PaddleOCR sẽ tự động tải model lần đầu (có thể mất 2-5 phút)
- Model sẽ được cache ở `~/.paddlex/` cho các lần chạy sau

### Bước 6: Kiểm tra service

```bash
# Health check
curl http://localhost:8000/health

# Hoặc mở browser: http://localhost:8000/docs
# Để xem API documentation (Swagger UI)
```

## 🐳 Chạy bằng Docker (Tùy chọn)

```bash
# Build image
docker build -t asq3-ocr .

# Run container
docker run -p 8000:8000 asq3-ocr
```

## 📚 API Endpoints

### POST /recognize

Upload file để OCR (PDF/Image/GIF).

**Request:**
```bash
curl -X POST "http://localhost:8000/recognize" \
  -F "file=@your_file.pdf"
```

**Response:**
```json
{
  "status": "ok",
  "pages": [
    {
      "frame_index": 0,
      "width": 1190,
      "height": 1684,
      "texts": [
        {
          "text": "ASQ-3: 6 months",
          "bbox": [476, 7, 737, 12, ...],
          "conf": 0.989
        }
      ],
      "question_numbers": [1, 2, 3, 4, 5, 6]
    }
  ],
  "full_text": "ASQ-3: 6 months\n...",
  "confidence": 0.85,
  "total_frames": 7,
  "file_data": "base64_encoded_file...",
  "file_name": "your_file.pdf"
}
```

### POST /parse

Parse OCR results để extract answers từ checkboxes.

**Request:**
```json
{
  "pages": [...],
  "question_ids": ["communication_q1", "communication_q2", ...],
  "file_data": "base64_encoded_file...",
  "file_name": "your_file.pdf"
}
```

**Response:**
```json
{
  "status": "ok",
  "answers": {
    "communication_q1": "Y",
    "communication_q2": "S",
    "communication_q3": "N"
  },
  "total_parsed": 34,
  "total_questions": 38
}
```

### GET /health

Health check endpoint.

## 🎯 Training Model

Xem chi tiết trong:
- [TRAINING_GUIDE.md](TRAINING_GUIDE.md) - Hướng dẫn training cơ bản
- [TRAINING_IMPROVEMENT.md](TRAINING_IMPROVEMENT.md) - Cải thiện model
- [README_YOLO.md](README_YOLO.md) - Thông tin về YOLO integration

## 🔧 Troubleshooting

### Lỗi: "PaddleOCR model not found"
- Model sẽ tự động download lần đầu, đợi 2-5 phút
- Kiểm tra kết nối internet

### Lỗi: "YOLO model not found"
- Đảm bảo có file `checkbox_model/best.pt`
- Hoặc train model mới bằng `train_yolo_quick.py`

### Lỗi: "CUDA out of memory"
- Giảm batch size trong training script
- Hoặc dùng CPU thay vì GPU

### Service chạy chậm
- Lần đầu chạy sẽ chậm do download models
- Sử dụng GPU để tăng tốc độ
- Tăng số workers: `--workers 4`

## 📝 Environment Variables

- `PYTHONUNBUFFERED=1` - Để log hiển thị ngay lập tức
- `CUDA_VISIBLE_DEVICES=0` - Chỉ định GPU device

## 📦 Project Structure

```
ocr-service/
├── main.py                 # FastAPI app entry point
├── routers/                # API routes
├── services/               # Business logic
│   ├── ocr_service.py     # PaddleOCR service
│   ├── yolo_checkbox_parser.py  # YOLO + OCR parser
│   └── parser_service.py  # Text parser
├── checkbox_model/         # YOLO model files
├── train_yolo*.py          # Training scripts
└── requirements.txt        # Dependencies
```

## 🔗 Liên kết hữu ích

- [PaddleOCR Documentation](https://github.com/PaddlePaddle/PaddleOCR)
- [Ultralytics YOLO](https://docs.ultralytics.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## 📄 License

[Your License Here]
