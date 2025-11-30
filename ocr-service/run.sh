#!/bin/bash

cd "$(dirname "$0")"

if [ ! -f ".env" ]; then
  echo "❌ File .env không tồn tại!"
  echo "Tạo file .env với nội dung:"
  echo "GEMINI_API_KEY=your_api_key_here"
  exit 1
fi

echo "🚀 Starting ASQ-3 OCR Service (Gemini Vision)..."
echo "📍 Service sẽ chạy tại: http://localhost:8000"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

