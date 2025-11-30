#!/usr/bin/env python3
"""
Train YOLO model with ULTRA LIGHT settings (for systems with very limited RAM).
"""
import os
import sys

try:
    from ultralytics import YOLO
except ImportError:
    print("❌ ultralytics not installed.")
    print("   Run: bash install_yolo.sh")
    sys.exit(1)

def main():
    data_yaml = "asq3_real_yolo_dataset/data.yaml"
    
    if not os.path.exists(data_yaml):
        print(f"❌ Dataset not found: {data_yaml}")
        print("   Please run: python3 generate_yolo_dataset_all_ages.py")
        sys.exit(1)
    
    os.makedirs("checkbox_model", exist_ok=True)
    
    print("🚀 Starting YOLO training (ULTRA LIGHT MODE)...")
    print(f"📁 Dataset: {data_yaml}")
    print("📦 Model: yolov8n.pt")
    print("🖼️  Image size: 640 (minimum for YOLO)")
    print("🔄 Epochs: 30 (quick test)")
    print("📊 Batch size: 2 (ultra low RAM)")
    print("💾 Cache: False (saves RAM)")
    print()
    
    model = YOLO("yolov8n.pt")
    
    # Train with ultra light settings
    results = model.train(
        data=data_yaml,
        imgsz=640,        # Minimum size (YOLO requires multiple of 32)
        epochs=30,        # Quick test first
        batch=2,          # Ultra low batch size
        name="asq3_checkbox",
        project="checkbox_model",
        exist_ok=True,
        save=True,
        plots=True,
        device='cpu',
        cache=False,      # Disable cache to save RAM
        workers=0,        # No multiprocessing
        amp=False,        # Disable mixed precision (saves RAM)
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

