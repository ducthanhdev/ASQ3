# Cải thiện YOLO Model - Training Guide

## 📊 Tình trạng hiện tại

- **Model đã train**: 50 epochs
- **mAP50**: 0.98752 (rất tốt!)
- **Precision**: 0.99092
- **Recall**: 0.9686
- **Vấn đề**: Confidence khi test thấp (0.054-0.086)

## 🎯 Mục tiêu

Cải thiện confidence của detections để model tự tin hơn khi detect checkboxes và marks.

## 🚀 Các phương pháp cải thiện

### Option 1: Continue Training (Khuyến nghị)

Tiếp tục train từ checkpoint cuối cùng để cải thiện dần:

```bash
python3 train_yolo_continue.py
```

**Ưu điểm:**
- Tiếp tục training curve hiện tại
- Không mất progress đã train
- Tự động resume từ last checkpoint

**Thông số:**
- GPU: 50 epochs thêm, ~45-90 phút
- CPU: 30 epochs thêm, ~2-3 giờ

### Option 2: Fine-tuning với Learning Rate thấp

Fine-tune model với learning rate thấp hơn để cải thiện confidence:

```bash
python3 train_yolo_finetune.py
```

**Ưu điểm:**
- Learning rate thấp (0.0001) giúp fine-tune tốt hơn
- Cải thiện confidence đáng kể
- Giảm false positives

**Thông số:**
- GPU: 100 epochs, learning rate 0.0001, ~1.5-3 giờ
- CPU: 50 epochs, learning rate 0.0001, ~3-4 giờ

### Option 3: Resume từ Last Checkpoint

Nếu training bị dừng giữa chừng:

```bash
python3 resume_training.py
```

## 📈 So sánh kết quả

Sau khi train thêm, test lại model:

```bash
python3 test_yolo_model.py
```

**Kỳ vọng:**
- Confidence tăng từ 0.05-0.08 → 0.3-0.8+
- Số lượng detections tăng
- Ít false positives hơn

## 🔍 Kiểm tra kết quả training

Xem training progress:

```bash
# Xem results
tail -20 checkbox_model/asq3_checkbox/results.csv

# Xem training plots (nếu có)
ls checkbox_model/asq3_checkbox/*.png
```

## 💡 Lưu ý

1. **Backup model cũ**: Script fine-tune tự động backup `best.pt` → `best.pt.backup`
2. **Dừng training**: Có thể dừng bất cứ lúc nào (Ctrl+C) và resume sau
3. **GPU vs CPU**: GPU nhanh hơn ~3-4 lần
4. **Confidence threshold**: Sau khi train, có thể tăng conf threshold từ 0.05 lên 0.2-0.3

## 🎯 Khuyến nghị

**Cho confidence tốt nhất:**
1. Chạy `train_yolo_finetune.py` (fine-tuning với LR thấp)
2. Test với `test_yolo_model.py`
3. Nếu chưa đủ, chạy thêm `train_yolo_continue.py`

**Cho training nhanh:**
1. Chạy `train_yolo_continue.py` (tiếp tục từ checkpoint)
2. Test và đánh giá

## 📝 Next Steps

Sau khi model đạt confidence tốt:
1. Tích hợp vào parser service
2. Test trên nhiều ảnh thực tế
3. So sánh accuracy với parser cũ

