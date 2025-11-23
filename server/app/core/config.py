"""DB 설정 모듈 - 스키마/테이블명을 환경변수로 관리"""
import os
import json
from dataclasses import dataclass
from typing import Final, Dict, Any
from functools import lru_cache
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DbNames:
    """데이터베이스 스키마/테이블명 설정"""
    RAW: str = os.getenv("DB_SCHEMA_RAW", "RawData")
    EMB: str = os.getenv("DB_SCHEMA_EMB", "testcl")
    T_W1: str = os.getenv("TBL_WELCOME_1ST", "welcome_1st")
    T_W2: str = os.getenv("TBL_WELCOME_2ND", "welcome_2nd")
    T_QA: str = os.getenv("TBL_QUICK_ANSWER", "quick_answer")
    T_EMB: str = os.getenv("TBL_PANEL_EMB", "panel_embeddings")
    T_EMB_V: str = "panel_embeddings_v"  # 뷰 이름 (고정)


# 전역 설정 인스턴스
DBN: Final[DbNames] = DbNames()


def fq(schema: str, table: str) -> str:
    """
    Fully Qualified 이름 생성: "Schema"."Table"
    
    Args:
        schema: 스키마 이름
        table: 테이블 이름
        
    Returns:
        완전한 테이블 이름 (예: "RawData"."welcome_1st")
    """
    return f'"{schema}"."{table}"'


# 전처리/가중치/버전 설정
PREPROC_VERSION: Final[str] = os.getenv("PREPROC_VERSION", "v1.0")
KEYWORD_BUNDLE: Final[str] = os.getenv("KEYWORD_BUNDLE", "kr_default_v1")

WEIGHTS: Final[dict[str, float]] = {
    "num": float(os.getenv("WEIGHTS_NUM", "1.0")),
    "cat": float(os.getenv("WEIGHTS_CAT", "0.8")),
    "kw": float(os.getenv("WEIGHTS_KW", "0.8")),
    "len": float(os.getenv("WEIGHTS_LEN", "0.5")),
}

# 키워드 PCA 차원 (None이면 미적용)
KW_PCA_COMPONENTS: Final[str | None] = os.getenv("KW_PCA_COMPONENTS") or None
if KW_PCA_COMPONENTS:
    try:
        _ = int(KW_PCA_COMPONENTS)  # 유효성 검사
    except ValueError:
        KW_PCA_COMPONENTS = None

# 벡터 검색 활성화 여부 (기본값: True, 환경변수로 비활성화 가능)
VECTOR_SEARCH_ENABLED: Final[bool] = os.getenv("VECTOR_SEARCH_ENABLED", "true").lower() in ("true", "1", "yes", "on")

# Pinecone 검색 설정
PINECONE_SEARCH_ENABLED: Final[bool] = os.getenv("PINECONE_SEARCH_ENABLED", "true").lower() in ("true", "1", "yes", "on")
PINECONE_API_KEY: Final[str] = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX_NAME: Final[str] = os.getenv("PINECONE_INDEX_NAME", "panel-profiles")
PINECONE_ENVIRONMENT: Final[str] = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")

# 카테고리 설정 (프로젝트 루트 기준으로 동적 경로 계산)
# config.py 위치: server/app/core/config.py
# 프로젝트 루트: server/app/core/../../../
_CONFIG_FILE_DIR = Path(__file__).resolve().parent.parent.parent.parent  # server/app/core -> 프로젝트 루트
_DEFAULT_CATEGORY_CONFIG_PATH = _CONFIG_FILE_DIR / "notebooks" / "category_config.json"
# 환경변수가 설정되어 있고 파일이 존재하면 사용, 없거나 잘못된 경로면 기본값 사용
_ENV_CATEGORY_CONFIG_PATH = os.getenv("CATEGORY_CONFIG_PATH")
# 기본값 경로가 존재하는지 확인하고, 존재하면 항상 기본값 사용 (환경변수 무시)
if _DEFAULT_CATEGORY_CONFIG_PATH.exists():
    CATEGORY_CONFIG_PATH: Final[str] = str(_DEFAULT_CATEGORY_CONFIG_PATH)
    if _ENV_CATEGORY_CONFIG_PATH and _ENV_CATEGORY_CONFIG_PATH != CATEGORY_CONFIG_PATH:
        logger.warning(f"[Config] 환경변수 CATEGORY_CONFIG_PATH 무시, 기본값 사용: {CATEGORY_CONFIG_PATH}")
    else:
        logger.debug(f"[Config] CATEGORY_CONFIG_PATH 기본값 사용: {CATEGORY_CONFIG_PATH}")
elif _ENV_CATEGORY_CONFIG_PATH and os.path.exists(_ENV_CATEGORY_CONFIG_PATH):
    CATEGORY_CONFIG_PATH: Final[str] = _ENV_CATEGORY_CONFIG_PATH
    logger.warning(f"[Config] 기본 경로가 없어 환경변수 사용: {CATEGORY_CONFIG_PATH}")
else:
    CATEGORY_CONFIG_PATH: Final[str] = str(_DEFAULT_CATEGORY_CONFIG_PATH)
    logger.warning(f"[Config] CATEGORY_CONFIG_PATH 기본값 사용 (파일 존재 여부 확인 안됨): {CATEGORY_CONFIG_PATH}")

# API Keys (환경변수 우선, 없으면 기본값 사용 - 보안상 .env 파일 사용 권장)
ANTHROPIC_API_KEY: Final[str] = os.getenv("ANTHROPIC_API_KEY", "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")
UPSTAGE_API_KEY: Final[str] = os.getenv("UPSTAGE_API_KEY", "up_2KGGBmZpBmlePxUyk3ouWBf9iqOmJ")
OPENAI_API_KEY: Final[str] = os.getenv("OPENAI_API_KEY", "")

# API 키 로드 확인 로깅
logger.debug(f"[Config] ANTHROPIC_API_KEY 로드: {'설정됨 (길이: ' + str(len(ANTHROPIC_API_KEY)) + ')' if ANTHROPIC_API_KEY else '없음'}")
logger.debug(f"[Config] OPENAI_API_KEY 로드: {'설정됨 (길이: ' + str(len(OPENAI_API_KEY)) + ')' if OPENAI_API_KEY else '없음'}")
logger.debug(f"[Config] PINECONE_API_KEY 로드: {'설정됨 (길이: ' + str(len(PINECONE_API_KEY)) + ')' if PINECONE_API_KEY else '없음'}")

# Pinecone 검색 폴백 설정 (Pinecone 검색 실패 시 기존 검색으로 폴백)
FALLBACK_TO_VECTOR_SEARCH: Final[bool] = os.getenv("FALLBACK_TO_VECTOR_SEARCH", "true").lower() in ("true", "1", "yes", "on")


@lru_cache(maxsize=1)
def load_category_config() -> Dict[str, Any]:
    """
    category_config.json 파일을 로드 (캐싱됨)
    
    Returns:
        카테고리 설정 딕셔너리
        
    Raises:
        FileNotFoundError: 설정 파일이 없을 경우
        json.JSONDecodeError: JSON 파싱 실패 시
    """
    logger.debug(f"[Config] 카테고리 설정 파일 경로: {CATEGORY_CONFIG_PATH}")
    logger.debug(f"[Config] 파일 존재 여부: {os.path.exists(CATEGORY_CONFIG_PATH)}")
    
    if not os.path.exists(CATEGORY_CONFIG_PATH):
        logger.error(f"[Config] 카테고리 설정 파일을 찾을 수 없습니다: {CATEGORY_CONFIG_PATH}")
        raise FileNotFoundError(f"카테고리 설정 파일을 찾을 수 없습니다: {CATEGORY_CONFIG_PATH}")
    
    try:
        with open(CATEGORY_CONFIG_PATH, 'r', encoding='utf-8') as f:
            config = json.load(f)
        logger.debug(f"[Config] 카테고리 설정 로드 성공: {len(config)}개 카테고리")
        logger.debug(f"[Config] 카테고리 목록: {list(config.keys())}")
        return config
    except json.JSONDecodeError as e:
        logger.error(f"[Config] JSON 파싱 실패: {e}")
        raise
    except Exception as e:
        logger.error(f"[Config] 카테고리 설정 로드 실패: {e}")
        raise

