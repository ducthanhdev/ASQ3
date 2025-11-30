#!/usr/bin/env python3
"""
Very quick training - chỉ 5 epochs để test cực nhanh.
"""
import os
import sys

try:
    from ultralytics import YOLO
    import torch
except ImportError:
    print("❌ ultralytics or torch not installed.")
    sys.exit(1)

def main():
    data_yaml = "asq3_real_yolo_dataset/data.yaml"
    best_model = "checkbox_model/best.pt"
    
    if not os.path.exists(best_model):
        print(f"❌ Best model not found: {best_model}")
        sys.exit(1)
    
    use_gpu = torch.cuda.is_available()
    device = 'cuda' if use_gpu else 'cpu'
    
    # Check if we can resume from last checkpoint
    last_checkpoint = "checkbox_model/asq3_checkbox/weights/last.pt"
    can_resume = os.path.exists(last_checkpoint)
    
    # Very quick - chỉ 5 epochs mỗi lần
    imgsz = 800 if use_gpu else 640
    batch = 4 if use_gpu else 2
    epochs_per_run = 5
    
    # Try to resume, but if it fails, start from best.pt
    if can_resume:
        try:
            # Try to get current epoch from checkpoint
            ckpt = torch.load(last_checkpoint, map_location='cpu', weights_only=False)
            start_epoch = ckpt.get('epoch', 0) + 1
            total_epochs_in_ckpt = ckpt.get('epochs', 0)
            
            if start_epoch < total_epochs_in_ckpt:
                # Can resume
                print("🔄 Resuming from last checkpoint (tiếp tục training)...")
                print(f"📦 From: {last_checkpoint}")
                print(f"📊 Current epoch: {start_epoch}/{total_epochs_in_ckpt}")
                model = YOLO(last_checkpoint)
                resume = True
                # Calculate total epochs needed
                total_epochs_needed = start_epoch + epochs_per_run
            else:
                # Already finished, start from best.pt
                print("✅ Previous training completed. Starting new training from best model...")
                print(f"📦 From: {best_model}")
                model = YOLO(best_model)
                resume = False
                total_epochs_needed = epochs_per_run
        except Exception as e:
            # If resume fails, start from best.pt
            print(f"⚠️  Cannot resume from checkpoint: {e}")
            print("🚀 Starting from best model instead...")
            print(f"📦 From: {best_model}")
            model = YOLO(best_model)
            resume = False
            total_epochs_needed = epochs_per_run
    else:
        print("🚀 Starting from best model...")
        print(f"📦 From: {best_model}")
        model = YOLO(best_model)
        resume = False
        total_epochs_needed = epochs_per_run
    
    print()
    
    if resume:
        print(f"⚡ Train thêm {epochs_per_run} epochs (tiếp tục từ checkpoint)...")
        print(f"📊 Target: {total_epochs_needed} epochs total")
    else:
        print(f"⚡ Train {epochs_per_run} epochs mới...")
    print(f"⏱️  ~5-10 phút...")
    print()
    print("💡 Tip: Có thể chạy lại script này nhiều lần để train thêm!")
    print()
    
    results = model.train(
        data=data_yaml,
        imgsz=imgsz,
        epochs=total_epochs_needed,  # Total epochs needed
        batch=batch,
        name="asq3_checkbox",
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
    
    best_model_path = "checkbox_model/asq3_checkbox/weights/best.pt"
    if os.path.exists(best_model_path):
        import shutil
        shutil.copy(best_model_path, "checkbox_model/best.pt")
        print(f"\n✅ Done! Test: python3 test_yolo_model.py")
    
    return results

if __name__ == "__main__":
    main()

