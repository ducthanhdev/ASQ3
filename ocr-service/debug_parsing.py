"""
Script để debug parsing logic và phân tích nguyên nhân sai đáp án
"""
import json
import sys
from typing import Dict, Any, List

def analyze_parsing_issue():
    """
    Phân tích các vấn đề có thể gây ra sai đáp án:
    1. Checkbox ranges quá rộng (overlap)
    2. Logic chọn mark không chính xác
    3. OCR detect sai vị trí
    4. Format PDF không chuẩn
    """
    
    print("=" * 80)
    print("PHÂN TÍCH NGUYÊN NHÂN SAI ĐÁP ÁN")
    print("=" * 80)
    
    print("\n1. CÁC CÂU SAI:")
    print("   - gross_motor_q3: parsed Y, expected S")
    print("   - problem_solving_q1: parsed Y, expected S")
    print("   - problem_solving_q6: parsed S, expected N")
    
    print("\n2. PHÂN TÍCH LOGIC PARSING HIỆN TẠI:")
    print("\n   a) Tính checkbox ranges:")
    print("      - checkbox_size = 18px")
    print("      - gap = 4px")
    print("      - margin = 25px mỗi bên")
    print("      - Tổng range width ≈ 18 + 4 + 50 = 72px")
    print("      - Vấn đề: Nếu các checkbox gần nhau, ranges có thể overlap!")
    
    print("\n   b) Logic chọn mark:")
    print("      - Ưu tiên marks trong checkbox box (margin 8px)")
    print("      - Nếu không có, chọn mark gần checkbox symbol nhất")
    print("      - Group marks theo answer, chọn best từ mỗi group")
    print("      - Vấn đề: Nếu mark nằm trong nhiều ranges, có thể chọn sai")
    
    print("\n   c) Kiểm tra 'in checkbox box':")
    print("      - Margin = 8px")
    print("      - Kiểm tra: mark có nằm trong bbox của checkbox symbol không")
    print("      - Vấn đề: Nếu checkbox symbol bbox nhỏ, mark có thể không được detect")
    
    print("\n3. CÁC NGUYÊN NHÂN CÓ THỂ:")
    print("\n   A. LOGIC PARSING (Trách nhiệm lớn nhất - ~70%):")
    print("      - Checkbox ranges quá rộng, dẫn đến overlap")
    print("      - Logic chọn mark chưa đủ chính xác khi có nhiều marks")
    print("      - Không kiểm tra mark có thực sự nằm trong checkbox box không")
    print("      - Group by answer có thể chọn sai nếu có nhiều marks")
    
    print("\n   B. OCR DETECTION (~20%):")
    print("      - OCR có thể detect sai vị trí của marks")
    print("      - Confidence thấp có thể gây nhầm lẫn")
    print("      - Checkbox symbols có thể không được detect đúng")
    
    print("\n   C. FORMAT PDF (~10%):")
    print("      - PDF có thể có layout không chuẩn")
    print("      - Checkbox symbols có thể render khác nhau")
    print("      - Khoảng cách giữa các checkbox có thể không đều")
    
    print("\n4. GIẢI PHÁP ĐỀ XUẤT:")
    print("\n   a) Giảm checkbox range margin:")
    print("      - Giảm từ 25px xuống 15px để giảm overlap")
    
    print("\n   b) Cải thiện logic chọn mark:")
    print("      - Nếu có marks trong checkbox box, CHỈ chọn từ những marks đó")
    print("      - Không group by answer, chọn mark gần checkbox symbol nhất")
    print("      - Tăng margin kiểm tra 'in checkbox box' từ 8px lên 12px")
    
    print("\n   c) Thêm validation:")
    print("      - Kiểm tra mark có nằm giữa checkbox symbol và label không")
    print("      - Loại bỏ marks quá xa checkbox symbol (>30px)")
    
    print("\n5. KẾT LUẬN:")
    print("   → Nguyên nhân chính: LOGIC PARSING (70%)")
    print("   → Cần cải thiện:")
    print("     1. Giảm checkbox range overlap")
    print("     2. Cải thiện logic chọn mark (ưu tiên marks trong box)")
    print("     3. Tăng độ chính xác kiểm tra 'in checkbox box'")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    analyze_parsing_issue()

