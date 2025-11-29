# Model Storage Guide

## 📦 Model Files

Model đã train được lưu tại:
- `ocr-service/checkbox_model/best.pt` (6MB) - Model tốt nhất
- `ocr-service/checkbox_model/asq3_checkbox/weights/best.pt` (6MB)
- `ocr-service/checkbox_model/asq3_checkbox/weights/last.pt` (6MB)

**Tổng kích thước: ~59MB**

## 🚫 Tại sao không push lên Git?

1. **File quá lớn**: Git không phù hợp cho file >50MB
2. **Làm chậm repo**: Clone/pull sẽ rất chậm
3. **Không cần thiết**: Model có thể tái tạo bằng cách train lại

## ✅ Giải pháp

### Option 1: Git LFS (Nếu muốn push lên Git)
```bash
# Install Git LFS
git lfs install

# Track model files
git lfs track "*.pt"
git lfs track "ocr-service/checkbox_model/**/*.pt"

# Add và commit
git add .gitattributes
git add ocr-service/checkbox_model/best.pt
git commit -m "Add model with Git LFS"
```

### Option 2: Lưu ở nơi khác (Khuyến nghị)
1. **Google Drive / Dropbox**: Upload model files
2. **Cloud Storage**: AWS S3, Google Cloud Storage
3. **Release trên GitHub**: Tạo GitHub Release và attach model files
4. **Private storage**: Lưu trong team drive

### Option 3: Chỉ lưu best.pt (Nhẹ nhất)
```bash
# Chỉ giữ best.pt (6MB), xóa các file khác
rm -rf ocr-service/checkbox_model/asq3_checkbox/
rm -rf ocr-service/checkbox_model/asq3_checkbox_finetune/
# Giữ lại: ocr-service/checkbox_model/best.pt
```

## 🔄 Khi clone lại ở máy khác

### Nếu có model file:
1. Download model từ nơi lưu trữ
2. Đặt vào `ocr-service/checkbox_model/best.pt`
3. **Không cần train lại** ✅

### Nếu không có model file:
1. Chạy training script:
   ```bash
   cd ocr-service
   python3 train_yolo_quick.py
   ```
2. Sẽ mất thời gian train (vài giờ tùy GPU/CPU)

## 📝 Best Practice

1. **Luôn backup model** sau khi train xong
2. **Document model version** trong README
3. **Lưu model ở nơi dễ truy cập** cho team
4. **Không commit model vào git** (dùng .gitignore)

## 🎯 Khuyến nghị

**Nếu team nhỏ (<5 người):**
- Upload `best.pt` lên Google Drive/Dropbox
- Share link trong README hoặc team chat

**Nếu team lớn hoặc public repo:**
- Dùng Git LFS hoặc GitHub Releases
- Hoặc cloud storage (S3, GCS)
