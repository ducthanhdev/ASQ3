import json
import logging
from typing import Dict

logger = logging.getLogger(__name__)


def parse_gemini_response(response_text: str) -> Dict[str, str]:
    try:
        text = response_text.strip()
        
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        
        if text.endswith("```"):
            text = text[:-3]
        
        text = text.strip()
        answers = json.loads(text)
        
        normalized: Dict[str, str] = {}
        for key, value in answers.items():
            if isinstance(value, str):
                value = value.upper().strip()
                if value in ["Y", "S", "N", "C", "D", "K"]:
                    if value == "C":
                        value = "Y"
                    elif value == "D":
                        value = "S"
                    elif value == "K":
                        value = "N"
                    normalized[key] = value
                else:
                    logger.warning(f"Invalid answer value: {key}={value}")
                    normalized[key] = ""
            else:
                normalized[key] = ""
        
        logger.info(f"Parsed {len(normalized)} answers from Gemini response")
        return normalized
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from Gemini response: {e}")
        logger.debug(f"Response text: {response_text[:500]}")
        return {}
    except Exception as e:
        logger.error(f"Error parsing Gemini response: {e}")
        return {}


def validate_question_ids(question_ids: list[str], answers: Dict[str, str]) -> Dict[str, str]:
    validated: Dict[str, str] = {}
    for qid in question_ids:
        validated[qid] = answers.get(qid, "")
    
    missing = [qid for qid in question_ids if qid not in answers or answers.get(qid) == ""]
    if missing:
        logger.warning(f"Missing answers for {len(missing)} questions: {missing[:5]}...")
    
    return validated

