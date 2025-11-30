from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import threading

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Suppress PaddleOCR verbose logs during initialization
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="paddle")
logging.getLogger("paddle").setLevel(logging.WARNING)
logging.getLogger("paddlex").setLevel(logging.WARNING)

try:
    from routers.ocr_router import router
    from services.ocr_service import get_ocr_engine
    logger.info("Router imported successfully")
except Exception as e:
    logger.error("Failed to import router: %s", e, exc_info=True)
    raise

app = FastAPI(title="ASQ3 OCR Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
logger.info("OCR router included with routes: /recognize, /parse, /health")

@app.on_event("startup")
async def startup_event():
    """Pre-initialize PaddleOCR on startup to reduce first request time."""
    logger.info("Starting up OCR service...")
    
    import os
    # Default: false (lazy loading) - only init when first request comes
    # Set PRE_INIT_OCR=true to enable pre-init on startup
    pre_init = os.getenv("PRE_INIT_OCR", "false").lower() == "true"
    
    if pre_init:
        def pre_init_ocr():
            try:
                logger.info("Pre-initializing PaddleOCR in background...")
                ocr = get_ocr_engine()
                if ocr:
                    logger.info("✅ PaddleOCR pre-initialized successfully")
                else:
                    logger.warning("⚠️  PaddleOCR pre-initialization failed")
            except Exception as e:
                logger.error(f"❌ PaddleOCR pre-initialization error: {e}", exc_info=True)
        
        thread = threading.Thread(target=pre_init_ocr, daemon=True)
        thread.start()
        logger.info("PaddleOCR pre-initialization started in background")
    else:
        logger.info("PaddleOCR will be initialized on first request (lazy loading)")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
