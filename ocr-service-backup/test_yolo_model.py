#!/usr/bin/env python3
"""
Test YOLO model on a sample image to verify it works correctly.
"""
import os
import sys
import cv2
import numpy as np
from pathlib import Path

try:
    from ultralytics import YOLO
except ImportError:
    print("❌ ultralytics not installed.")
    print("   Run: bash install_yolo.sh")
    sys.exit(1)

def test_model(image_path: str, model_path: str = "checkbox_model/best.pt"):
    """
    Test YOLO model on an image and visualize results.
    
    Args:
        image_path: Path to test image
        model_path: Path to YOLO model
    """
    if not os.path.exists(model_path):
        print(f"❌ Model not found: {model_path}")
        sys.exit(1)
    
    if not os.path.exists(image_path):
        print(f"❌ Image not found: {image_path}")
        sys.exit(1)
    
    print(f"📦 Loading model: {model_path}")
    model = YOLO(model_path)
    
    print(f"🖼️  Loading image: {image_path}")
    img = cv2.imread(image_path)
    if img is None:
        print(f"❌ Failed to load image: {image_path}")
        sys.exit(1)
    
    original_size = (img.shape[1], img.shape[0])
    print(f"📏 Original image size: {original_size[0]}x{original_size[1]}")
    
    # Convert BGR to RGB (YOLO expects RGB)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    print(f"📏 Converted to RGB: {img_rgb.shape}")
    print()
    
    # Run inference with lower confidence threshold
    print("🔍 Running inference...")
    print("   (Trying multiple confidence thresholds and image sizes...)")
    
    # Try different confidence thresholds and image sizes
    # Based on debug results: imgsz=1024, conf=0.1 works better for marked checkboxes
    conf_thresholds = [0.1, 0.05, 0.01, 0.02, 0.03, 0.15, 0.2, 0.25]
    imgsz_options = [1024, 1280, 800, 640]  # Prioritize 1024 based on test results
    best_results = None
    best_conf = None
    best_imgsz = None
    
    for imgsz in imgsz_options:
        for conf_thresh in conf_thresholds:
            results = model.predict(img_rgb, conf=conf_thresh, verbose=False, imgsz=imgsz)
            result = results[0]
            boxes = result.boxes
            
            if len(boxes) > 0:
                best_results = results
                best_conf = conf_thresh
                best_imgsz = imgsz
                print(f"   ✅ Found {len(boxes)} detections at conf={conf_thresh}, imgsz={imgsz}")
                break
            else:
                print(f"   ⚠️  No detections at conf={conf_thresh}, imgsz={imgsz}")
        if best_results is not None:
            break
    
    if best_results is None:
        print()
        print("⚠️  No detections found at any confidence threshold.")
        print("   Possible reasons:")
        print("   - Model needs more training")
        print("   - Image format/quality is different from training data")
        print("   - Try training with more epochs or different augmentation")
        return None
    
    # Process results
    result = best_results[0]
    boxes = result.boxes
    
    print()
    print(f"✅ Using detections at conf={best_conf}, imgsz={best_imgsz}")
    print(f"📊 Total detections: {len(boxes)}")
    print()
    
    # Print detections
    print("Detections:")
    print("-" * 70)
    
    checkbox_count = 0
    mark_count = 0
    
    for i, box in enumerate(boxes):
        cls = int(box.cls[0])
        conf = float(box.conf[0])
        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
        
        # Class names from model
        class_name = model.names[cls]
        
        if cls == 0:
            checkbox_count += 1
        else:
            mark_count += 1
        
        print(f"{i+1:3d}. {class_name:20s} conf={conf:.3f}  bbox=({x1:6.0f}, {y1:6.0f}, {x2:6.0f}, {y2:6.0f})")
    
    print("-" * 70)
    print(f"Summary: {checkbox_count} checkboxes, {mark_count} marks")
    print()
    
    # Visualize
    output_path = "test_yolo_result.jpg"
    annotated_img = result.plot()
    cv2.imwrite(output_path, annotated_img)
    print(f"💾 Saved visualization: {output_path}")
    
    return results

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Test YOLO checkbox detection model")
    parser.add_argument(
        "--image",
        type=str,
        default=None,
        help="Path to test image (default: auto-find in asq3_pdf_pages/)"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="checkbox_model/best.pt",
        help="Path to YOLO model (default: checkbox_model/best.pt)"
    )
    
    args = parser.parse_args()
    
    # Auto-find test image if not provided
    if args.image is None:
        # Try to find a test image
        test_dirs = [
            "asq3_pdf_pages/6m",
            "asq3_pdf_pages/2m",
            "asq3_pdf_pages",
        ]
        
        for test_dir in test_dirs:
            if os.path.exists(test_dir):
                png_files = list(Path(test_dir).glob("*.png"))
                if png_files:
                    args.image = str(png_files[0])
                    print(f"📁 Auto-selected image: {args.image}")
                    break
        
        if args.image is None:
            print("❌ No test image found. Please specify with --image")
            print("   Example: python3 test_yolo_model.py --image asq3_pdf_pages/6m/1.png")
            sys.exit(1)
    
    test_model(args.image, args.model)

if __name__ == "__main__":
    main()

