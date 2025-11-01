"""피처 전처리 파이프라인 (UI 틀만)"""
from typing import Dict, List, Any


NUM_COLS = ["age_raw", "income_personal", "income_household", "chunk_count"]
CAT_COLS = ["gender", "age_bucket", "region_lvl1"]
BIN_COLS = ["health", "beauty", "fashion", "food", "tech", "travel", "finance", "hobby"]
KW_COLS = [
    "kw_ott", "kw_netflix", "kw_disney_plus", "kw_secondhand", "kw_gym", "kw_jeju_trip",
    "kw_beauty", "kw_skincare", "kw_delivery", "kw_coffee", "kw_travel", "kw_shopping",
    "kw_fitness", "kw_book", "kw_music", "kw_movie", "kw_game", "kw_cooking", "kw_pet", "kw_car"
]


def preprocess(df: Any, kw_rules: Dict[str, List[str]], cat_rules: Dict[str, List[str]]) -> Dict:
    """
    피처 전처리 파이프라인 (UI 틀만)
    
    실제 구현 로직은 제거됨
    """
    # UI 틀만 남기고 구현 로직 제거
    return {
        "X": None,
        "frame": df,
        "meta": {}
    }

