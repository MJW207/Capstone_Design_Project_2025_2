"""
Panel Insight API - Main Application Entry Point
슬림화된 버전 (라우터 등록 및 핵심 설정만)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text
from pathlib import Path
from dotenv import load_dotenv
import os

# 환경 변수 로드 - Path 사용으로 경로 안정화
ENV_PATH = (Path(__file__).resolve().parents[1] / ".env")
load_dotenv(ENV_PATH, override=True)

print(f"[BOOT] .env loaded from {ENV_PATH}")
print(f"[BOOT] .env exists: {ENV_PATH.exists()}")

# 임베딩 설정 확인
provider = os.getenv("EMBEDDING_PROVIDER", "hf").lower()
model = os.getenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-base")
dim = int(os.getenv("EMBEDDING_DIMENSION", "768"))
print(f"[BOOT] Embedding: provider={provider}, model={model}, dim={dim}")

# 비동기 엔진 import (lifespan에서 사용)
from app.db.session import engine as async_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    앱 수명주기 관리 (startup/shutdown)
    """
    # startup: 간단 DB ping + HF 모델 워밍업 (선택사항)
    try:
        if async_engine is not None:
            async with async_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            print("[INFO] Database connection verified at startup")
    except Exception as e:
        print(f"[WARNING] Database startup check failed: {e}")
    
    # HF 모델 워밍업 (선택사항 - 첫 요청 지연 감소)
    try:
        from app.embeddings import _hf_model
        print("[INFO] Warming up HF embedding model...")
        _hf_model()
        print("[INFO] HF embedding model ready")
    except Exception as e:
        print(f"[WARNING] HF model warmup failed (will load on first use): {e}")
    
    yield
    
    # shutdown: 엔진 정리
    if async_engine is not None:
        await async_engine.dispose()
        print("[INFO] Database engine disposed at shutdown")


# FastAPI 앱 초기화 (lifespan 포함)
app = FastAPI(title="Panel Insight API", version="0.1.0", lifespan=lifespan)

# CORS 설정 (개발 환경 - 모든 origin 허용)
# OPTIONS 요청 처리를 위해 더 관대한 설정 사용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서는 모든 origin 허용
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# API 라우터 등록
from app.api.search import router as search_router
from app.api.search_rag import router as search_rag_router
from app.api.panels import router as panels_router
from app.api.health import router as health_router
from app.api.clustering import router as clustering_router
app.include_router(search_router)
app.include_router(search_rag_router)
app.include_router(panels_router)
app.include_router(health_router)
app.include_router(clustering_router)

# 기본 라우트
@app.get("/")
def root():
    return {"name": "Panel Insight API", "version": "0.1.0"}
