#!/usr/bin/env python3
"""
Generate YOLO Dataset for ALL ASQ-3 ages using real layout JSON.

Input:
    asq3_pdf_pages/<age>/*.png        ← Background
    layouts/<age>.json                ← Checkbox layout detected by detect_layouts.py

Output:
    asq3_real_yolo_dataset/
        images/train/*.jpg
        images/val/*.jpg
        labels/train/*.txt
        labels/val/*.txt
        data.yaml

Key:
    class 0 = checkbox_empty
    class 1 = checkbox_marked

You can train YOLO with:
    python3 train_yolo.py
    
Or using YOLO CLI (if installed):
    yolo detect train model=yolov8n.pt data=asq3_real_yolo_dataset/data.yaml imgsz=1500 epochs=60
"""

import os
import json
import random
import cv2
import numpy as np
from tqdm import tqdm
from pathlib import Path
import yaml

# ============================================================
# CONFIG
# ============================================================
LAYOUT_DIR = "layouts"
BACKGROUND_DIR = "asq3_pdf_pages"
OUTPUT_DIR = "asq3_real_yolo_dataset"

TOTAL_IMAGES_PER_AGE = 120       # mức tốt: 100–300 mỗi tuổi
VAL_SPLIT = 0.1                  # 10% val
IMG_SIZE = None                  # None = giữ nguyên size PNG gốc

os.makedirs(f"{OUTPUT_DIR}/images/train", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/images/val", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/labels/train", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/labels/val", exist_ok=True)

CLASSES = ["checkbox_empty", "checkbox_marked"]

# ============================================================
# MARK GENERATOR
# ============================================================
def draw_mark(image, x, y, w, h):
    """Vẽ dấu X / tick / slash ngay tâm ô checkbox."""
    cx = int(x + w/2)
    cy = int(y + h/2)
    size = int(min(w, h) * 0.35)

    style = random.choice(["x", "x2", "slash", "tick", "circle"])
    color = (0, 0, 0)
    thickness = random.randint(2, 4)

    if style == "x":
        cv2.line(image, (cx-size, cy-size), (cx+size, cy+size), color, thickness)
    elif style == "x2":
        cv2.line(image, (cx-size, cy+size), (cx+size, cy-size), color, thickness)
    elif style == "slash":
        cv2.line(image, (cx-size, cy), (cx+size, cy), color, thickness)
    elif style == "tick":
        cv2.line(image, (cx-size, cy), (cx, cy+size), color, thickness)
        cv2.line(image, (cx, cy+size), (cx+size, cy-size), color, thickness)
    elif style == "circle":
        cv2.circle(image, (cx, cy), size, color, thickness)


# ============================================================
# EFFECTS
# ============================================================
def apply_effects(img):
    if random.random() < 0.4:
        img = cv2.GaussianBlur(img, (5,5), 0)
    if random.random() < 0.5:
        noise = np.random.normal(0, 12, img.shape).astype(np.int16)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    if random.random() < 0.3:
        factor = random.uniform(0.9, 1.1)
        img = np.clip(img.astype(np.float32) * factor, 0, 255).astype(np.uint8)
    return img


# ============================================================
# YOLO SAVER
# ============================================================
def save_yolo(image, labels, out_idx):
    folder = "val" if random.random() < VAL_SPLIT else "train"

    img_path = f"{OUTPUT_DIR}/images/{folder}/{out_idx}.jpg"
    lbl_path = f"{OUTPUT_DIR}/labels/{folder}/{out_idx}.txt"

    cv2.imwrite(img_path, image)

    with open(lbl_path, "w") as f:
        for cls, cx, cy, w, h in labels:
            f.write(f"{cls} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n")


# ============================================================
# MAIN GENERATOR
# ============================================================
def main():
    layout_files = sorted(Path(LAYOUT_DIR).glob("*.json"))

    if not layout_files:
        print("❌ No layout JSON files found.")
        return

    global_index = 0

    print("🎨 Generating YOLO dataset for ALL ages...\n")

    for layout_path in layout_files:
        age = layout_path.stem
        print(f"➡ Age: {age}")

        bg_dir = Path(BACKGROUND_DIR) / age
        if not bg_dir.exists():
            print(f"   ⚠️ Background missing for {age}, skip.")
            continue

        # Load layout JSON
        with open(layout_path, "r", encoding="utf-8") as f:
            layout = json.load(f)

        # Background list
        bg_files = sorted([str(x) for x in bg_dir.glob("*.png")])
        if not bg_files:
            print(f"   ⚠️ No PNG in {bg_dir}, skip.")
            continue

        # Generate N images per age
        for _ in tqdm(range(TOTAL_IMAGES_PER_AGE), desc=f"{age}", ncols=80):

            bg_path = random.choice(bg_files)
            img = cv2.imread(bg_path)
            if img is None:
                print(f"   ⚠️ Could not read {bg_path}, skipping")
                continue
            
            h_orig, w_orig = img.shape[:2]

            labels = []

            # pick a random page entry from layout
            entry = random.choice(layout["images"])
            
            # Calculate scale factors if image dimensions don't match layout
            # (This can happen if PDF conversion changed image size)
            scale_x = w_orig / entry["width"]
            scale_y = h_orig / entry["height"]
            
            # Resize image if IMG_SIZE is set
            if IMG_SIZE:
                img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
                # Update scale factors for final image size
                scale_x = IMG_SIZE / entry["width"]
                scale_y = IMG_SIZE / entry["height"]
            
            h_img, w_img = img.shape[:2]
            
            for cb in entry["checkboxes"]:
                # Get bbox from layout (in original image coordinates)
                x, y, w, h = cb["bbox"]
                
                # Scale bbox to match current image size
                x_scaled = int(x * scale_x)
                y_scaled = int(y * scale_y)
                w_scaled = int(w * scale_x)
                h_scaled = int(h * scale_y)
                
                # Calculate normalized coordinates for YOLO (always based on current image size)
                cx_norm = (x_scaled + w_scaled/2) / w_img
                cy_norm = (y_scaled + h_scaled/2) / h_img
                w_norm = w_scaled / w_img
                h_norm = h_scaled / h_img

                if random.random() < 0.5:
                    cls = 0  # empty
                else:
                    cls = 1  # marked
                    draw_mark(img, x, y, w, h)

                labels.append((cls, cx_norm, cy_norm, w_norm, h_norm))

            img = apply_effects(img)
            save_yolo(img, labels, global_index)
            global_index += 1

    # Write data.yaml (YOLO format)
    with open(f"{OUTPUT_DIR}/data.yaml", "w") as f:
        yaml.dump({
            "path": os.path.abspath(OUTPUT_DIR),
            "train": "images/train",
            "val": "images/val",
            "nc": len(CLASSES),  # number of classes
            "names": CLASSES
        }, f, default_flow_style=False)

    print("\n🎉 YOLO dataset created successfully!")
    print("📁 Output folder:", OUTPUT_DIR)


if __name__ == "__main__":
    main()
