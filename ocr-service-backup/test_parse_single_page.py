#!/usr/bin/env python3
"""
Test parse with actual OCR results from a single page
"""
import logging
import cv2
import numpy as np

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Sample OCR texts from GIAO TIEP page
page_texts = [
    {"text": "GIAO TIEP", "bbox": [50, 350, 127, 348, 127, 369, 51, 372], "conf": 0.97},
    {"text": "1. Trè dā biét kēu ré lēn chura?", "bbox": [48, 394, 249, 394, 249, 411, 48, 411], "conf": 0.91},
    {"text": "区C□D□K", "bbox": [497, 391, 612, 391, 612, 411, 497, 411], "conf": 0.58},
    {"text": "2.", "bbox": [48, 436, 69, 436, 69, 453, 48, 453], "conf": 0.99},
    {"text": "Khi choi vói am thanh trè có làu bàu, lǎm bǎm hoǎc tao các ām tram", "bbox": [77, 437, 492, 435, 492, 452, 77, 454], "conf": 0.85},
    {"text": "□c", "bbox": [496, 436, 533, 436, 533, 450, 496, 450], "conf": 0.79},
    {"text": "区D", "bbox": [537, 434, 574, 434, 574, 452, 537, 452], "conf": 0.69},
    {"text": "□", "bbox": [579, 437, 597, 437, 597, 449, 579, 449], "conf": 0.70},
    {"text": "K", "bbox": [597, 436, 610, 436, 610, 450, 597, 450], "conf": 0.98},
    {"text": "3.", "bbox": [50, 500, 67, 500, 67, 514, 50, 514], "conf": 0.95},
    {"text": "□日", "bbox": [537, 497, 574, 497, 574, 512, 537, 512], "conf": 0.64},
    {"text": "4", "bbox": [49, 561, 66, 561, 66, 574, 49, 574], "conf": 0.99},
    {"text": "□C□D", "bbox": [499, 556, 576, 556, 576, 574, 499, 574], "conf": 0.72},
    {"text": "区K", "bbox": [576, 556, 613, 556, 613, 576, 576, 576], "conf": 0.66},
    {"text": "5.", "bbox": [48, 622, 70, 622, 70, 638, 48, 638], "conf": 0.99},
    {"text": "区C□0□K", "bbox": [497, 617, 614, 615, 614, 637, 497, 639], "conf": 0.49},
    {"text": "6.", "bbox": [49, 666, 65, 666, 65, 679, 49, 679], "conf": 0.88},
    {"text": "□K", "bbox": [575, 662, 611, 662, 611, 677, 575, 677], "conf": 0.90},
]

question_ids = [
    "communication_q1", "communication_q2", "communication_q3",
    "communication_q4", "communication_q5", "communication_q6"
]

def main():
    from services.yolo_checkbox_parser import parse_page_with_yolo, extract_labels_from_ocr_texts
    from services.parser_service import detect_domain, get_question_numbers
    
    print("\n" + "="*80)
    print("🔍 TESTING PARSE WITH ACTUAL OCR RESULTS")
    print("="*80)
    
    # Detect domain
    domain = detect_domain(page_texts)
    print(f"\n📊 Detected domain: {domain}")
    
    # Get question numbers
    question_nums = get_question_numbers(page_texts, domain)
    print(f"📊 Question numbers: {question_nums}")
    
    # Extract labels
    print("\n" + "-"*80)
    print("Extracting labels...")
    print("-"*80)
    
    labels_positions = extract_labels_from_ocr_texts(page_texts, domain)
    print(f"\n✅ Found {len(labels_positions)} questions with labels:")
    for q_data in labels_positions:
        qid = q_data['question_id']
        labels = q_data.get('labels', [])
        label_types = [l['type'] for l in labels]
        print(f"  {qid}: {label_types}")
    
    # Load test image
    print("\n" + "-"*80)
    print("Loading test image...")
    print("-"*80)
    
    import glob
    test_images = glob.glob("asq3_pdf_pages/6m/*.png")
    if not test_images:
        print("❌ No test images found")
        return
    
    # Use first image
    img_path = test_images[0]
    print(f"📁 Loading: {img_path}")
    img = cv2.imread(img_path)
    if img is None:
        print("❌ Failed to load image")
        return
    
    print(f"✅ Image loaded: {img.shape}")
    
    # Test parse_page_with_yolo
    print("\n" + "-"*80)
    print("Testing parse_page_with_yolo...")
    print("-"*80)
    
    answers = parse_page_with_yolo(page_texts, img, question_ids, domain)
    
    print(f"\n📊 Results:")
    print(f"  Total answers: {len(answers)}")
    print(f"  Answers: {answers}")
    
    if not answers:
        print("\n❌ NO ANSWERS RETURNED - DEBUGGING...")
        print("\nChecking each step:")
        print(f"  1. Page image: {'✅' if img is not None else '❌'}")
        print(f"  2. Domain: {domain} {'✅' if domain else '❌'}")
        print(f"  3. Question numbers: {question_nums} {'✅' if question_nums else '❌'}")
        print(f"  4. Labels extracted: {len(labels_positions)} questions {'✅' if labels_positions else '❌'}")
        print("\nPlease check logs above for more details.")

if __name__ == "__main__":
    main()

