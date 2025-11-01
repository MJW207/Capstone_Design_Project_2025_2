"""
데이터 스키마 정의
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Literal
from typing_extensions import TypedDict


# 클러스터링 요청 스키마
class ClusterRunRequest(BaseModel):
    csv_path: Optional[str] = None
    records: Optional[List[Dict[str, Any]]] = None
    panel_ids: Optional[List[str]] = None  # DB에서 로드할 패널 ID 목록
    algo: Literal["kmeans", "hdbscan"] = "kmeans"
    n_clusters: int = 6
    kw_pca_components: Optional[int] = None
    spherical: bool = True
    hdbscan_params: Optional[Dict[str, Any]] = None


# 클러스터링 응답 스키마
class ClusterRunResponse(BaseModel):
    n: int
    labels_summary: Dict[str, int]
    noise_ratio: Optional[float] = None
    n_clusters: int
    session_id: Optional[str] = None


# 군집 비교 요청 스키마
class ClusterCompareRequest(BaseModel):
    c1: int = 0
    c2: int = 1
    categorical: Optional[List[str]] = None
    binary: Optional[List[str]] = None
    numeric: Optional[List[str]] = None
    min_base: int = 30


# 비교 결과 항목
class CompareItem(BaseModel):
    level: Optional[str] = None
    p1: float
    p2: float
    delta_pp: float
    lift: Optional[float] = None
    p_value: float
    x1: Optional[int] = None
    x2: Optional[int] = None
    mean1: Optional[float] = None
    mean2: Optional[float] = None
    smd: Optional[float] = None


class CompareFeature(BaseModel):
    feature: str
    type: Literal["categorical", "binary", "numeric"]
    items: Optional[List[CompareItem]] = None
    p1: Optional[float] = None
    p2: Optional[float] = None
    delta_pp: Optional[float] = None
    lift: Optional[float] = None
    p_value: Optional[float] = None
    mean1: Optional[float] = None
    mean2: Optional[float] = None
    smd: Optional[float] = None


class Opportunity(BaseModel):
    rank: int
    title: str
    delta_pp: float
    note: str


class ClusterCompareResponse(BaseModel):
    meta: Dict[str, Any]
    by_feature: List[CompareFeature]
    opportunities: List[Opportunity]


# 키워드 20개 목록
KEYWORDS_20 = [
    "kw_ott", "kw_netflix", "kw_disney_plus", "kw_secondhand", "kw_gym",
    "kw_jeju_trip", "kw_beauty", "kw_skincare", "kw_delivery", "kw_coffee",
    "kw_travel", "kw_shopping", "kw_fitness", "kw_book", "kw_music",
    "kw_movie", "kw_game", "kw_cooking", "kw_pet", "kw_car"
]

