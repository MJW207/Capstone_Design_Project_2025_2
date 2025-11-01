"""군집 비교 지표 계산 (UI 틀만)"""
from typing import Dict, List, Any


def compare_groups(
    df: Any,
    labels: Any,
    a: int,
    b: int,
    bin_cols: List[str],
    cat_cols: List[str],
    num_cols: List[str]
) -> Dict[str, Any]:
    """
    두 그룹 간 비교 분석 (UI 틀만)
    
    실제 구현 로직은 제거됨
    """
    # UI 틀만 남기고 구현 로직 제거
    return {
        "group_a": {"id": a, "count": 0},
        "group_b": {"id": b, "count": 0},
        "comparison": [],
        "highlights": {
            "bin_cat_top": [],
            "num_top": []
        },
        "rankings": {
            "continuous": [],
            "categorical": []
        }
    }


