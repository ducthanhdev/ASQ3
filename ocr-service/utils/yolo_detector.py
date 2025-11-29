"""
YOLO detector for checkbox and label detection.
"""
import logging
from typing import List, Optional
import numpy as np
from PIL import Image

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    logging.warning("ultralytics not available. YOLO detection will be disabled.")

from parser.structures import YOLOBox

logger = logging.getLogger(__name__)


class YOLODetector:
    """YOLO detector for ASQ-3 checkboxes and labels."""
    
    # YOLO class names
    CLASSES = [
        'checkbox_empty',
        'checkbox_marked',
        'label_c',
        'label_d',
        'label_k',
        'mark_x',
    ]
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize YOLO detector.
        
        Args:
            model_path: Path to YOLO model file (.pt). If None, uses default or creates dummy detector.
        """
        self.model = None
        self.model_path = model_path
        
        if YOLO_AVAILABLE:
            if model_path:
                try:
                    self.model = YOLO(model_path)
                    logger.info(f"Loaded YOLO model from {model_path}")
                except Exception as e:
                    logger.error(f"Failed to load YOLO model: {e}")
                    self.model = None
            else:
                logger.warning("No YOLO model path provided. Using dummy detector.")
        else:
            logger.warning("YOLO not available. Using dummy detector.")
    
    def detect(self, image: Image.Image) -> List[YOLOBox]:
        """
        Detect checkboxes, labels, and marks in image.
        
        Args:
            image: PIL Image
            
        Returns:
            List of YOLOBox detections
        """
        if not self.model:
            # Return empty list if no model available
            logger.debug("No YOLO model available, returning empty detections")
            return []
        
        try:
            # Run YOLO inference
            results = self.model(image, conf=0.25, verbose=False)
            
            detections = []
            if results and len(results) > 0:
                result = results[0]
                
                # Extract boxes, confidences, and class IDs
                boxes = result.boxes
                if boxes is not None and len(boxes) > 0:
                    for i in range(len(boxes)):
                        cls_id = int(boxes.cls[i])
                        conf = float(boxes.conf[i])
                        x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
                        
                        # Get class name
                        if cls_id < len(self.CLASSES):
                            cls_name = self.CLASSES[cls_id]
                        else:
                            cls_name = f"class_{cls_id}"
                        
                        detection = YOLOBox(
                            cls=cls_name,
                            conf=conf,
                            x1=int(x1),
                            y1=int(y1),
                            x2=int(x2),
                            y2=int(y2),
                        )
                        detections.append(detection)
            
            logger.debug(f"YOLO detected {len(detections)} objects")
            return detections
            
        except Exception as e:
            logger.error(f"YOLO detection error: {e}")
            return []
    
    def get_labels(self, detections: List[YOLOBox]) -> List[YOLOBox]:
        """Get all label detections (C, D, K)."""
        return [d for d in detections if d.cls in ['label_c', 'label_d', 'label_k']]
    
    def get_checkboxes(self, detections: List[YOLOBox]) -> List[YOLOBox]:
        """Get all checkbox detections (empty or marked)."""
        return [d for d in detections if d.cls in ['checkbox_empty', 'checkbox_marked']]
    
    def get_marks(self, detections: List[YOLOBox]) -> List[YOLOBox]:
        """Get all mark detections (mark_x or checkbox_marked)."""
        return [d for d in detections if d.cls in ['mark_x', 'checkbox_marked']]

