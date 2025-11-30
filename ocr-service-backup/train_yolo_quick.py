#!/usr/bin/env python3
"""
Quick training script - chỉ train thêm vài epochs để test nhanh.
"""
import os
import sys

try:
    from ultralytics import YOLO
    import torch
except ImportError:
    print("❌ ultralytics or torch not installed.")
    print("   Run: bash install_yolo.sh")
    sys.exit(1)

def main():
    data_yaml = "asq3_real_yolo_dataset/data.yaml"
    best_model = "checkbox_model/best.pt"
    
    if not os.path.exists(data_yaml):
        print(f"❌ Dataset not found: {data_yaml}")
        sys.exit(1)
    
    if not os.path.exists(best_model):
        print(f"❌ Best model not found: {best_model}")
        sys.exit(1)
    
    # Check GPU availability
    use_gpu = torch.cuda.is_available()
    device = 'cuda' if use_gpu else 'cpu'
    
    # Check if we can resume from last checkpoint
    last_checkpoint = "checkbox_model/asq3_checkbox/weights/last.pt"
    can_resume = os.path.exists(last_checkpoint)
    
    if can_resume:
        print("🔄 Resuming from last checkpoint (tiếp tục training)...")
        print(f"📦 From: {last_checkpoint}")
        model = YOLO(last_checkpoint)
        resume = True
    else:
        print("⚡ Quick training - chỉ vài epochs để test nhanh...")
        print(f"📦 Starting from: {best_model}")
        model = YOLO(best_model)
        resume = False
    
    print(f"🖥️  Device: {device.upper()}")
    print()
    
    # Quick training - chỉ 10 epochs mỗi lần
    if use_gpu:
        print("🖼️  Image size: 800")
        if resume:
            print("🔄 Train thêm 10 epochs (tiếp tục)...")
        else:
            print("🔄 Epochs: 10 (quick test)")
        print("📊 Batch size: 4")
        print("⏱️  Estimated time: ~10-15 minutes")
        imgsz = 800
        batch = 4
        epochs = 10
    else:
        print("🖼️  Image size: 640")
        if resume:
            print("🔄 Train thêm 10 epochs (tiếp tục)...")
        else:
            print("🔄 Epochs: 10 (quick test)")
        print("📊 Batch size: 2")
        print("⏱️  Estimated time: ~20-30 minutes")
        imgsz = 640
        batch = 2
        epochs = 10
    
    print()
    print("💡 Có thể chạy lại script này nhiều lần để train thêm!")
    print()
    
    # Quick training
    results = model.train(
        data=data_yaml,
        imgsz=imgsz,
        epochs=epochs,
        batch=batch,
        name="asq3_checkbox",  # Same name to continue
        project="checkbox_model",
        exist_ok=True,
        save=True,
        plots=True,
        device=device,
        cache=False,
        workers=2 if use_gpu else 0,
        amp=True if use_gpu else False,
        resume=resume,  # Tự động resume nếu có checkpoint
    )
    
    # Copy best model
    best_model_path = "checkbox_model/asq3_checkbox/weights/best.pt"
    if os.path.exists(best_model_path):
        import shutil
        shutil.copy(best_model_path, "checkbox_model/best.pt")
        print(f"\n✅ Quick training completed!")
        print(f"📦 Best model: checkbox_model/best.pt")
        print()
        print("🧪 Test ngay:")
        print("   python3 test_yolo_model.py")
    else:
        print(f"\n⚠️  Check checkbox_model/ directory")
    
    return results

if __name__ == "__main__":
    main()

