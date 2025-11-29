"""
Data structures for ASQ-3 parser.
"""
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class OCRBox:
    """OCR text box from PaddleOCR."""
    text: str
    bbox: List[int]  # [x1, y1, x2, y2, x3, y3, x4, y4]
    conf: float
    
    @property
    def x(self) -> int:
        """Get center X coordinate."""
        x_coords = [self.bbox[i] for i in range(0, len(self.bbox), 2)]
        return int(sum(x_coords) / len(x_coords))
    
    @property
    def y(self) -> int:
        """Get center Y coordinate."""
        y_coords = [self.bbox[i] for i in range(1, len(self.bbox), 2)]
        return int(sum(y_coords) / len(y_coords))
    
    @property
    def w(self) -> int:
        """Get width."""
        x_coords = [self.bbox[i] for i in range(0, len(self.bbox), 2)]
        return int(max(x_coords) - min(x_coords))
    
    @property
    def h(self) -> int:
        """Get height."""
        y_coords = [self.bbox[i] for i in range(1, len(self.bbox), 2)]
        return int(max(y_coords) - min(y_coords))


@dataclass
class YOLOBox:
    """YOLO detection box."""
    cls: str  # class name
    conf: float  # confidence score
    x1: int
    y1: int
    x2: int
    y2: int
    
    @property
    def center_x(self) -> int:
        """Get center X coordinate."""
        return (self.x1 + self.x2) // 2
    
    @property
    def center_y(self) -> int:
        """Get center Y coordinate."""
        return (self.y1 + self.y2) // 2
    
    @property
    def width(self) -> int:
        """Get width."""
        return self.x2 - self.x1
    
    @property
    def height(self) -> int:
        """Get height."""
        return self.y2 - self.y1
    
    @property
    def area(self) -> int:
        """Get area."""
        return self.width * self.height
    
    def contains_point(self, x: int, y: int, margin: int = 0) -> bool:
        """Check if point (x, y) is inside the box with optional margin."""
        return (self.x1 - margin <= x <= self.x2 + margin and
                self.y1 - margin <= y <= self.y2 + margin)
    
    def iou(self, other: 'YOLOBox') -> float:
        """Calculate Intersection over Union (IoU) with another box."""
        # Calculate intersection
        x1_inter = max(self.x1, other.x1)
        y1_inter = max(self.y1, other.y1)
        x2_inter = min(self.x2, other.x2)
        y2_inter = min(self.y2, other.y2)
        
        if x2_inter <= x1_inter or y2_inter <= y1_inter:
            return 0.0
        
        inter_area = (x2_inter - x1_inter) * (y2_inter - y1_inter)
        union_area = self.area + other.area - inter_area
        
        if union_area == 0:
            return 0.0
        
        return inter_area / union_area


@dataclass
class CheckboxGroup:
    """Group of checkboxes for a question (C, D, K)."""
    question_num: int
    question_y: int  # Y position of question text
    c_box: Optional[YOLOBox] = None
    d_box: Optional[YOLOBox] = None
    k_box: Optional[YOLOBox] = None
    
    def get_all_boxes(self) -> List[YOLOBox]:
        """Get all non-None checkbox boxes."""
        boxes = []
        if self.c_box:
            boxes.append(self.c_box)
        if self.d_box:
            boxes.append(self.d_box)
        if self.k_box:
            boxes.append(self.k_box)
        return boxes


@dataclass
class ParsedAnswer:
    """Parsed answer for a question."""
    question_id: str  # e.g., "communication_q1"
    answer: str  # "Y", "S", or "N"
    confidence: float = 1.0  # Confidence score of the answer

