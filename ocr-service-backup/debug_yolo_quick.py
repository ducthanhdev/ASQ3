#!/usr/bin/env python3
"""
Quick debug script to test YOLO model and see why it's not detecting checkboxes.
"""
import os
import sys
import cv2
import numpy as np
from pathlib import Path

try:
    from ultralytics import YOLO
except ImportError:
    print("❌ ultralytics not installed. Install with: pip install ultralytics")
    sys.exit(1)

def debug_yolo(image_path: str = None, model_path: str = "checkbox_model/best.pt"):
    """Quick debug YOLO model."""
    
    # Check model
    if not os.path.exists(model_path):
        print(f"❌ Model not found: {model_path}")
        print(f"   Current directory: {os.getcwd()}")
        print(f"   Model path (abs): {os.path.abspath(model_path)}")
        return
    
    print(f"✅ Model found: {model_path} ({os.path.getsize(model_path) / 1024 / 1024:.1f} MB)")
    
    # Load model
    print("📦 Loading YOLO model...")
    try:
        model = YOLO(model_path)
        print("✅ Model loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return
    
    # Test with image if provided
    if image_path and os.path.exists(image_path):
        print(f"\n🖼️  Testing with image: {image_path}")
        img = cv2.imread(image_path)
        if img is None:
            print(f"❌ Failed to load image")
            return
        
        print(f"   Image shape: {img.shape}")
        print(f"   Image dtype: {img.dtype}")
        
        # Convert BGR to RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Try multiple settings
        print("\n🔍 Testing detection...")
        for conf in [0.0001, 0.001, 0.01, 0.1]:
            for imgsz in [640, 800, 1280]:
                results = model.predict(img_rgb, conf=conf, verbose=False, imgsz=imgsz)
                boxes = results[0].boxes
                if len(boxes) > 0:
                    print(f"   ✅ Found {len(boxes)} boxes at conf={conf}, imgsz={imgsz}")
                    for i, box in enumerate(boxes[:3]):
                        cls = int(box.cls[0])
                        conf_val = float(box.conf[0])
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        print(f"      Box {i}: class={cls}, conf={conf_val:.3f}, bbox=({int(x1)}, {int(y1)}, {int(x2)}, {int(y2)})")
                    return
        
        print("   ❌ No detections found with any settings")
    else:
        print("\n💡 To test with image, run:")
        print(f"   python3 {sys.argv[0]} <image_path>")
        print("\n📋 Model info:")
        print(f"   Model type: {type(model).__name__}")
        try:
            print(f"   Device: {model.device}")
        except:
            pass

if __name__ == "__main__":
    image_path = sys.argv[1] if len(sys.argv) > 1 else None
    debug_yolo(image_path)

