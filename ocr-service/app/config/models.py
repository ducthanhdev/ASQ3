"""
Configuration for Gemini Vision models
"""
from typing import List

# Available Gemini Vision models (ordered by priority/quality)
GEMINI_MODELS: List[str] = [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-flash-lite",
]

# Default model to use
DEFAULT_MODEL: str = "gemini-2.5-flash"

# ASQ-3 Question domains
ASQ3_DOMAINS = {
    "communication": list(range(1, 7)),  # q1-q6
    "gross_motor": list(range(1, 7)),     # q1-q6
    "fine_motor": list(range(1, 7)),       # q1-q6
    "problem_solving": list(range(1, 7)),  # q1-q6
    "personal_social": list(range(1, 7)),  # q1-q6
    "overall": list(range(1, 9)),          # q1-q8
}

# Answer mapping
ANSWER_MAPPING = {
    "C": "Y",  # Có
    "D": "S",  # Đôi khi
    "K": "N",  # Không/Chưa
}

