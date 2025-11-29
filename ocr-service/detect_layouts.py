#!/usr/bin/env python3
"""
detect_layouts.py

Mục đích:
 - Quét folder chứa các thư mục theo độ tuổi (ví dụ: asq3_pdf_pages/6m/)
 - Với mỗi ảnh PNG, tìm các ô checkbox (ô vuông)
 - Xuất file JSON layout cho mỗi độ tuổi: layouts/<age>.json
 - Lưu ảnh debug với ô vuông được khoanh để bạn verify: layouts/debug/<age>/

Kỹ thuật:
 - Thresh + morphology -> tìm contours -> approxPolyDP -> lọc theo số cạnh (4) + tỉ lệ khung (aspect ratio ~ 1)
 - Lọc theo diện tích (min_area, max_area) để tránh tìm nhầm
 - Ghi toạ độ cả absolute (x,y,w,h) & normalized (cx,cy,w,h) theo kích thước ảnh (0-1)

Usage:
    python3 detect_layouts.py --input_dir asq3_pdf_pages --out_dir layouts

Dependencies:
    pip install opencv-python pillow tqdm numpy

Author: ChatGPT (refactor-ready)
"""
import os
import json
import cv2
import numpy as np
from PIL import Image
from tqdm import tqdm
import argparse

def find_checkboxes_for_image(img_bgr, min_area=200, max_area=None, approx_eps=0.02):
    """
    Return list of detected checkbox bounding boxes in (x, y, w, h) format.
    img_bgr: input BGR image (numpy array).
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    # Smooth a bit
    blur = cv2.GaussianBlur(gray, (3,3), 0)
    # Adaptive threshold for variable lighting
    th = cv2.adaptiveThreshold(blur, 255,
                               cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                               cv2.THRESH_BINARY_INV, 25, 9)

    # Morphology to close gaps in box borders
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3,3))
    th = cv2.morphologyEx(th, cv2.MORPH_CLOSE, kernel, iterations=1)

    contours, hierarchy = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    h_img, w_img = gray.shape[:2]
    if max_area is None:
        max_area = (w_img * h_img) // 20  # heuristic

    boxes = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area or area > max_area:
            continue

        # approximate polygon
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, approx_eps * peri, True)
        if len(approx) != 4:
            # not a quadrilateral
            continue

        # bounding rect
        x, y, w, h = cv2.boundingRect(approx)

        # Aspect ratio filter (square-like)
        ar = float(w) / float(h) if h > 0 else 0
        if ar < 0.6 or ar > 1.6:
            continue

        # Border thickness / solidity: small holes inside allowed
        hull = cv2.convexHull(cnt)
        hull_area = cv2.contourArea(hull)
        solidity = area / hull_area if hull_area > 0 else 0
        # Check solidity (boxes with fairly thin borders may have lower solidity) — keep flexible
        # We'll accept typical range 0.4 - 1.0
        if solidity < 0.25:
            continue

        boxes.append((x, y, w, h, float(area)))

    # Optionally sort left->right, top->bottom
    boxes_sorted = sorted(boxes, key=lambda b: (b[1], b[0]))
    return boxes_sorted, th

def mark_debug_image(img_bgr, boxes):
    img = img_bgr.copy()
    for (x,y,w,h,area) in boxes:
        cv2.rectangle(img, (x,y), (x+w, y+h), (0,255,0), 2)
        cv2.putText(img, f"{w}x{h}", (x, y-6), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0,255,0), 1)
    return img

def process_age_folder(age_folder_path, out_dir, args):
    """
    Process images in a single age folder, produce JSON layout
    """
    age_name = os.path.basename(os.path.normpath(age_folder_path))
    image_files = [f for f in os.listdir(age_folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    image_files.sort()
    results = {
        "age": age_name,
        "source_dir": age_folder_path,
        "images": []
    }

    debug_out_dir = os.path.join(out_dir, "debug", age_name)
    os.makedirs(debug_out_dir, exist_ok=True)

    for img_name in image_files:
        img_path = os.path.join(age_folder_path, img_name)
        img_bgr = cv2.imdecode(np.fromfile(img_path, dtype=np.uint8), cv2.IMREAD_COLOR)
        if img_bgr is None:
            print(f"  ⚠️  Could not read {img_path}, skipping")
            continue
        h_img, w_img = img_bgr.shape[:2]
        boxes, th = find_checkboxes_for_image(img_bgr,
                                             min_area=args.min_area,
                                             max_area=args.max_area,
                                             approx_eps=args.approx_eps)

        # Convert boxes to normalized format (YOLO format: center_x, center_y, width, height)
        boxes_out = []
        for (x,y,w,h,area) in boxes:
            cx = x + w/2
            cy = y + h/2
            boxes_out.append({
                "bbox": [int(x), int(y), int(w), int(h)],  # Absolute: [x, y, width, height] (top-left)
                "bbox_norm": [round(cx / w_img, 4), round(cy / h_img, 4), round(w / w_img, 4), round(h / h_img, 4)],  # YOLO format: [center_x, center_y, width, height] normalized (0-1)
                "area": area
            })

        results["images"].append({
            "file": img_name,
            "width": w_img,
            "height": h_img,
            "checkboxes": boxes_out
        })

        if args.save_debug:
            dbg = mark_debug_image(img_bgr, boxes)
            dbg_path = os.path.join(debug_out_dir, img_name)
            # Use imencode + tofile to support unicode paths on Windows
            _, enc = cv2.imencode('.png', dbg)
            enc.tofile(dbg_path)

    # Save JSON
    os.makedirs(out_dir, exist_ok=True)
    out_json = os.path.join(out_dir, f"{age_name}.json")
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    return out_json, results

def main(args):
    input_dir = args.input_dir
    out_dir = args.out_dir

    if not os.path.isdir(input_dir):
        print(f"❌ Input dir not found: {input_dir}")
        return 1

    # Each immediate subdirectory is treated as an 'age' folder
    subdirs = [os.path.join(input_dir, d) for d in os.listdir(input_dir)
               if os.path.isdir(os.path.join(input_dir, d))]
    subdirs.sort()
    if not subdirs:
        print("❌ No subdirectories found in input_dir. Expect structure like:")
        print("   asq3_pdf_pages/6m/, asq3_pdf_pages/8m/, ...")
        return 1

    summary = {}
    for sub in tqdm(subdirs, desc="Ages"):
        age_name = os.path.basename(sub)
        print(f"\nProcessing age: {age_name} -> {sub}")
        out_json, res = process_age_folder(sub, out_dir, args)
        print(f"  → Saved: {out_json} (images: {len(res['images'])})")
        summary[age_name] = len(res['images'])

    # global summary
    summary_path = os.path.join(out_dir, "summary.json")
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print("\n✅ Done. Layout files are in:", out_dir)
    print("  Debug images (with boxes) are in:", os.path.join(out_dir, "debug"))
    return 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Detect checkbox layout per age folder")
    parser.add_argument("--input_dir", default="asq3_pdf_pages",
                        help="Input directory with subfolders per age containing PNGs")
    parser.add_argument("--out_dir", default="layouts",
                        help="Output directory for layout JSONs and debug images")
    parser.add_argument("--min_area", type=int, default=200,
                        help="Min contour area to consider as checkbox (pixels)")
    parser.add_argument("--max_area", type=int, default=None,
                        help="Max contour area. Default: heuristic relative to image size")
    parser.add_argument("--approx_eps", type=float, default=0.02,
                        help="Epsilon multiplier for approxPolyDP")
    parser.add_argument("--save_debug", action="store_true",
                        help="Save debug images with detected boxes")
    args = parser.parse_args()
    exit(main(args))
