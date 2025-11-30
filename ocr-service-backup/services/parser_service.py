import re
import unicodedata
import logging
from typing import List, Dict, Any, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)


def normalize_text(text: str) -> str:
    text = text.lower()
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def detect_domain(page_texts: List[Dict[str, Any]]) -> Optional[str]:
    domain_keywords = {
        'communication': [
            'giao tiếp', 'giao tiep', 'giao tiêp', 'giaotiep',
        ],
        'gross_motor': [
            'vận động toàn thân', 'vận động thô', 'van dong toan than', 'van dong tho',
        ],
        'fine_motor': [
            'vận động tinh', 'van dong tinh',
        ],
        'problem_solving': [
            'giải quyết vấn đề', 'giai quyet van de', 'tìm kiếm', 'tim kiem',
        ],
        'personal_social': [
            'cá nhân-xã hội', 'cá nhân xã hội', 'ca nhan xa hoi', 'cười', 'cuoi',
        ],
        'overall': [
            'tổng quan', 'tong quan', 'toan quan', 'tongquan', 'toanquan',
        ],
    }
    
    all_texts = [t['text'] for t in page_texts]
    full_text = ' '.join(all_texts)
    normalized_text = normalize_text(full_text)
    
    # Kiểm tra overall trước (vì nó có thể xuất hiện cùng với domain khác)
    for keyword in domain_keywords['overall']:
        normalized_keyword = normalize_text(keyword)
        if normalized_keyword in normalized_text:
            logger.debug(f"Detected overall domain with keyword: {keyword}")
            return 'overall'
    
    # Kiểm tra thêm với text gốc (không normalize) để catch "TONG QUAN"
    all_texts_upper = ' '.join([t['text'].upper() for t in page_texts])
    if 'TONG QUAN' in all_texts_upper or 'TỔNG QUAN' in all_texts_upper:
        logger.debug("Detected overall domain from uppercase text")
        return 'overall'
    
    matched_domains = []
    for domain, keywords in domain_keywords.items():
        if domain == 'overall':
            continue
        for keyword in keywords:
            normalized_keyword = normalize_text(keyword)
            if normalized_keyword in normalized_text:
                matched_domains.append(domain)
                break
    
    if len(matched_domains) == 1:
        return matched_domains[0]
    elif len(matched_domains) == 2:
        if 'problem_solving' in matched_domains and 'personal_social' in matched_domains:
            return None
        return matched_domains[0]
    return None


def get_question_numbers(page_texts: List[Dict[str, Any]], domain: Optional[str] = None) -> List[int]:
    question_nums = set()
    max_num = 6  # Domain questions có tối đa 6 câu
    if domain == 'overall':
        max_num = 8  # Overall questions có tối đa 8 câu
    
    for text_item in page_texts:
        text = text_item['text'].strip()
        match = re.match(r'^(\d+)\.?', text)
        if match:
            num = int(match.group(1))
            if 1 <= num <= max_num:
                question_nums.add(num)
    return sorted(list(question_nums))


def get_bbox_y(bbox: List[int]) -> int:
    return min(bbox[i] for i in range(1, len(bbox), 2))


def get_bbox_x(bbox: List[int]) -> int:
    return min(bbox[i] for i in range(0, len(bbox), 2))


def is_mark(text: str, conf: float) -> bool:
    text_lower = text.lower()
    mark_patterns = ['x', '×', '✓', '✗', 'v', '/', '\\', '+', '*', '广', '区', '口', '日', '冈', '凶']
    is_checkbox_symbol = text in ['☐', '□', '☑', '☒']
    
    if is_checkbox_symbol:
        return False
    
    # FIX 1: Loại bỏ các "fake mark" chứa chữ (OCR noise)
    # Nếu text có độ dài > 1 và chứa chữ cái (a-z, A-Z) → không phải mark → loại bỏ ngay
    if len(text) > 1 and re.search(r'[a-zA-Z]', text_lower):
        return False
    
    # FIX 1 (bổ sung): Loại bỏ các text có nhiều ký tự mark kết hợp (như "区日", "区c", v.v.)
    # Nếu text có độ dài > 1 và chứa nhiều ký tự mark, có thể là OCR noise
    if len(text) > 1:
        mark_count = sum(1 for pattern in mark_patterns if pattern in text)
        # Nếu có nhiều hơn 1 mark pattern trong text, có thể là OCR noise
        if mark_count > 1:
            return False
    
    # Loại bỏ các ký tự có thể là label bị OCR nhầm
    # "c", "d", "k" thường là labels "C", "Đ", "K" bị OCR nhận diện sai, không phải mark
    if text_lower in ['c', 'd', 'k']:
        return False
    
    # Nếu text chứa "c", "d", "k" và không chứa mark thực sự, loại bỏ
    if any(char in text_lower for char in ['c', 'd', 'k']):
        # Kiểm tra xem text có chứa mark thực sự không
        has_real_mark = any(pattern in text for pattern in mark_patterns)
        if not has_real_mark:
            return False
    
    if text in mark_patterns or text_lower in mark_patterns:
        return conf > 0.15  # Lower threshold from 0.2 to 0.15
    
    # Chỉ nhận diện là mark nếu confidence rất thấp (< 0.4) và không phải label
    if len(text) == 1 and 0.15 < conf < 0.4:  # Lower threshold from 0.2 to 0.15
        return True
    
    return False


def parse_answer_for_question(
    page_texts: List[Dict[str, Any]],
    question_num: int,
    domain: Optional[str] = None
) -> Optional[str]:
    logger.debug(f"Parsing question {domain}_{question_num}")
    question_text = None
    for text_item in page_texts:
        text = text_item['text'].strip()
        match = re.match(r'^(\d+)\.?', text)
        if match and int(match.group(1)) == question_num:
            question_text = text_item
            break
    
    if not question_text:
        logger.debug(f"Question text for {domain}_{question_num} not found")
        return None
    
    question_y = get_bbox_y(question_text['bbox'])
    question_y_max = max(question_text['bbox'][i] for i in range(1, len(question_text['bbox']), 2))
    
    label_texts = []
    for text_item in page_texts:
        text = text_item['text'].strip()
        # FIX 2: Domain "overall" chỉ có C và K, không có Đ
        if domain == 'overall':
            # Chỉ nhận label C và K cho domain overall
            if text.lower() not in ['c', 'k']:
                continue
        # More lenient label matching - handle OCR artifacts
        text_upper = text.upper().strip()
        text_clean = text_upper.replace('□', '').replace('☐', '').replace('☑', '').replace('☒', '')
        
        if text_clean in ['C', 'D', 'Đ', 'K']:
            label_y = get_bbox_y(text_item['bbox'])
            label_x = get_bbox_x(text_item['bbox'])
            question_x = get_bbox_x(question_text['bbox'])
            
            # Increase Y tolerance for larger images - be more lenient
            y_tolerance = 60 if question_y_max - question_y > 30 else 40
            # Check Y position and ensure label is to the right of question
            # Allow labels slightly to the left if very close (OCR positioning error)
            x_tolerance = 50  # Allow labels up to 50px to the left
            if question_y - 25 <= label_y <= question_y_max + y_tolerance and (label_x > question_x - x_tolerance):
                label_texts.append(text_item)
    
    if not label_texts:
        logger.debug(f"No labels found near question {domain}_{question_num}")
        return None
    
    label_texts.sort(key=lambda t: get_bbox_x(t['bbox']))
    
    checkbox_ranges = []
    for label in label_texts:
        label_x = get_bbox_x(label['bbox'])
        label_y = get_bbox_y(label['bbox'])
        label_text = label['text'].strip().lower()
        
        # Overall questions chỉ có C (Y) và K (N), không có Đ (S)
        if domain == 'overall':
            # FIX 2: Đảm bảo chỉ xử lý C và K
            if label_text not in ['c', 'k']:
                continue
            if label_text == 'k':
                answer = 'N'
            else:  # C
                answer = 'Y'
        else:
            # Domain questions có C (Y), Đ (S), K (N)
            answer = 'Y'
            if label_text in ['đ', 'd']:
                answer = 'S'
            elif label_text == 'k':
                answer = 'N'
        
        checkbox_size = 18
        gap = 4
        checkbox_left = label_x - checkbox_size - gap
        checkbox_right = label_x - gap
        
        # Increase margin for larger images to catch more marks
        x_margin = 25 if question_y_max - question_y > 30 else 18
        checkbox_ranges.append({
            'min_x': checkbox_left - x_margin,
            'max_x': checkbox_right + x_margin,
            'answer': answer,
            'label_x': label_x,
            'label_y': label_y
        })
    
    checkbox_symbols = []
    for text_item in page_texts:
        text = text_item['text'].strip()
        if text in ['☐', '□', '☑', '☒']:
            x = get_bbox_x(text_item['bbox'])
            y = get_bbox_y(text_item['bbox'])
            bbox = text_item['bbox']
            symbol_left = min(bbox[i] for i in range(0, len(bbox), 2))
            symbol_right = max(bbox[i] for i in range(0, len(bbox), 2))
            symbol_top = min(bbox[i] for i in range(1, len(bbox), 2))
            symbol_bottom = max(bbox[i] for i in range(1, len(bbox), 2))
            
            if question_y - 15 <= y <= question_y_max + 10:
                for cb_range in checkbox_ranges:
                    if cb_range['min_x'] <= x <= cb_range['max_x']:
                        checkbox_symbols.append({
                            'x': x,
                            'y': y,
                            'left': symbol_left,
                            'right': symbol_right,
                            'top': symbol_top,
                            'bottom': symbol_bottom,
                            'bbox': bbox,
                            'answer': cb_range['answer'],
                            'range': cb_range
                        })
    
    candidate_marks = []
    for text_item in page_texts:
        text = text_item['text'].strip()
        y = get_bbox_y(text_item['bbox'])
        x = get_bbox_x(text_item['bbox'])
        conf = text_item.get('conf', 1.0)
        
        # Increase Y tolerance for marks - be more lenient
        y_tolerance = 30 if question_y_max - question_y > 30 else 25
        is_near = question_y - y_tolerance <= y <= question_y_max + y_tolerance
        
        # More lenient label detection - handle OCR artifacts
        text_clean = text.upper().replace('□', '').replace('☐', '').replace('☑', '').replace('☒', '').strip()
        is_label = text_clean in ['C', 'D', 'Đ', 'K']
        is_checkbox_symbol = text in ['☐', '□', '☑', '☒']
        
        if is_near and not is_label and not is_checkbox_symbol and is_mark(text, conf):
            # Check all checkbox ranges to find the best match
            # Ưu tiên label distance hơn nữa để đảm bảo match đúng checkbox
            best_match = None
            best_label_dist = float('inf')
            best_symbol_dist = 1000
            best_is_in_box = False
            best_symbol = None
            
            # Tìm tất cả các checkbox ranges có thể match (dựa trên X position hoặc label distance)
            possible_ranges = []
            for cb_range in checkbox_ranges:
                label_dist = abs(x - cb_range['label_x']) + abs(y - cb_range['label_y'])
                # Nếu mark nằm trong X range hoặc label distance < 60px, có thể là match
                # Giảm threshold từ 80px xuống 60px để chính xác hơn
                if cb_range['min_x'] <= x <= cb_range['max_x'] or label_dist < 60:
                    possible_ranges.append((cb_range, label_dist))
            
            # Tìm checkbox range tốt nhất trong các ranges có thể
            for cb_range, label_dist in possible_ranges:
                min_symbol_dist = None
                is_in_checkbox_box = False
                closest_symbol = None
                
                for symbol in checkbox_symbols:
                    if symbol['range'] == cb_range:
                        symbol_x = symbol['x']
                        symbol_y = symbol['y']
                        symbol_left = symbol['left']
                        symbol_right = symbol['right']
                        symbol_top = symbol['top']
                        symbol_bottom = symbol['bottom']
                        
                        symbol_dist = abs(x - symbol_x) + abs(y - symbol_y)
                        
                        margin = 10  # Giảm xuống 10px để chính xác hơn, tránh nhầm lẫn giữa các checkbox
                        if (symbol_left - margin <= x <= symbol_right + margin and
                            symbol_top - margin <= y <= symbol_bottom + margin):
                            is_in_checkbox_box = True
                            if min_symbol_dist is None or symbol_dist < min_symbol_dist:
                                min_symbol_dist = symbol_dist
                                closest_symbol = symbol
                        elif min_symbol_dist is None or symbol_dist < min_symbol_dist:
                            min_symbol_dist = symbol_dist
                            closest_symbol = symbol
                
                # Nếu không tìm thấy symbol, vẫn có thể match dựa trên label distance
                if min_symbol_dist is None:
                    min_symbol_dist = label_dist
                
                # Ưu tiên: 1) Label distance nhỏ nhất (quan trọng nhất), 2) Marks trong checkbox box
                is_better = False
                
                # Nếu label distance nhỏ hơn đáng kể (>20%), luôn ưu tiên
                if label_dist < best_label_dist * 0.8:
                    is_better = True
                # Nếu label distance chênh lệch > 5px, luôn ưu tiên label distance nhỏ hơn
                elif best_label_dist != float('inf') and best_label_dist - label_dist > 5:
                    is_better = True
                elif label_dist < best_label_dist:
                    # Nếu label distance nhỏ hơn, kiểm tra thêm
                    if is_in_checkbox_box:
                        # Nếu mark trong box và label gần hơn, ưu tiên
                        if not best_is_in_box:
                            is_better = True
                        elif min_symbol_dist < best_symbol_dist * 1.2:
                            is_better = True
                    elif not best_is_in_box:
                        # Cả hai đều không trong box, label gần hơn thì ưu tiên
                        is_better = True
                    # Nếu best_match trong box nhưng label distance nhỏ hơn, vẫn ưu tiên nếu chênh lệch đáng kể (>10%)
                    elif label_dist < best_label_dist * 0.9:
                        is_better = True
                elif is_in_checkbox_box and not best_is_in_box:
                    # Nếu mark trong box nhưng label distance không nhỏ hơn, chỉ ưu tiên nếu label distance tương đương (trong 2%)
                    if label_dist < best_label_dist * 1.02:
                        is_better = True
                
                if is_better:
                    best_match = cb_range
                    best_label_dist = label_dist
                    best_symbol_dist = min_symbol_dist
                    best_is_in_box = is_in_checkbox_box
                    best_symbol = closest_symbol
            
            if best_match:
                dist = abs(y - question_y)
                label_dist = best_label_dist
                candidate_marks.append({
                    'text': text,
                    'x': x,
                    'y': y,
                    'conf': conf,
                    'dist': dist,
                    'symbol_dist': best_symbol_dist,
                    'label_dist': label_dist,  # Lưu khoảng cách đến label
                    'is_in_checkbox_box': best_is_in_box,
                    'answer': best_match['answer'],
                    'symbol': best_symbol  # Lưu thông tin checkbox symbol để validate sau
                })
    
    if candidate_marks:
        # Group marks by answer type TRƯỚC, sau đó chọn answer type tốt nhất
        marks_by_answer = {}
        for m in candidate_marks:
            answer = m['answer']
            if answer not in marks_by_answer:
                marks_by_answer[answer] = []
            marks_by_answer[answer].append(m)
        
        # Chọn answer type dựa trên:
        # 1. Label distance nhỏ nhất (quan trọng nhất để xác định đáp án đúng)
        # 2. Có mark trong checkbox box
        # 3. Có mark thực sự (区, 冈, X) - không phải ký tự có thể bị nhầm lẫn
        best_answer = None
        best_score = (float('inf'), False, False)  # (min_label_dist, has_mark_in_box, has_real_mark)
        
        # Định nghĩa các mark thực sự (không phải ký tự có thể bị nhầm lẫn)
        real_mark_patterns = ['x', '×', '✓', '✗', 'v', '广', '区', '口', '日', '冈', '凶', '/', '\\', '+', '*']
        
        for answer, marks in marks_by_answer.items():
            # Tìm mark tốt nhất trong answer type này
            marks_in_box = [m for m in marks if m['is_in_checkbox_box']]
            has_mark_in_box = len(marks_in_box) > 0
            
            # Kiểm tra xem có mark thực sự không (không phải ký tự có thể bị nhầm lẫn)
            has_real_mark = any(m['text'].lower() in real_mark_patterns for m in marks)
            
            # Tìm label_dist nhỏ nhất trong answer type này
            min_label_dist = min(m.get('label_dist', 1000) for m in marks)
            
            # Score: (min_label_dist, has_mark_in_box, has_real_mark)
            # Ưu tiên: 1) label_dist nhỏ nhất, 2) mark trong box, 3) có mark thực sự
            current_score = (min_label_dist, has_mark_in_box, has_real_mark)
            
            # So sánh: ưu tiên label_dist trước, sau đó mark trong box, cuối cùng là mark thực sự
            # Nếu label distance nhỏ hơn đáng kể (>10%), luôn ưu tiên
            if min_label_dist < best_score[0] * 0.9:
                best_score = current_score
                best_answer = answer
            # Nếu label distance chênh lệch > 5px, luôn ưu tiên label distance nhỏ hơn
            elif best_score[0] != float('inf') and best_score[0] - min_label_dist > 5:
                best_score = current_score
                best_answer = answer
            elif min_label_dist < best_score[0]:
                # Nếu label distance nhỏ hơn, kiểm tra thêm
                if has_mark_in_box:
                    # Nếu mark trong box và label gần hơn, ưu tiên
                    if not best_score[1]:
                        best_score = current_score
                        best_answer = answer
                    elif has_real_mark and not best_score[2]:
                        best_score = current_score
                        best_answer = answer
                    elif has_real_mark == best_score[2]:
                        best_score = current_score
                        best_answer = answer
                elif not best_score[1]:
                    # Cả hai đều không trong box, label gần hơn thì ưu tiên
                    if has_real_mark and not best_score[2]:
                        best_score = current_score
                        best_answer = answer
                    elif has_real_mark == best_score[2]:
                        best_score = current_score
                        best_answer = answer
                # Nếu best_match trong box nhưng label distance nhỏ hơn, vẫn ưu tiên nếu chênh lệch đáng kể (>5%)
                elif min_label_dist < best_score[0] * 0.95:
                    best_score = current_score
                    best_answer = answer
            elif has_mark_in_box and not best_score[1]:
                # Nếu mark trong box nhưng label distance không nhỏ hơn, chỉ ưu tiên nếu label distance tương đương (trong 2%)
                if min_label_dist < best_score[0] * 1.02:
                    best_score = current_score
                    best_answer = answer
        
        # Chọn mark tốt nhất trong answer type đã chọn
        if best_answer:
            best_marks = marks_by_answer[best_answer]
            
            # Định nghĩa các mark thực sự (không phải ký tự có thể bị nhầm lẫn)
            real_mark_patterns = ['x', '×', '✓', '✗', 'v', '广', '区', '口', '日', '冈', '凶', '/', '\\', '+', '*']
            
            # FIX 3: Ưu tiên mark thực sự (X, ×, 区, 冈, 凶...)
            # Kiểm tra xem mark có chứa ký tự mark thực sự không
            def is_real_mark(text: str) -> bool:
                text_lower = text.lower()
                # Kiểm tra nếu text là mark thực sự hoặc chứa mark thực sự
                if text_lower in real_mark_patterns:
                    return True
                # Kiểm tra nếu text chứa bất kỳ mark pattern nào
                return any(pattern in text for pattern in real_mark_patterns)
            
            # Ưu tiên marks trong box trước, sau đó ưu tiên mark thực sự
            marks_in_box = [m for m in best_marks if m['is_in_checkbox_box']]
            if marks_in_box:
                # Trong box: ưu tiên mark thực sự
                real_marks_in_box = [m for m in marks_in_box if is_real_mark(m['text'])]
                if real_marks_in_box:
                    best_marks = real_marks_in_box
                else:
                    best_marks = marks_in_box
            else:
                # Không trong box: ưu tiên mark thực sự
                real_marks = [m for m in best_marks if is_real_mark(m['text'])]
                if real_marks:
                    best_marks = real_marks
            
            # Sort: ưu tiên mark thực sự, sau đó label_dist, symbol_dist, dist, conf
            best_marks.sort(key=lambda m: (
                not is_real_mark(m['text']),  # Ưu tiên mark thực sự (False = mark thực sự)
                m.get('label_dist', 1000),    # Sau đó gần label nhất
                m['symbol_dist'],             # Sau đó gần checkbox symbol
                m['dist'],                    # Sau đó gần question text
                -m['conf']                    # Cuối cùng là confidence cao
            ))
            best_mark = best_marks[0]
            if best_mark['dist'] < 100:
                logger.debug(f"Selected mark for {domain}_{question_num}: {best_mark['answer']} (text={best_mark['text']}, label_dist={best_mark.get('label_dist', 1000):.1f}, symbol_dist={best_mark['symbol_dist']:.1f}, in_box={best_mark['is_in_checkbox_box']})")
                return best_mark['answer']
    
    fallback_marks = []
    for cb_range in checkbox_ranges:
        range_marks = []
        for text_item in page_texts:
            text = text_item['text'].strip()
            x = get_bbox_x(text_item['bbox'])
            y = get_bbox_y(text_item['bbox'])
            conf = text_item.get('conf', 1.0)
            
            is_label = text in ['C', 'c', 'Đ', 'đ', 'D', 'd', 'K', 'k']
            is_checkbox_symbol = text in ['☐', '□', '☑', '☒']
            
            # Increase Y tolerance for marks
            y_tolerance = 30 if question_y_max - question_y > 30 else 25
            x_margin = 25 if question_y_max - question_y > 30 else 18
            if (cb_range['min_x'] - x_margin <= x <= cb_range['max_x'] + x_margin and
                question_y - y_tolerance <= y <= question_y_max + y_tolerance and
                not is_label and not is_checkbox_symbol and is_mark(text, conf)):
                dist = abs(y - question_y)
                range_marks.append({
                    'text': text,
                    'x': x,
                    'y': y,
                    'conf': conf,
                    'dist': dist,
                    'answer': cb_range['answer']
                })
        
        if range_marks:
            range_marks.sort(key=lambda m: (m['dist'], -m['conf']))
            fallback_marks.append(range_marks[0])
    
    if fallback_marks:
        fallback_marks.sort(key=lambda m: (m['dist'], -m['conf']))
        return fallback_marks[0]['answer']
    
    return None


def calculate_average_spacing(question_ys: List[Dict[str, int]]) -> float:
    if len(question_ys) < 2:
        return 100.0
    
    spacings = []
    sorted_ys = sorted(question_ys, key=lambda q: q['num'])
    
    for i in range(1, len(sorted_ys)):
        if sorted_ys[i]['num'] == sorted_ys[i-1]['num'] + 1:
            spacings.append(sorted_ys[i]['y'] - sorted_ys[i-1]['y'])
    
    return sum(spacings) / len(spacings) if spacings else 100.0


def parse_answer_by_inferred_position(
    page_texts: List[Dict[str, Any]],
    question_num: int,
    inferred_y: float,
    domain: Optional[str] = None
) -> Optional[str]:
    question_y = int(inferred_y)
    question_y_max = question_y + 80
    
    label_texts = []
    for text_item in page_texts:
        text = text_item['text'].strip()
        # FIX 2: Domain "overall" chỉ có C và K, không có Đ
        if domain == 'overall':
            # Chỉ nhận label C và K cho domain overall
            if text.lower() not in ['c', 'k']:
                continue
        if text in ['C', 'c', 'Đ', 'đ', 'D', 'd', 'K', 'k']:
            label_y = get_bbox_y(text_item['bbox'])
            if question_y - 10 <= label_y <= question_y_max:
                label_texts.append(text_item)
    
    if not label_texts:
        return None
    
    label_texts.sort(key=lambda t: get_bbox_x(t['bbox']))
    
    checkbox_ranges = []
    for label in label_texts:
        label_x = get_bbox_x(label['bbox'])
        label_y = get_bbox_y(label['bbox'])
        label_text = label['text'].strip().lower()
        
        # Overall questions chỉ có C (Y) và K (N), không có Đ (S)
        if domain == 'overall':
            # FIX 2: Đảm bảo chỉ xử lý C và K
            if label_text not in ['c', 'k']:
                continue
            if label_text == 'k':
                answer = 'N'
            else:  # C
                answer = 'Y'
        else:
            # Domain questions có C (Y), Đ (S), K (N)
            answer = 'Y'
            if label_text in ['đ', 'd']:
                answer = 'S'
            elif label_text == 'k':
                answer = 'N'
        
        checkbox_size = 18
        gap = 4
        checkbox_left = label_x - checkbox_size - gap
        checkbox_right = label_x - gap
        
        # Increase margin for larger images to catch more marks
        x_margin = 25 if question_y_max - question_y > 30 else 18
        checkbox_ranges.append({
            'min_x': checkbox_left - x_margin,
            'max_x': checkbox_right + x_margin,
            'answer': answer,
            'label_x': label_x,
            'label_y': label_y
        })
    
    checkbox_symbols = []
    for text_item in page_texts:
        text = text_item['text'].strip()
        if text in ['☐', '□', '☑', '☒']:
            x = get_bbox_x(text_item['bbox'])
            y = get_bbox_y(text_item['bbox'])
            bbox = text_item['bbox']
            symbol_left = min(bbox[i] for i in range(0, len(bbox), 2))
            symbol_right = max(bbox[i] for i in range(0, len(bbox), 2))
            symbol_top = min(bbox[i] for i in range(1, len(bbox), 2))
            symbol_bottom = max(bbox[i] for i in range(1, len(bbox), 2))
            
            if question_y - 15 <= y <= question_y_max + 10:
                for cb_range in checkbox_ranges:
                    if cb_range['min_x'] <= x <= cb_range['max_x']:
                        checkbox_symbols.append({
                            'x': x,
                            'y': y,
                            'left': symbol_left,
                            'right': symbol_right,
                            'top': symbol_top,
                            'bottom': symbol_bottom,
                            'bbox': bbox,
                            'answer': cb_range['answer'],
                            'range': cb_range
                        })
    
    candidate_marks = []
    for text_item in page_texts:
        text = text_item['text'].strip()
        y = get_bbox_y(text_item['bbox'])
        x = get_bbox_x(text_item['bbox'])
        conf = text_item.get('conf', 1.0)
        
        # Increase Y tolerance for marks - be more lenient
        y_tolerance = 30 if question_y_max - question_y > 30 else 25
        is_near = question_y - y_tolerance <= y <= question_y_max + y_tolerance
        
        # More lenient label detection - handle OCR artifacts
        text_clean = text.upper().replace('□', '').replace('☐', '').replace('☑', '').replace('☒', '').strip()
        is_label = text_clean in ['C', 'D', 'Đ', 'K']
        is_checkbox_symbol = text in ['☐', '□', '☑', '☒']
        
        if is_near and not is_label and not is_checkbox_symbol and is_mark(text, conf):
            # Check all checkbox ranges to find the best match
            # Ưu tiên label distance hơn nữa để đảm bảo match đúng checkbox
            best_match = None
            best_label_dist = float('inf')
            best_symbol_dist = 1000
            best_is_in_box = False
            best_symbol = None
            
            # Tìm tất cả các checkbox ranges có thể match (dựa trên X position hoặc label distance)
            possible_ranges = []
            for cb_range in checkbox_ranges:
                label_dist = abs(x - cb_range['label_x']) + abs(y - cb_range['label_y'])
                # Nếu mark nằm trong X range hoặc label distance < 60px, có thể là match
                # Giảm threshold từ 80px xuống 60px để chính xác hơn
                if cb_range['min_x'] <= x <= cb_range['max_x'] or label_dist < 60:
                    possible_ranges.append((cb_range, label_dist))
            
            # Tìm checkbox range tốt nhất trong các ranges có thể
            for cb_range, label_dist in possible_ranges:
                min_symbol_dist = None
                is_in_checkbox_box = False
                closest_symbol = None
                
                for symbol in checkbox_symbols:
                    if symbol['range'] == cb_range:
                        symbol_x = symbol['x']
                        symbol_y = symbol['y']
                        symbol_left = symbol['left']
                        symbol_right = symbol['right']
                        symbol_top = symbol['top']
                        symbol_bottom = symbol['bottom']
                        
                        symbol_dist = abs(x - symbol_x) + abs(y - symbol_y)
                        
                        margin = 10  # Giảm xuống 10px để chính xác hơn, tránh nhầm lẫn giữa các checkbox
                        if (symbol_left - margin <= x <= symbol_right + margin and
                            symbol_top - margin <= y <= symbol_bottom + margin):
                            is_in_checkbox_box = True
                            if min_symbol_dist is None or symbol_dist < min_symbol_dist:
                                min_symbol_dist = symbol_dist
                                closest_symbol = symbol
                        elif min_symbol_dist is None or symbol_dist < min_symbol_dist:
                            min_symbol_dist = symbol_dist
                            closest_symbol = symbol
                
                # Nếu không tìm thấy symbol, vẫn có thể match dựa trên label distance
                if min_symbol_dist is None:
                    min_symbol_dist = label_dist
                
                # Ưu tiên: 1) Label distance nhỏ nhất (quan trọng nhất), 2) Marks trong checkbox box
                is_better = False
                
                # Nếu label distance nhỏ hơn đáng kể (>20%), luôn ưu tiên
                if label_dist < best_label_dist * 0.8:
                    is_better = True
                # Nếu label distance chênh lệch > 5px, luôn ưu tiên label distance nhỏ hơn
                elif best_label_dist != float('inf') and best_label_dist - label_dist > 5:
                    is_better = True
                elif label_dist < best_label_dist:
                    # Nếu label distance nhỏ hơn, kiểm tra thêm
                    if is_in_checkbox_box:
                        # Nếu mark trong box và label gần hơn, ưu tiên
                        if not best_is_in_box:
                            is_better = True
                        elif min_symbol_dist < best_symbol_dist * 1.2:
                            is_better = True
                    elif not best_is_in_box:
                        # Cả hai đều không trong box, label gần hơn thì ưu tiên
                        is_better = True
                    # Nếu best_match trong box nhưng label distance nhỏ hơn, vẫn ưu tiên nếu chênh lệch đáng kể (>10%)
                    elif label_dist < best_label_dist * 0.9:
                        is_better = True
                elif is_in_checkbox_box and not best_is_in_box:
                    # Nếu mark trong box nhưng label distance không nhỏ hơn, chỉ ưu tiên nếu label distance tương đương (trong 2%)
                    if label_dist < best_label_dist * 1.02:
                        is_better = True
                
                if is_better:
                    best_match = cb_range
                    best_label_dist = label_dist
                    best_symbol_dist = min_symbol_dist
                    best_is_in_box = is_in_checkbox_box
                    best_symbol = closest_symbol
            
            if best_match:
                dist = abs(y - question_y)
                label_dist = best_label_dist
                candidate_marks.append({
                    'text': text,
                    'x': x,
                    'y': y,
                    'conf': conf,
                    'dist': dist,
                    'symbol_dist': best_symbol_dist,
                    'label_dist': label_dist,  # Lưu khoảng cách đến label
                    'is_in_checkbox_box': best_is_in_box,
                    'answer': best_match['answer'],
                    'symbol': best_symbol  # Lưu thông tin checkbox symbol để validate sau
                })
    
    if candidate_marks:
        # Group marks by answer type TRƯỚC, sau đó chọn answer type tốt nhất
        marks_by_answer = {}
        for m in candidate_marks:
            answer = m['answer']
            if answer not in marks_by_answer:
                marks_by_answer[answer] = []
            marks_by_answer[answer].append(m)
        
        # Chọn answer type dựa trên:
        # 1. Label distance nhỏ nhất (quan trọng nhất để xác định đáp án đúng)
        # 2. Có mark trong checkbox box
        # 3. Có mark thực sự (区, 冈, X) - không phải ký tự có thể bị nhầm lẫn
        best_answer = None
        best_score = (float('inf'), False, False)  # (min_label_dist, has_mark_in_box, has_real_mark)
        
        # Định nghĩa các mark thực sự (không phải ký tự có thể bị nhầm lẫn)
        real_mark_patterns = ['x', '×', '✓', '✗', 'v', '广', '区', '口', '日', '冈', '凶', '/', '\\', '+', '*']
        
        for answer, marks in marks_by_answer.items():
            # Tìm mark tốt nhất trong answer type này
            marks_in_box = [m for m in marks if m['is_in_checkbox_box']]
            has_mark_in_box = len(marks_in_box) > 0
            
            # Kiểm tra xem có mark thực sự không (không phải ký tự có thể bị nhầm lẫn)
            has_real_mark = any(m['text'].lower() in real_mark_patterns for m in marks)
            
            # Tìm label_dist nhỏ nhất trong answer type này
            min_label_dist = min(m.get('label_dist', 1000) for m in marks)
            
            # Score: (min_label_dist, has_mark_in_box, has_real_mark)
            # Ưu tiên: 1) label_dist nhỏ nhất, 2) mark trong box, 3) có mark thực sự
            current_score = (min_label_dist, has_mark_in_box, has_real_mark)
            
            # So sánh: ưu tiên label_dist trước, sau đó mark trong box, cuối cùng là mark thực sự
            # Nếu label distance nhỏ hơn đáng kể (>10%), luôn ưu tiên
            if min_label_dist < best_score[0] * 0.9:
                best_score = current_score
                best_answer = answer
            # Nếu label distance chênh lệch > 5px, luôn ưu tiên label distance nhỏ hơn
            elif best_score[0] != float('inf') and best_score[0] - min_label_dist > 5:
                best_score = current_score
                best_answer = answer
            elif min_label_dist < best_score[0]:
                # Nếu label distance nhỏ hơn, kiểm tra thêm
                if has_mark_in_box:
                    # Nếu mark trong box và label gần hơn, ưu tiên
                    if not best_score[1]:
                        best_score = current_score
                        best_answer = answer
                    elif has_real_mark and not best_score[2]:
                        best_score = current_score
                        best_answer = answer
                    elif has_real_mark == best_score[2]:
                        best_score = current_score
                        best_answer = answer
                elif not best_score[1]:
                    # Cả hai đều không trong box, label gần hơn thì ưu tiên
                    if has_real_mark and not best_score[2]:
                        best_score = current_score
                        best_answer = answer
                    elif has_real_mark == best_score[2]:
                        best_score = current_score
                        best_answer = answer
                # Nếu best_match trong box nhưng label distance nhỏ hơn, vẫn ưu tiên nếu chênh lệch đáng kể (>5%)
                elif min_label_dist < best_score[0] * 0.95:
                    best_score = current_score
                    best_answer = answer
            elif has_mark_in_box and not best_score[1]:
                # Nếu mark trong box nhưng label distance không nhỏ hơn, chỉ ưu tiên nếu label distance tương đương (trong 2%)
                if min_label_dist < best_score[0] * 1.02:
                    best_score = current_score
                    best_answer = answer
        
        # Chọn mark tốt nhất trong answer type đã chọn
        if best_answer:
            best_marks = marks_by_answer[best_answer]
            
            # Định nghĩa các mark thực sự (không phải ký tự có thể bị nhầm lẫn)
            real_mark_patterns = ['x', '×', '✓', '✗', 'v', '广', '区', '口', '日', '冈', '凶', '/', '\\', '+', '*']
            
            # FIX 3: Ưu tiên mark thực sự (X, ×, 区, 冈, 凶...)
            # Kiểm tra xem mark có chứa ký tự mark thực sự không
            def is_real_mark(text: str) -> bool:
                text_lower = text.lower()
                # Kiểm tra nếu text là mark thực sự hoặc chứa mark thực sự
                if text_lower in real_mark_patterns:
                    return True
                # Kiểm tra nếu text chứa bất kỳ mark pattern nào
                return any(pattern in text for pattern in real_mark_patterns)
            
            # Ưu tiên marks trong box trước, sau đó ưu tiên mark thực sự
            marks_in_box = [m for m in best_marks if m['is_in_checkbox_box']]
            if marks_in_box:
                # Trong box: ưu tiên mark thực sự
                real_marks_in_box = [m for m in marks_in_box if is_real_mark(m['text'])]
                if real_marks_in_box:
                    best_marks = real_marks_in_box
                else:
                    best_marks = marks_in_box
            else:
                # Không trong box: ưu tiên mark thực sự
                real_marks = [m for m in best_marks if is_real_mark(m['text'])]
                if real_marks:
                    best_marks = real_marks
            
            # Sort: ưu tiên mark thực sự, sau đó label_dist, symbol_dist, dist, conf
            best_marks.sort(key=lambda m: (
                not is_real_mark(m['text']),  # Ưu tiên mark thực sự (False = mark thực sự)
                m.get('label_dist', 1000),    # Sau đó gần label nhất
                m['symbol_dist'],             # Sau đó gần checkbox symbol
                m['dist'],                    # Sau đó gần question text
                -m['conf']                    # Cuối cùng là confidence cao
            ))
            best_mark = best_marks[0]
            if best_mark['dist'] < 100:
                logger.debug(f"Selected mark for {domain}_{question_num}: {best_mark['answer']} (text={best_mark['text']}, label_dist={best_mark.get('label_dist', 1000):.1f}, symbol_dist={best_mark['symbol_dist']:.1f}, in_box={best_mark['is_in_checkbox_box']})")
                return best_mark['answer']
    
    fallback_marks = []
    for cb_range in checkbox_ranges:
        range_marks = []
        for text_item in page_texts:
            text = text_item['text'].strip()
            x = get_bbox_x(text_item['bbox'])
            y = get_bbox_y(text_item['bbox'])
            conf = text_item.get('conf', 1.0)
            
            is_label = text in ['C', 'c', 'Đ', 'đ', 'D', 'd', 'K', 'k']
            is_checkbox_symbol = text in ['☐', '□', '☑', '☒']
            
            # Increase Y tolerance for marks
            y_tolerance = 30 if question_y_max - question_y > 30 else 25
            x_margin = 25 if question_y_max - question_y > 30 else 18
            if (cb_range['min_x'] - x_margin <= x <= cb_range['max_x'] + x_margin and
                question_y - y_tolerance <= y <= question_y_max + y_tolerance and
                not is_label and not is_checkbox_symbol and is_mark(text, conf)):
                dist = abs(y - question_y)
                range_marks.append({
                    'text': text,
                    'x': x,
                    'y': y,
                    'conf': conf,
                    'dist': dist,
                    'answer': cb_range['answer']
                })
        
        if range_marks:
            range_marks.sort(key=lambda m: (m['dist'], -m['conf']))
            fallback_marks.append(range_marks[0])
    
    if fallback_marks:
        fallback_marks.sort(key=lambda m: (m['dist'], -m['conf']))
        return fallback_marks[0]['answer']
    
    return None


def parse_answers_from_pages(
    pages: List[Dict[str, Any]],
    question_ids: List[str]
) -> Dict[str, str]:
    answers = {}
    split_page_info: Optional[Dict[str, Any]] = None
    
    for page_idx, page in enumerate(pages):
        page_texts = page.get('texts', [])
        domain = detect_domain(page_texts)
        question_numbers = get_question_numbers(page_texts, domain)
        
        if domain:
            logger.debug(f"Page {page_idx}: domain={domain}, question_numbers={question_numbers}")
        
        if not question_numbers:
            continue
        
        if domain is None:
            matched_domains = []
            all_texts = [t['text'] for t in page_texts]
            full_text = ' '.join(all_texts)
            normalized_text = normalize_text(full_text)
            
            domain_keywords = {
                'problem_solving': ['giải quyết vấn đề', 'giai quyet van de'],
                'personal_social': ['cá nhân-xã hội', 'ca nhan xa hoi'],
            }
            
            for dom, keywords in domain_keywords.items():
                for keyword in keywords:
                    if normalize_text(keyword) in normalized_text:
                        matched_domains.append(dom)
                        break
            
            if len(matched_domains) == 2:
                question_ys = []
                for text_item in page_texts:
                    text = text_item['text'].strip()
                    match = re.match(r'^(\d+)\.?', text)
                    if match:
                        num = int(match.group(1))
                        if 1 <= num <= 6:
                            y = get_bbox_y(text_item['bbox'])
                            question_ys.append({'num': num, 'y': y})
                
                if len(question_ys) >= 3:
                    question_ys.sort(key=lambda q: q['y'])
                    midpoint = (question_ys[0]['y'] + question_ys[-1]['y']) / 2
                    
                    split_page_info = {
                        'page_index': page_idx,
                        'midpoint': midpoint,
                        'question_ys': question_ys
                    }
                    
                    question_texts_by_num: Dict[int, List[Dict[str, Any]]] = {}
                    for text_item in page_texts:
                        text = text_item['text'].strip()
                        match = re.match(r'^(\d+)\.?', text)
                        if match:
                            num = int(match.group(1))
                            if 1 <= num <= 6:
                                if num not in question_texts_by_num:
                                    question_texts_by_num[num] = []
                                question_texts_by_num[num].append(text_item)
                    
                    for q_num in range(1, 7):
                        problem_q_id = f'problem_solving_q{q_num}'
                        personal_q_id = f'personal_social_q{q_num}'
                        
                        question_texts = question_texts_by_num.get(q_num, [])
                        if not question_texts:
                            continue
                        
                        for question_text in question_texts:
                            y = get_bbox_y(question_text['bbox'])
                            is_top = y < midpoint
                            
                            if is_top:
                                if problem_q_id in question_ids and problem_q_id not in answers:
                                    answer = parse_answer_for_question(page_texts, q_num, 'problem_solving')
                                    if answer:
                                        answers[problem_q_id] = answer
                            else:
                                if personal_q_id in question_ids and personal_q_id not in answers:
                                    answer = parse_answer_for_question(page_texts, q_num, 'personal_social')
                                    if answer:
                                        answers[personal_q_id] = answer
                continue
        
        if domain:
            domain_question_ids = [qid for qid in question_ids if qid.startswith(f'{domain}_')]
            found_nums = set()
            question_positions: Dict[int, int] = {}
            
            for q_id in domain_question_ids:
                if q_id in answers:
                    continue
                
                match = re.match(r'(\w+)_q(\d+)', q_id)
                if not match:
                    continue
                
                q_num = int(match.group(2))
                
                # Thử parse ngay cả khi question number không được detect trong question_numbers
                # (có thể OCR miss một số số)
                answer = parse_answer_for_question(page_texts, q_num, domain)
                if answer:
                    answers[q_id] = answer
                    found_nums.add(q_num)
                    
                    # Tìm question position để dùng cho inferred position
                    for text_item in page_texts:
                        text = text_item['text'].strip()
                        match = re.match(r'^(\d+)\.?', text)
                        if match and int(match.group(1)) == q_num:
                            question_positions[q_num] = get_bbox_y(text_item['bbox'])
                            break
            
            # Xử lý các câu hỏi còn thiếu
            if found_nums:
                min_num = min(found_nums)
                max_num = max(found_nums)
                
                # Domain questions có tối đa 6 câu, overall questions có tối đa 8 câu
                max_question_num = 8 if domain == 'overall' else 6
                
                # Đảm bảo xử lý tất cả các câu từ 1 đến max_question_num
                for missing_num in range(1, max_question_num + 1):
                    if missing_num in found_nums:
                        continue
                    
                    missing_q_id = f'{domain}_q{missing_num}'
                    if missing_q_id not in question_ids or missing_q_id in answers:
                        continue
                    
                    prev_num = missing_num - 1
                    next_num = missing_num + 1
                    
                    inferred_y: Optional[float] = None
                    if prev_num in question_positions and next_num in question_positions:
                        inferred_y = (question_positions[prev_num] + question_positions[next_num]) / 2
                    elif prev_num in question_positions:
                        question_ys_list = [{'num': n, 'y': y} for n, y in question_positions.items()]
                        if len(question_ys_list) >= 2:
                            avg_spacing = calculate_average_spacing(question_ys_list)
                            inferred_y = question_positions[prev_num] + avg_spacing
                    elif next_num in question_positions:
                        question_ys_list = [{'num': n, 'y': y} for n, y in question_positions.items()]
                        if len(question_ys_list) >= 2:
                            avg_spacing = calculate_average_spacing(question_ys_list)
                            inferred_y = question_positions[next_num] - avg_spacing
                    
                        if inferred_y is not None:
                            answer = parse_answer_by_inferred_position(page_texts, missing_num, inferred_y, domain)
                            if answer:
                                answers[missing_q_id] = answer
                    else:
                        # Thử parse trực tiếp ngay cả khi không có inferred position
                        answer = parse_answer_for_question(page_texts, missing_num, domain)
                        if answer:
                            answers[missing_q_id] = answer
    
    missing_questions = [qid for qid in question_ids if qid not in answers]
    if missing_questions:
        missing_domains = set()
        for q_id in missing_questions:
            match = re.match(r'(\w+)_q\d+', q_id)
            if match:
                missing_domains.add(match.group(1))
        
        for domain in missing_domains:
            domain_question_ids = [qid for qid in question_ids if qid.startswith(f'{domain}_')]
            missing_domain_question_ids = [qid for qid in domain_question_ids if qid not in answers]
            
            if not missing_domain_question_ids:
                continue
            
            existing_answers = [qid for qid in domain_question_ids if qid in answers]
            
            pages_to_parse = []
            if existing_answers and split_page_info:
                pages_to_parse = [split_page_info['page_index']]
            else:
                pages_to_parse = list(range(len(pages)))
            
            for page_idx in pages_to_parse:
                page = pages[page_idx]
                page_texts = page.get('texts', [])
                
                if split_page_info and page_idx == split_page_info['page_index']:
                    midpoint = split_page_info['midpoint']
                    
                    for q_id in missing_domain_question_ids:
                        if q_id in answers:
                            continue
                        
                        match = re.match(r'(\w+)_q(\d+)', q_id)
                        if not match:
                            continue
                        
                        q_num = int(match.group(2))
                        domain_from_id = match.group(1)
                        
                        question_texts = []
                        for text_item in page_texts:
                            text = text_item['text'].strip()
                            match = re.match(r'^(\d+)\.?', text)
                            if match and int(match.group(1)) == q_num:
                                question_texts.append(text_item)
                        
                        should_parse = False
                        if domain_from_id == 'problem_solving':
                            should_parse = any(get_bbox_y(t['bbox']) < midpoint for t in question_texts) if question_texts else True
                        elif domain_from_id == 'personal_social':
                            should_parse = any(get_bbox_y(t['bbox']) >= midpoint for t in question_texts) if question_texts else True
                        else:
                            should_parse = True
                        
                        # Nếu không tìm thấy question text, vẫn thử parse (có thể OCR miss)
                        if should_parse or not question_texts:
                            answer = parse_answer_for_question(page_texts, q_num, domain_from_id)
                            if answer:
                                answers[q_id] = answer
                else:
                    for q_id in missing_domain_question_ids:
                        if q_id in answers:
                            continue
                        
                        match = re.match(r'(\w+)_q(\d+)', q_id)
                        if not match:
                            continue
                        
                        q_num = int(match.group(2))
                        domain_from_id = match.group(1)
                        
                        # Thử parse với inferred position nếu có question positions từ domain detection
                        answer = None
                        if domain_from_id == domain and found_nums and question_positions:
                            prev_num = q_num - 1
                            next_num = q_num + 1
                            
                            inferred_y: Optional[float] = None
                            if prev_num in question_positions and next_num in question_positions:
                                inferred_y = (question_positions[prev_num] + question_positions[next_num]) / 2
                            elif prev_num in question_positions:
                                question_ys_list = [{'num': n, 'y': y} for n, y in question_positions.items()]
                                if len(question_ys_list) >= 2:
                                    avg_spacing = calculate_average_spacing(question_ys_list)
                                    inferred_y = question_positions[prev_num] + avg_spacing
                            elif next_num in question_positions:
                                question_ys_list = [{'num': n, 'y': y} for n, y in question_positions.items()]
                                if len(question_ys_list) >= 2:
                                    avg_spacing = calculate_average_spacing(question_ys_list)
                                    inferred_y = question_positions[next_num] - avg_spacing
                            
                            if inferred_y is not None:
                                answer = parse_answer_by_inferred_position(page_texts, q_num, inferred_y, domain_from_id)
                        
                        # Fallback: parse trực tiếp
                        if not answer:
                            answer = parse_answer_for_question(page_texts, q_num, domain_from_id)
                        
                        if answer:
                            answers[q_id] = answer
    
    return answers

