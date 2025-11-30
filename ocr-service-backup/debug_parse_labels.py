#!/usr/bin/env python3
"""
Debug script to test label extraction with actual OCR results
"""
import logging

# Setup logging
logging.basicConfig(level=logging.DEBUG, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Sample OCR result from user (VAN DONG TINH page)
page_texts = [
    {"text": "VAN DONG TINH", "bbox": [45, 23, 157, 21, 157, 41, 45, 43], "conf": 0.95},
    {"text": "1.", "bbox": [44, 67, 65, 67, 65, 83, 44, 83], "conf": 0.90},
    {"text": "Trè có càm dugc dò choi bàng mōt tay khōng?", "bbox": [69, 67, 349, 67, 349, 87, 69, 87], "conf": 0.87},
    {"text": "C□D□K", "bbox": [483, 67, 600, 67, 600, 90, 483, 90], "conf": 0.66},
    {"text": "2.", "bbox": [43, 111, 62, 111, 62, 128, 43, 128], "conf": 0.97},
    {"text": "□c", "bbox": [484, 112, 520, 112, 520, 132, 484, 132], "conf": 0.85},
    {"text": "区D", "bbox": [524, 113, 560, 113, 560, 133, 524, 133], "conf": 0.89},
    {"text": "□", "bbox": [563, 114, 584, 114, 584, 131, 563, 131], "conf": 0.92},
    {"text": "K", "bbox": [582, 114, 596, 114, 596, 130, 582, 130], "conf": 0.96},
]

# Test extract_labels_from_ocr_texts
def test_label_extraction():
    """Test label extraction logic"""
    from services.yolo_checkbox_parser import extract_labels_from_ocr_texts
    from services.parser_service import detect_domain, get_question_numbers
    
    print("\n" + "="*80)
    print("🔍 TESTING LABEL EXTRACTION")
    print("="*80)
    
    # Detect domain
    domain = detect_domain(page_texts)
    print(f"\n📊 Detected domain: {domain}")
    
    # Get question numbers
    question_nums = get_question_numbers(page_texts, domain)
    print(f"📊 Question numbers: {question_nums}")
    
    # Test label extraction
    print("\n" + "-"*80)
    print("Testing extract_labels_from_ocr_texts...")
    print("-"*80)
    
    labels_positions = extract_labels_from_ocr_texts(page_texts, domain)
    
    print(f"\n✅ Found {len(labels_positions)} questions with labels")
    for q_data in labels_positions:
        qid = q_data['question_id']
        labels = q_data.get('labels', [])
        label_types = [l['type'] for l in labels]
        print(f"  {qid}: {label_types}")
    
    # Test with each text item individually
    print("\n" + "-"*80)
    print("Testing text cleaning for each item...")
    print("-"*80)
    
    import re
    for i, text_item in enumerate(page_texts):
        text = text_item['text'].strip()
        text_upper = text.upper().strip()
        
        # Apply same cleaning logic as in yolo_checkbox_parser.py
        text_clean = text_upper.replace('日', 'Đ')
        text_clean = text_clean.replace('□', '').replace('☐', '').replace('☑', '').replace('☒', '')
        text_clean = text_clean.replace('区', '').replace('凶', '').replace('冈', '')
        text_clean = text_clean.replace(' ', '').replace('\t', '').strip()
        
        if domain != 'overall':
            text_clean = text_clean.replace('B', 'Đ')
            text_clean = text_clean.replace('0', 'Đ')
        
        # Extract all valid labels
        found_labels = []
        for char in text_clean:
            char_upper = char.upper()
            if domain == 'overall':
                if char_upper in ['C', 'K']:
                    found_labels.append(char_upper)
            else:
                if char_upper in ['C', 'D', 'Đ', 'K']:
                    label_char = 'D' if char_upper == 'Đ' else char_upper
                    found_labels.append(label_char)
        
        if found_labels:
            print(f"  [{i}] '{text}' → clean: '{text_clean}' → labels: {found_labels}")

if __name__ == "__main__":
    test_label_extraction()

