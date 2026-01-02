import os
import logging
from typing import List, Dict, Optional
import google.generativeai as genai
from PIL import Image

from app.config.models import GEMINI_MODELS, DEFAULT_MODEL
from app.services.utils import parse_gemini_response

logger = logging.getLogger(__name__)


class GeminiOCRService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        genai.configure(api_key=self.api_key)
        self.models = GEMINI_MODELS
        self.default_model = DEFAULT_MODEL
        self._clients: Dict[str, genai.GenerativeModel] = {}
        
    def _get_client(self, model_name: Optional[str] = None) -> genai.GenerativeModel:
        model_name = model_name or self.default_model
        if model_name not in self._clients:
            try:
                self._clients[model_name] = genai.GenerativeModel(model_name)
                logger.info(f"Initialized Gemini model: {model_name}")
            except Exception as e:
                logger.error(f"Failed to initialize model {model_name}: {e}")
                raise
        return self._clients[model_name]
    
    def _create_prompt(self, question_ids: List[str]) -> str:
        question_list = "\n".join([f"- {qid}" for qid in question_ids])
        
        return f"""You are an OCR + Checkbox Reasoning Assistant for ASQ-3 questionnaires.

Your task:
1. Look at the image of the ASQ-3 form
2. Find all checkboxes (□) that are marked (with X, checkmark, or filled)
3. Map each marked checkbox to its corresponding question ID
4. Determine the answer based on the label:
   - For domain questions (communication_q*, gross_motor_q*, fine_motor_q*, problem_solving_q*, personal_social_q*):
     - C (Có) → Y
     - D (Đôi khi) → S  
     - K (Không/Chưa) → N
   - For overall questions (overall_q1 to overall_q8 - TỔNG QUAN section):
     - C (Có) → Y
     - K (Không) → N

Rules:
- Only return marked checkboxes (ignore empty checkboxes)
- Each question should have exactly ONE answer
- If a question has no marked checkbox, omit it from the response
- Return ONLY valid JSON, no explanations

Required question IDs:
{question_list}

Response format (JSON only):
{{
  "communication_q1": "Y",
  "communication_q2": "S",
  "gross_motor_q1": "N",
  "overall_q1": "Y",
  "overall_q2": "N",
  ...
}}

Return ONLY the JSON object, nothing else."""
    
    def parse_image(
        self,
        image: Image.Image,
        question_ids: List[str],
        model_name: Optional[str] = None,
    ) -> Dict[str, str]:
        try:
            model = self._get_client(model_name)
            prompt = self._create_prompt(question_ids)
            
            logger.info(f"Calling Gemini Vision ({model_name or self.default_model}) for {len(question_ids)} questions")
            
            response = model.generate_content([prompt, image])
            
            if not response.text:
                logger.warning("Gemini returned empty response")
                return {}
            
            answers = parse_gemini_response(response.text)
            logger.info(f"Gemini OCR extracted {len(answers)} answers")
            return answers
            
        except Exception as e:
            logger.error(f"Error in Gemini OCR: {e}")
            raise
    
    def parse_images_with_fallback(
        self,
        images: List[Image.Image],
        question_ids: List[str],
    ) -> Dict[str, str]:
        all_answers: Dict[str, str] = {}
        
        for model_name in self.models:
            try:
                logger.info(f"Trying model: {model_name}")
                model_answers: Dict[str, str] = {}
                
                for image in images:
                    page_answers = self.parse_image(image, question_ids, model_name)
                    model_answers.update(page_answers)
                
                if len(model_answers) >= len(question_ids) * 0.8:
                    logger.info(f"Model {model_name} succeeded with {len(model_answers)} answers")
                    all_answers = model_answers
                    break
                else:
                    logger.warning(f"Model {model_name} only got {len(model_answers)}/{len(question_ids)} answers, trying next model")
                    all_answers.update(model_answers)
                    
            except Exception as e:
                logger.warning(f"Model {model_name} failed: {e}, trying next model")
                continue
        
        if not all_answers:
            logger.error("All Gemini models failed")
            raise Exception("All Gemini models failed to parse the form")
        
        return all_answers


_ocr_service: Optional[GeminiOCRService] = None


def get_ocr_service() -> GeminiOCRService:
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = GeminiOCRService()
    return _ocr_service

