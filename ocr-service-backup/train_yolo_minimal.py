#!/usr/bin/env python3
"""
Train YOLO model with MINIMAL settings (batch=1, for systems with very limited RAM).
This is the safest option if other scripts still get "Killed".
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
    
    print("🚀 Starting YOLO training (MINIMAL MODE - batch=1)...")
    print(f"📁 Dataset: {data_yaml}")
    print("📦 Model: yolov8n.pt")
    print("🖼️  Image size: 640 (minimum)")
    print("🔄 Epochs: 30")
    print("📊 Batch size: 1 (MINIMAL - slowest but safest)")
    print("💾 Cache: False")
    print("⚠️  This will be SLOW but should not get 'Killed'")
    print()
    
    model = YOLO("yolov8n.pt")
    
    # Train with minimal settings
    results = model.train(
        data=data_yaml,
        imgsz=640,        # Minimum size
        epochs=30,
        batch=1,          # MINIMAL batch size
        name="asq3_checkbox",
        project="checkbox_model",
        exist_ok=True,
        save=True,
        plots=True,
        device='cpu',
        cache=False,      # Disable cache
        workers=0,        # No multiprocessing
        amp=False,        # Disable mixed precision
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

