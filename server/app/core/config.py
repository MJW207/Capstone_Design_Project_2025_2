"""DB 설정 모듈 - 스키마/테이블명을 환경변수로 관리"""
import os
from dataclasses import dataclass
from typing import Final


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

