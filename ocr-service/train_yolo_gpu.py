#!/usr/bin/env python3
"""
Train YOLO model with GPU support (optimized for RTX 3050 6GB).
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
    
    if not os.path.exists(data_yaml):
        print(f"❌ Dataset not found: {data_yaml}")
        print("   Please run: python3 generate_yolo_dataset_all_ages.py")
        sys.exit(1)
    
    os.makedirs("checkbox_model", exist_ok=True)
    
    # Check GPU availability
    use_gpu = torch.cuda.is_available()
    device = 'cuda' if use_gpu else 'cpu'
    gpu_name = torch.cuda.get_device_name(0) if use_gpu else "CPU"
    
    print("🚀 Starting YOLO training...")
    print(f"📁 Dataset: {data_yaml}")
    print(f"🖥️  Device: {device.upper()} ({gpu_name})")
    print("📦 Model: yolov8n.pt")
    
    if use_gpu:
        print("🖼️  Image size: 800 (reduced for system RAM)")
        print("🔄 Epochs: 50")
        print("📊 Batch size: 4 (reduced for system RAM)")
        print("⚡ Estimated time: ~45-90 minutes")
        imgsz = 800
        batch = 4
        epochs = 50
    else:
        print("🖼️  Image size: 640 (CPU mode)")
        print("🔄 Epochs: 30")
        print("📊 Batch size: 2 (CPU mode)")
        print("⏱️  Estimated time: ~2-3 hours")
        imgsz = 640
        batch = 2
        epochs = 30
    
    print()
    
    model = YOLO("yolov8n.pt")
    
    # Train the model
    results = model.train(
        data=data_yaml,
        imgsz=imgsz,
        epochs=epochs,
        batch=batch,
        name="asq3_checkbox",
        project="checkbox_model",
        exist_ok=True,
        save=True,
        plots=True,
        device=device,
        cache=False,
        workers=2 if use_gpu else 0,  # Reduced workers to save RAM
        amp=True if use_gpu else False,  # Mixed precision for GPU
    )
    
    best_model_path = "checkbox_model/asq3_checkbox/weights/best.pt"
    if os.path.exists(best_model_path):
        import shutil
        shutil.copy(best_model_path, "checkbox_model/best.pt")
        print(f"\n✅ Training completed!")
        print(f"📦 Best model: checkbox_model/best.pt")
    else:
        print(f"\n⚠️  Check checkbox_model/ directory for trained model")
    
    return results

if __name__ == "__main__":
    main()

