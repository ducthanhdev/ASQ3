#!/usr/bin/env python3
"""
Continue training YOLO model from best checkpoint to improve confidence.
This will train additional epochs starting from the best model.
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
        print("   Please run: python3 generate_yolo_dataset_all_ages.py")
        sys.exit(1)
    
    if not os.path.exists(best_model):
        print(f"❌ Best model not found: {best_model}")
        print("   Please train first with: python3 train_yolo_gpu.py")
        sys.exit(1)
    
    # Check GPU availability
    use_gpu = torch.cuda.is_available()
    device = 'cuda' if use_gpu else 'cpu'
    gpu_name = torch.cuda.get_device_name(0) if use_gpu else "CPU"
    
    print("🚀 Continuing YOLO training from best model...")
    print(f"📁 Dataset: {data_yaml}")
    print(f"📦 Starting from: {best_model}")
    print(f"🖥️  Device: {device.upper()} ({gpu_name})")
    print()
    
    # Load best model
    model = YOLO(best_model)
    
    # Training parameters (same as original training)
    if use_gpu:
        print("🖼️  Image size: 800")
        print("🔄 Additional epochs: 50 (total will be 100)")
        print("📊 Batch size: 4")
        print("⚡ Estimated time: ~45-90 minutes")
        imgsz = 800
        batch = 4
        epochs = 50  # Additional epochs
    else:
        print("🖼️  Image size: 640")
        print("🔄 Additional epochs: 30 (total will be 80)")
        print("📊 Batch size: 2")
        print("⏱️  Estimated time: ~2-3 hours")
        imgsz = 640
        batch = 2
        epochs = 30  # Additional epochs
    
    print()
    print("💡 This will continue training from the best checkpoint.")
    print("   The model will improve confidence and detection quality.")
    print()
    
    # Check if we should resume from last checkpoint or start from best
    last_checkpoint = "checkbox_model/asq3_checkbox/weights/last.pt"
    resume_from_last = os.path.exists(last_checkpoint)
    
    if resume_from_last:
        print("📌 Resuming from last checkpoint (continues training curve)")
        print(f"   Using: {last_checkpoint}")
        model = YOLO(last_checkpoint)
        resume = True
    else:
        print("📌 Starting from best model (fine-tuning)")
        print(f"   Using: {best_model}")
        resume = False
    
    print()
    
    # Continue training
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
        resume=resume,
    )
    
    # Copy best model
    best_model_path = "checkbox_model/asq3_checkbox/weights/best.pt"
    if os.path.exists(best_model_path):
        import shutil
        shutil.copy(best_model_path, "checkbox_model/best.pt")
        print(f"\n✅ Training completed!")
        print(f"📦 Best model: checkbox_model/best.pt")
        print()
        print("🧪 Test the improved model:")
        print("   python3 test_yolo_model.py")
    else:
        print(f"\n⚠️  Check checkbox_model/ directory for trained model")
    
    return results

if __name__ == "__main__":
    main()

