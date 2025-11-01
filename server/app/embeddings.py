"""HuggingFace Sentence Transformers 기반 임베딩 생성 모듈"""
import os
from functools import lru_cache
from typing import List

PROVIDER = os.getenv("EMBEDDING_PROVIDER", "hf").lower()
MODEL = os.getenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-base")
DIM = int(os.getenv("EMBEDDING_DIMENSION", "768"))


def _assert_dim(vec: List[float]) -> List[float]:
    """임베딩 차원 검증"""
    if len(vec) != DIM:
        raise RuntimeError(f"Embedding dim mismatch: got {len(vec)}, expect {DIM}")
    return vec


@lru_cache(maxsize=1)
def _hf_model():
    """HuggingFace 모델 로드 (Lazy load + 캐시)"""
    from sentence_transformers import SentenceTransformer
    
    print(f"[Embedding] Loading HF model: {MODEL}")
    model = SentenceTransformer(MODEL)
    print(f"[Embedding] Model loaded: {MODEL}, dim={DIM}")
    return model


def _embed_hf(text: str) -> List[float]:
    """HuggingFace 모델로 임베딩 생성"""
    # E5 모델 권장 프롬프트: query/passage 구분. 검색 쿼리이므로 query: 사용
    query_text = f"query: {text.strip()}"
    
    model = _hf_model()
    vec = model.encode(query_text, normalize_embeddings=True)  # 코사인 유사도 최적화
    return _assert_dim(vec.tolist())


def embed_text(text: str) -> List[float]:
    """
    텍스트를 임베딩 벡터로 변환 (768차원)
    
    Args:
        text: 임베딩을 생성할 텍스트
        
    Returns:
        768차원 임베딩 벡터 리스트
        
    Raises:
        RuntimeError: PROVIDER가 'hf'가 아니거나, 텍스트가 비어있거나, 차원 불일치 시
    """
    if PROVIDER != "hf":
        raise RuntimeError(f"EMBEDDING_PROVIDER must be 'hf' in this build. got={PROVIDER}")
    
    if not text or not text.strip():
        raise RuntimeError("Empty query text")
    
    return _embed_hf(text)

