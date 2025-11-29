# Test YOLO Integration - Frontend

## ✅ Status: Sẵn sàng test

Frontend đã có đầy đủ code để test YOLO parser integration.

## 📋 Flow

```
Frontend (ScanAssessment.tsx)
  ↓ Upload file
Backend (/api/ocr/recognize)
  ↓ Gọi Python OCR service
Python OCR Service (recognize_file)
  ↓ Trả về pages với image data
Backend (lưu OCR result)
  ↓
Frontend (click "Parse Answers")
  ↓ Gọi /api/ocr/parse
Backend (parseOcrToAnswers)
  ↓ Gọi Python service /parse
Python OCR Service (yolo_checkbox_parser)
  ↓ YOLO detect checkboxes + PaddleOCR detect labels
  ↓ Merge → Parse answers (Y/S/N)
Backend (trả về answers)
  ↓
Frontend (hiển thị parsed answers)
```

## 🧪 Cách test

### 1. Start services

**Backend:**
```bash
cd backend
npm run start:dev
```

**Python OCR Service:**
```bash
cd ocr-service
python3 -m uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 2. Test flow

1. Mở frontend: `http://localhost:3000/scan-assessment?childId=1&questionnaireVersionId=5`
2. Upload file PDF hoặc image (ASQ-3 questionnaire)
3. Click "Upload và OCR" → Đợi OCR hoàn thành
4. Click "Parse Answers" → **YOLO parser sẽ được gọi tự động**
5. Xem kết quả parsed answers (Y/S/N)
6. Click "Create Assessment" để tạo assessment

## 🔍 Kiểm tra YOLO parser hoạt động

### Logs để xem:

**Backend logs:**
```
Successfully parsed X answers using YOLO parser
```

**Python service logs:**
```
YOLO detected N checkboxes
Parsed M answers
```

### Nếu YOLO parser fail:

Backend tự động fallback về OCR parser cũ:
```
YOLO parser failed: ..., falling back to OCR parser
```

## 📊 Expected results

- **YOLO parser**: Confidence cao hơn, ít false positives
- **Answers format**: `{"communication_q1": "Y", "gross_motor_q2": "S", ...}`
- **Response time**: ~2-5 giây (tùy image size)

## ⚠️ Lưu ý

- YOLO model cần ở: `ocr-service/checkbox_model/best.pt`
- Nếu model không có, sẽ fallback về OCR parser
- Confidence threshold hiện tại: 0.01 (có thể điều chỉnh)

