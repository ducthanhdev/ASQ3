#!/usr/bin/env python3
"""
Detailed debug script to test YOLO model and understand why it's not detecting checkboxes.
Tests with actual PDF pages from the dataset.
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

def debug_yolo_detailed(image_path: str = None, model_path: str = "checkbox_model/best.pt"):
    """Detailed debug YOLO model with comprehensive testing."""
    
    # Check model
    if not os.path.exists(model_path):
        print(f"❌ Model not found: {model_path}")
        print(f"   Current directory: {os.getcwd()}")
        return
    
    model_size = os.path.getsize(model_path) / 1024 / 1024
    print(f"✅ Model found: {model_path} ({model_size:.1f} MB)")
    
    # Load model
    print("📦 Loading YOLO model...")
    try:
        model = YOLO(model_path)
        print("✅ Model loaded successfully")
        print(f"   Model classes: {model.names}")
        print(f"   Number of classes: {len(model.names)}")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return
    
    # Auto-select image if not provided
    if not image_path:
        # Try to find a test image
        test_dirs = [
            "asq3_pdf_pages/6m",
            "asq3_pdf_pages/12m",
            "asq3_pdf_pages/18m",
        ]
        for test_dir in test_dirs:
            if os.path.exists(test_dir):
                images = list(Path(test_dir).glob("*.png"))
                if images:
                    image_path = str(images[0])
                    print(f"📁 Auto-selected image: {image_path}")
                    break
        
        if not image_path:
            print("❌ No image provided and no test images found")
            print("   Usage: python3 debug_yolo_detailed.py <image_path>")
            return
    
    if not os.path.exists(image_path):
        print(f"❌ Image not found: {image_path}")
        return
    
    # Load image
    print(f"\n🖼️  Loading image: {image_path}")
    img = cv2.imread(image_path)
    if img is None:
        print(f"❌ Failed to load image")
        return
    
    print(f"   Image shape: {img.shape}")
    print(f"   Image dtype: {img.dtype}")
    print(f"   Image min/max: {img.min()}/{img.max()}")
    
    # Convert BGR to RGB
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    print(f"   Converted to RGB: {img_rgb.shape}")
    
    # Test with multiple settings
    print("\n" + "="*70)
    print("🔍 Testing YOLO detection with various settings...")
    print("="*70)
    
    conf_thresholds = [0.0001, 0.001, 0.01, 0.05, 0.1, 0.2]
    imgsz_options = [640, 800, 1024, 1280]
    
    best_result = None
    best_settings = None
    
    for conf in conf_thresholds:
        for imgsz in imgsz_options:
            try:
                results = model.predict(
                    img_rgb, 
                    conf=conf, 
                    verbose=False, 
                    imgsz=imgsz,
                    iou=0.7,
                    agnostic_nms=False
                )
                result = results[0]
                boxes = result.boxes
                
                num_detections = len(boxes) if boxes is not None else 0
                
                if num_detections > 0:
                    print(f"\n✅ Found {num_detections} detections!")
                    print(f"   Settings: conf={conf}, imgsz={imgsz}")
                    
                    if best_result is None or num_detections > len(best_result.boxes):
                        best_result = result
                        best_settings = (conf, imgsz)
                    
                    # Show first 5 detections
                    for i, box in enumerate(boxes[:5]):
                        cls = int(box.cls[0])
                        conf_val = float(box.conf[0])
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        class_name = model.names[cls]
                        print(f"   Detection {i+1}: {class_name} (conf={conf_val:.4f}), bbox=({int(x1)}, {int(y1)}, {int(x2)}, {int(y2)})")
                    
                    if num_detections > 5:
                        print(f"   ... and {num_detections - 5} more")
                    
                    break  # Found detections, no need to try other imgsz
            except Exception as e:
                print(f"   ⚠️  Error with conf={conf}, imgsz={imgsz}: {e}")
                continue
    
    if best_result is None:
        print("\n❌ No detections found with any settings!")
        print("\n💡 Possible reasons:")
        print("   1. Model needs more training")
        print("   2. Image format/quality is different from training data")
        print("   3. Checkboxes are too small or not visible")
        print("   4. Model was trained on different image sizes")
        print("\n🔧 Suggestions:")
        print("   - Check training data format")
        print("   - Verify model was trained correctly")
        print("   - Try training with more epochs")
        print("   - Check if image preprocessing matches training")
    else:
        print("\n" + "="*70)
        print(f"✅ Best result: {len(best_result.boxes)} detections")
        print(f"   Best settings: conf={best_settings[0]}, imgsz={best_settings[1]}")
        print("="*70)
        
        # Visualize results
        try:
            from PIL import Image, ImageDraw, ImageFont
            
            img_pil = Image.fromarray(img_rgb)
            draw = ImageDraw.Draw(img_pil)
            
            for box in best_result.boxes:
                cls = int(box.cls[0])
                conf_val = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                class_name = model.names[cls]
                
                # Draw bounding box
                draw.rectangle([x1, y1, x2, y2], outline="red", width=2)
                
                # Draw label
                label = f"{class_name} {conf_val:.2f}"
                draw.text((x1, y1 - 15), label, fill="red")
            
            output_path = "debug_yolo_result.jpg"
            img_pil.save(output_path)
            print(f"\n💾 Saved visualization: {output_path}")
        except Exception as e:
            print(f"\n⚠️  Could not save visualization: {e}")

if __name__ == "__main__":
    image_path = sys.argv[1] if len(sys.argv) > 1 else None
    debug_yolo_detailed(image_path)

