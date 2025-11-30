"""
Parser V2 - Simple answer detection based on YOLO detections.
"""
import logging
from typing import List, Optional

from parser.structures import YOLOBox, CheckboxGroup, ParsedAnswer

logger = logging.getLogger(__name__)


def build_checkbox_group(
    question_num: int,
    question_y: int,
    labels: List[YOLOBox],
    checkboxes: List[YOLOBox],
    y_tolerance: int = 50
) -> CheckboxGroup:
    """
    Build CheckboxGroup for a question by matching labels with checkboxes.
    
    Logic:
    1. Find labels (C, D, K) near the question Y position
    2. For each label, find the nearest checkbox_empty to its left
    3. Create CheckboxGroup with matched checkboxes
    
    Args:
        question_num: Question number
        question_y: Y position of question text
        labels: List of label detections (label_c, label_d, label_k)
        checkboxes: List of checkbox detections (checkbox_empty, checkbox_marked)
        y_tolerance: Y position tolerance for matching labels to question
        
    Returns:
        CheckboxGroup with matched checkboxes
    """
    group = CheckboxGroup(question_num=question_num, question_y=question_y)
    
    # Filter labels near question Y position
    nearby_labels = [
        label for label in labels
        if abs(label.center_y - question_y) <= y_tolerance
    ]
    
    # Sort labels by X position (left to right)
    nearby_labels.sort(key=lambda l: l.center_x)
    
    # Match each label with nearest checkbox to its left
    for label in nearby_labels:
        label_type = label.cls  # 'label_c', 'label_d', or 'label_k'
        
        # Find checkboxes to the left of the label
        left_checkboxes = [
            cb for cb in checkboxes
            if cb.center_x < label.center_x and
            abs(cb.center_y - label.center_y) <= 30  # Y tolerance for checkbox-label matching
        ]
        
        if not left_checkboxes:
            logger.debug(f"No checkbox found for {label_type} in question {question_num}")
            continue
        
        # Find closest checkbox
        closest_cb = min(
            left_checkboxes,
            key=lambda cb: (
                abs(cb.center_x - label.center_x) + abs(cb.center_y - label.center_y)
            )
        )
        
        # Assign to group based on label type
        if label_type == 'label_c':
            group.c_box = closest_cb
        elif label_type == 'label_d':
            group.d_box = closest_cb
        elif label_type == 'label_k':
            group.k_box = closest_cb
    
    return group


def detect_answer(
    group: CheckboxGroup,
    marks: List[YOLOBox],
    iou_threshold: float = 0.3
) -> Optional[str]:
    """
    Detect answer by checking which checkbox has a mark.
    
    Rules:
    - If mark is inside checkbox bbox → that's the answer
    - If multiple marks → choose mark with highest IoU
    - Mapping: C → Y, D → S, K → N
    
    Args:
        group: CheckboxGroup for the question
        marks: List of mark detections (mark_x, checkbox_marked)
        iou_threshold: Minimum IoU to consider mark inside checkbox
        
    Returns:
        Answer: "Y", "S", or "N", or None if no mark found
    """
    # Check each checkbox for marks
    checkbox_scores = {}
    
    # Check C checkbox
    if group.c_box:
        best_mark, best_iou = find_best_mark_in_checkbox(group.c_box, marks, iou_threshold)
        if best_mark:
            checkbox_scores['Y'] = {
                'iou': best_iou,
                'conf': best_mark.conf,
                'mark': best_mark
            }
    
    # Check D checkbox
    if group.d_box:
        best_mark, best_iou = find_best_mark_in_checkbox(group.d_box, marks, iou_threshold)
        if best_mark:
            checkbox_scores['S'] = {
                'iou': best_iou,
                'conf': best_mark.conf,
                'mark': best_mark
            }
    
    # Check K checkbox
    if group.k_box:
        best_mark, best_iou = find_best_mark_in_checkbox(group.k_box, marks, iou_threshold)
        if best_mark:
            checkbox_scores['N'] = {
                'iou': best_iou,
                'conf': best_mark.conf,
                'mark': best_mark
            }
    
    if not checkbox_scores:
        logger.debug(f"No marks found for question {group.question_num}")
        return None
    
    # Select answer with highest score
    # Score = IoU * 0.6 + confidence * 0.3 + (1 - distance_weight) * 0.1
    best_answer = None
    best_score = -1
    
    for answer, score_data in checkbox_scores.items():
        score = score_data['iou'] * 0.6 + score_data['conf'] * 0.4
        if score > best_score:
            best_score = score
            best_answer = answer
    
    logger.debug(f"Question {group.question_num}: detected answer '{best_answer}' (score={best_score:.2f})")
    return best_answer


def find_best_mark_in_checkbox(
    checkbox: YOLOBox,
    marks: List[YOLOBox],
    iou_threshold: float = 0.3
) -> tuple:
    """
    Find the best mark inside a checkbox.
    
    Args:
        checkbox: Checkbox box
        marks: List of mark detections
        iou_threshold: Minimum IoU threshold
        
    Returns:
        Tuple of (best_mark, best_iou) or (None, 0.0)
    """
    best_mark = None
    best_iou = 0.0
    
    for mark in marks:
        # Check if mark center is inside checkbox
        if checkbox.contains_point(mark.center_x, mark.center_y, margin=5):
            iou = checkbox.iou(mark)
            if iou > best_iou and iou >= iou_threshold:
                best_iou = iou
                best_mark = mark
    
    return best_mark, best_iou


def parse_answers_from_yolo(
    question_nums: List[int],
    question_y_positions: dict[int, int],
    labels: List[YOLOBox],
    checkboxes: List[YOLOBox],
    marks: List[YOLOBox],
    domain: str
) -> List[ParsedAnswer]:
    """
    Parse answers for all questions using YOLO detections.
    
    Args:
        question_nums: List of question numbers
        question_y_positions: Dict mapping question_num to Y position
        labels: List of label detections
        checkboxes: List of checkbox detections
        marks: List of mark detections
        domain: Domain name
        
    Returns:
        List of ParsedAnswer objects
    """
    answers = []
    
    for q_num in question_nums:
        question_y = question_y_positions.get(q_num)
        if question_y is None:
            logger.warning(f"Question {q_num} Y position not found")
            continue
        
        # Build checkbox group
        group = build_checkbox_group(q_num, question_y, labels, checkboxes)
        
        # Detect answer
        answer = detect_answer(group, marks)
        
        if answer:
            question_id = f"{domain}_q{q_num}"
            parsed = ParsedAnswer(
                question_id=question_id,
                answer=answer,
                confidence=1.0  # TODO: Calculate actual confidence
            )
            answers.append(parsed)
        else:
            logger.debug(f"No answer detected for {domain}_q{q_num}")
    
    return answers

