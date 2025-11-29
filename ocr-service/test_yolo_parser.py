#!/usr/bin/env python3
"""
Test YOLO + PaddleOCR parser integration.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from services.ocr_service import recognize_file
from services.yolo_checkbox_parser import parse_answers_with_yolo_paddleocr

def test_parser(image_path: str):
    """Test parser on an image file."""
    print(f"🧪 Testing YOLO + PaddleOCR parser on: {image_path}")
    print()
    
    # 1. Read image
    with open(image_path, 'rb') as f:
        image_data = f.read()
    
    # 2. OCR
    print("📝 Step 1: Running PaddleOCR...")
    ocr_result = recognize_file(image_data, "test.png")
    pages = ocr_result['pages']
    print(f"   ✅ Found {len(pages)} pages")
    print()
    
    # 3. Extract question IDs (example)
    question_ids = []
    for page in pages:
        texts = page.get('texts', [])
        for text_item in texts:
            text = text_item['text'].strip()
            if text and text[0].isdigit():
                # Simple extraction - in real usage, get from backend
                import re
                match = re.match(r'^(\d+)\.?', text)
                if match:
                    q_num = int(match.group(1))
                    # Try to detect domain
                    from services.parser_service import detect_domain
                    domain = detect_domain(texts)
                    if domain:
                        qid = f"{domain}_q{q_num}"
                        if qid not in question_ids:
                            question_ids.append(qid)
    
    if not question_ids:
        print("⚠️  No question IDs found, using sample IDs")
        question_ids = ["communication_q1", "communication_q2", "gross_motor_q1"]
    
    print(f"📋 Question IDs: {question_ids[:5]}...")
    print()
    
    # 4. Parse with YOLO
    print("🔍 Step 2: Running YOLO + Parser...")
    try:
        answers = parse_answers_with_yolo_paddleocr(pages, question_ids)
        print(f"   ✅ Parsed {len(answers)} answers")
        print()
        
        # 5. Show results
        print("📊 Results:")
        print("-" * 50)
        for qid, answer in answers.items():
            print(f"  {qid}: {answer}")
        print("-" * 50)
        
        return answers
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test YOLO + PaddleOCR parser")
    parser.add_argument(
        "--image",
        type=str,
        default="asq3_pdf_pages/6m/2.png",
        help="Path to test image"
    )
    
    args = parser.parse_args()
    
    if not os.path.exists(args.image):
        print(f"❌ Image not found: {args.image}")
        sys.exit(1)
    
    test_parser(args.image)

