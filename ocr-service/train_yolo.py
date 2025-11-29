#!/usr/bin/env python3
"""
Train YOLO model for ASQ-3 checkbox detection.

Usage:
    python3 train_yolo.py

This script will:
1. Load the dataset from asq3_real_yolo_dataset/
2. Train YOLOv8 model
3. Save the trained model to checkbox_model/best.pt
"""
import os
import sys

# Check if ultralytics is installed
try:
    from ultralytics import YOLO
except ImportError:
    print("❌ ultralytics not installed. Installing...")
    print("   Run: pip install ultralytics")
    print("   Or: pip install -r requirements.txt")
    sys.exit(1)

def main():
    # Dataset path
    data_yaml = "asq3_real_yolo_dataset/data.yaml"
    
    if not os.path.exists(data_yaml):
        print(f"❌ Dataset not found: {data_yaml}")
        print("   Please run: python3 generate_yolo_dataset_all_ages.py")
        sys.exit(1)
    
    # Create model directory
    os.makedirs("checkbox_model", exist_ok=True)
    
    print("🚀 Starting YOLO training...")
    print(f"📁 Dataset: {data_yaml}")
    print("📦 Model: yolov8n.pt (nano - fastest)")
    print("🖼️  Image size: 1500")
    print("🔄 Epochs: 60")
    print()
    
    # Initialize model
    model = YOLO("yolov8n.pt")  # nano model (smallest, fastest)
    
    # Train the model
    results = model.train(
        data=data_yaml,
        imgsz=1500,
        epochs=60,
        batch=16,  # Adjust based on your GPU memory
        name="asq3_checkbox",
        project="checkbox_model",
        exist_ok=True,
        save=True,
        plots=True,
        cache=False,  # Disable cache to save RAM
        workers=0,    # No multiprocessing to save RAM
    )
    
    # The best model will be saved to: checkbox_model/asq3_checkbox/weights/best.pt
    # Copy to checkbox_model/best.pt for easy access
    best_model_path = "checkbox_model/asq3_checkbox/weights/best.pt"
    if os.path.exists(best_model_path):
        import shutil
        shutil.copy(best_model_path, "checkbox_model/best.pt")
        print(f"\n✅ Training completed!")
        print(f"📦 Best model saved to: checkbox_model/best.pt")
    else:
        print(f"\n⚠️  Best model not found at expected path: {best_model_path}")
        print("   Check checkbox_model/ directory for the trained model")
    
    return results

if __name__ == "__main__":
    main()

