# Hướng dẫn Train YOLO Model

## Vấn đề: "Killed" khi train

Khi bị "Killed", thường do thiếu RAM. Hệ thống của bạn có **5.6GB RAM** và đã dùng hết swap.

## Giải pháp: Train với cấu hình cực kỳ nhẹ

### Option 1: Ultra Light (Khuyến nghị cho hệ thống ít RAM)

```bash
python3 train_yolo_ultra_light.py
```

**Cấu hình:**
- Image size: **640** (nhỏ nhất)
- Batch size: **2** (cực kỳ nhẹ)
- Epochs: **30** (test nhanh)
- Cache: **False** (tiết kiệm RAM)
- Workers: **0** (không dùng multiprocessing)

**Thời gian:** ~1-2 giờ (tùy CPU)

### Option 2: Light Mode

```bash
python3 train_yolo_light.py
```

**Cấu hình:**
- Image size: **1280**
- Batch size: **8**
- Epochs: **50**

**Lưu ý:** Có thể vẫn bị "Killed" nếu RAM không đủ.

### Option 3: Normal Mode (chỉ dùng nếu có GPU hoặc RAM > 8GB)

```bash
python3 train_yolo.py
```

## Sau khi train xong

Model sẽ được lưu tại:
- `checkbox_model/best.pt` - Model tốt nhất
- `checkbox_model/asq3_checkbox/` - Thư mục chứa logs, plots

## Tips để giảm RAM usage

1. **Đóng các ứng dụng khác** trước khi train
2. **Giảm batch size** xuống 1 nếu vẫn bị "Killed"
3. **Giảm image size** xuống 640 (minimum)
4. **Tăng swap space** (nếu có thể)

## Kiểm tra tiến trình

Sau khi train bắt đầu, bạn sẽ thấy:
```
Epoch    GPU_mem   box_loss   cls_loss   dfl_loss  Instances       Size
  1/30       ...        ...        ...        ...        ...      640
```

Nếu bị "Killed" ngay lập tức, hãy thử:
- Batch size = 1
- Image size = 640
- Cache = False

