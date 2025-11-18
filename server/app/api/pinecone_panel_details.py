"""Pinecone에서 패널 상세 정보 가져오기"""
from typing import List, Dict, Any
from datetime import datetime
import logging
from pathlib import Path
import json

from app.services.pinecone_searcher import PineconePanelSearcher
from app.core.config import PINECONE_API_KEY, PINECONE_INDEX_NAME, load_category_config
from app.utils.merged_data_loader import load_merged_data

logger = logging.getLogger(__name__)

# Pinecone 검색기 싱글톤
_pinecone_searcher: PineconePanelSearcher = None

def _get_pinecone_searcher() -> PineconePanelSearcher:
    """Pinecone 검색기 싱글톤 인스턴스 반환"""
    global _pinecone_searcher
    
    if _pinecone_searcher is None:
        category_config = load_category_config()
        _pinecone_searcher = PineconePanelSearcher(
            PINECONE_API_KEY,
            PINECONE_INDEX_NAME,
            category_config
        )
    
    return _pinecone_searcher


async def _get_panel_details_from_pinecone(
    mb_sn_list: List[str],
    page: int,
    limit: int
) -> Dict[str, Any]:
    """
    mb_sn 리스트로부터 패널 상세 정보 조회 (Pinecone 메타데이터 사용)
    
    Args:
        mb_sn_list: 패널 ID 리스트
        page: 페이지 번호
        limit: 페이지당 항목 수
        
    Returns:
        기존 API 형식의 검색 결과
    """
    if not mb_sn_list:
        return {
            "results": [],
            "total": 0,
            "page": page,
            "page_size": limit,
            "pages": 0,
            "count": 0
        }
    
    searcher = _get_pinecone_searcher()
    category_config = load_category_config()
    
    # Pinecone에서 인구 topic으로 메타데이터 조회
    # 랜덤 벡터로 검색 (메타데이터만 필요)
    import numpy as np
    dimension = 4096  # Upstage Solar embedding dimension
    random_vector = np.random.rand(dimension).astype(np.float32).tolist()
    norm = np.linalg.norm(random_vector)
    if norm > 0:
        random_vector = (np.array(random_vector) / norm).tolist()
    
    # 인구 topic으로 검색 (mb_sn 필터 적용)
    pinecone_topic = category_config.get("기본정보", {}).get("pinecone_topic", "인구")
    
    # 각 mb_sn에 대해 메타데이터 조회
    panel_metadata_map = {}
    
    # 배치로 조회 (한 번에 여러 mb_sn 검색)
    try:
        # Pinecone 인덱스에 직접 접근
        from pinecone import Pinecone
        pc = Pinecone(api_key=PINECONE_API_KEY)
        index = pc.Index(PINECONE_INDEX_NAME)
        
        results = index.query(
            vector=random_vector,
            top_k=len(mb_sn_list) * 2,  # 충분히 많이 가져오기
            include_metadata=True,
            filter={
                "topic": pinecone_topic,
                "mb_sn": {"$in": mb_sn_list}
            }
        )
        
        # mb_sn별로 메타데이터 수집
        for match in results.matches:
            mb_sn = match.metadata.get("mb_sn", "")
            if mb_sn and mb_sn not in panel_metadata_map:
                panel_metadata_map[mb_sn] = match.metadata
    except Exception as e:
        logger.warning(f"Pinecone 메타데이터 조회 실패: {e}, 빈 메타데이터 사용")
    
    # merged_final.json에서 메타데이터 로드
    merged_data = load_merged_data()
    
    # 결과 변환
    results = []
    for mb_sn in mb_sn_list:
        metadata = panel_metadata_map.get(mb_sn, {})
        merged_metadata = merged_data.get(mb_sn, {}) if merged_data else {}
        
        # 기본 정보 추출
        gender = metadata.get("성별", "") or merged_metadata.get("gender", "")
        region = metadata.get("지역", "") or merged_metadata.get("location", "")
        age = 0
        if metadata.get("나이"):
            try:
                age = int(float(metadata["나이"]))
            except (ValueError, TypeError):
                pass
        if not age and merged_metadata.get("age"):
            try:
                age = int(merged_metadata["age"])
            except (ValueError, TypeError):
                pass
        
        # 연령대에서 나이 추정 (나이가 없을 때)
        if not age and metadata.get("연령대"):
            age_group = metadata["연령대"]
            if "대" in age_group:
                try:
                    age_base = int(age_group.replace("대", ""))
                    age = age_base + 5  # 중간값 사용
                except (ValueError, TypeError):
                    pass
        
        # 소득 정보 (직업소득 topic에서 가져오기 - 여기서는 간단히 merged_final.json 사용)
        income = ""
        if merged_metadata.get("income_personal"):
            income = str(merged_metadata["income_personal"])
        elif merged_metadata.get("income_household"):
            income = str(merged_metadata["income_household"])
        
        # Qpoll 응답 확인
        has_quickpoll = bool(merged_metadata.get("answers"))
        
        # AI 요약 (Pinecone text 필드 사용)
        text = metadata.get("text", "")
        ai_summary = text[:300] + "..." if len(text) > 300 else text
        if not ai_summary:
            ai_summary = "요약 정보가 없습니다."
        
        results.append({
            "id": mb_sn,
            "name": mb_sn,
            "mb_sn": mb_sn,
            "gender": gender,
            "age": age,
            "region": region,
            "coverage": "qw" if has_quickpoll else "w",
            "similarity": 0.0,
            "embedding": None,
            "responses": {"q1": str(merged_metadata.get("answers", {}))[:140]},
            "aiSummary": ai_summary,
            "created_at": datetime.now().isoformat(),
            "metadata": merged_metadata
        })
    
    # 페이지네이션
    total_count = len(results)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_results = results[start_idx:end_idx]
    
    pages = max(1, (total_count + limit - 1) // limit) if total_count > 0 else 0
    
    return {
        "count": len(paginated_results),
        "total": total_count,
        "page": page,
        "page_size": limit,
        "pages": pages,
        "results": paginated_results
    }

