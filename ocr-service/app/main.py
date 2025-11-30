from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from dotenv import load_dotenv

from app.routers import ocr_router

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ASQ-3 OCR Service (Gemini Vision)",
    description="OCR service for ASQ-3 forms using Google Gemini Vision models",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ocr_router.router)


@app.on_event("startup")
async def startup_event():
    logger.info("Starting ASQ-3 OCR Service (Gemini Vision)")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not found in environment variables")
    else:
        logger.info("GEMINI_API_KEY found, service ready")


@app.get("/")
async def root():
    return {
        "service": "ASQ-3 OCR Service",
        "version": "2.0.0",
        "technology": "Gemini Vision",
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

