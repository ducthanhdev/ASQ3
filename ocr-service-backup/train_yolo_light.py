#!/usr/bin/env python3
"""
Train YOLO model with lighter settings (for systems with limited RAM).
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
    
    print("🚀 Starting YOLO training (LIGHT MODE)...")
    print(f"📁 Dataset: {data_yaml}")
    print("📦 Model: yolov8n.pt")
    print("🖼️  Image size: 1280 (reduced from 1500)")
    print("🔄 Epochs: 50")
    print("📊 Batch size: 8 (reduced for lower RAM)")
    print()
    
    model = YOLO("yolov8n.pt")
    
    # Train with lighter settings
    results = model.train(
        data=data_yaml,
        imgsz=1280,      # Reduced from 1500
        epochs=50,       # Reduced from 60
        batch=8,         # Reduced from 16 (lower RAM usage)
        name="asq3_checkbox",
        project="checkbox_model",
        exist_ok=True,
        save=True,
        plots=True,
        device='cpu',     # Force CPU (no GPU needed)
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

