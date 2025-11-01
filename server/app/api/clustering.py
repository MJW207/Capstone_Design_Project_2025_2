"""클러스터링 API 엔드포인트 (UI 틀만)"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


router = APIRouter(prefix="/api/clustering", tags=["clustering"])


class ClusterRequest(BaseModel):
    """클러스터링 요청"""
    panel_ids: List[str]
    algo: str = "kmeans"
    n_clusters: int = 6
    spherical: bool = True
    kw_pca_components: Optional[int] = None
    hdbscan_params: Optional[Dict[str, Any]] = None


class CompareRequest(BaseModel):
    """그룹 비교 요청"""
    session_id: str
    c1: int
    c2: int


class UMAPRequest(BaseModel):
    """UMAP 2D 좌표 요청"""
    session_id: str
    sample: Optional[int] = None
    metric: str = "cosine"
    n_neighbors: int = 15
    min_dist: float = 0.1
    seed: Optional[int] = 0


@router.post("/cluster")
async def cluster_panels(req: ClusterRequest):
    """
    클러스터링 실행 (UI 틀만)
    """
    # UI 틀만 남기고 구현 로직 제거
    raise HTTPException(
        status_code=501,
        detail="클러스터링 기능이 비활성화되었습니다."
    )


@router.post("/compare")
async def compare_clusters(req: CompareRequest):
    """
    군집 비교 분석 (UI 틀만)
    """
    # UI 틀만 남기고 구현 로직 제거
    raise HTTPException(
        status_code=501,
        detail="군집 비교 기능이 비활성화되었습니다."
    )


@router.post("/umap")
async def get_umap_coordinates(req: UMAPRequest):
    """
    UMAP 2D 좌표 계산 (UI 틀만)
    """
    # UI 틀만 남기고 구현 로직 제거
    raise HTTPException(
        status_code=501,
        detail="UMAP 기능이 비활성화되었습니다."
    )

