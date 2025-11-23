"""Pinecone에서 패널 상세 정보 가져오기 (Pinecone 메타데이터만 사용)"""
from typing import List, Dict, Any
from datetime import datetime
import logging
import numpy as np

from app.services.pinecone_searcher import PineconePanelSearcher
from app.core.config import PINECONE_API_KEY, PINECONE_INDEX_NAME, load_category_config
# ⭐ merged_data는 패널 상세정보 조회 시(/api/panels/{panel_id})에만 NeonDB에서 로드
# 검색 결과에서는 Pinecone 메타데이터만 사용
from pinecone import Pinecone

logger = logging.getLogger(__name__)


def _is_no_response(text: str) -> bool:
    """텍스트가 무응답인지 확인"""
    if not text:
        return True
    no_response_patterns = [
        "무응답", "응답하지 않았", "정보 없음", "해당 없음",
        "해당사항 없음", "기록 없음", "데이터 없음"
    ]
    text_lower = text.lower()
    return any(pattern in text_lower for pattern in no_response_patterns)

# Pinecone 검색기 싱글톤
_pinecone_searcher: PineconePanelSearcher = None

# Pinecone 인덱스 싱글톤 (성능 최적화)
_pinecone_client = None
_pinecone_index = None
_pinecone_dimension = None

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
    limit: int,
    similarity_scores: Dict[str, float] = None
) -> Dict[str, Any]:
    """
    mb_sn 리스트로부터 패널 상세 정보 조회 (Pinecone 메타데이터만 사용)
    
    Args:
        mb_sn_list: 패널 ID 리스트
        page: 페이지 번호
        limit: 페이지당 항목 수
        
    Returns:
        기존 API 형식의 검색 결과
    """
    import time
    convert_start_time = time.time()
    logger.info(f"[Panel Details] 시작: {len(mb_sn_list)}개 패널, page={page}, limit={limit}")
    
    if not mb_sn_list:
        return {
            "results": [],
            "total": 0,
            "page": page,
            "page_size": limit,
            "pages": 0,
            "count": 0
        }
    
    category_config = load_category_config()
    
    # ⭐ Pinecone 인덱스 연결 최적화 (싱글톤 패턴 사용)
    # Pinecone 클라이언트는 재사용 가능하므로 매번 생성하지 않음
    global _pinecone_client, _pinecone_index, _pinecone_dimension
    
    if _pinecone_index is None:
        _pinecone_client = Pinecone(api_key=PINECONE_API_KEY)
        _pinecone_index = _pinecone_client.Index(PINECONE_INDEX_NAME)
        # 인덱스 차원 동적으로 가져오기 (한 번만)
        stats = _pinecone_index.describe_index_stats()
        _pinecone_dimension = stats.get('dimension', 1536)
    
    index = _pinecone_index
    dimension = _pinecone_dimension
    
    # Pinecone에서 인구 topic으로 메타데이터 조회
    # 랜덤 벡터로 검색 (메타데이터만 필요)
    random_vector = np.random.rand(dimension).astype(np.float32).tolist()
    norm = np.linalg.norm(random_vector)
    if norm > 0:
        random_vector = (np.array(random_vector) / norm).tolist()
    
    # 모든 topic에서 메타데이터 조회
    panel_metadata_map = {}  # mb_sn -> 모든 메타데이터 병합
    
    # 각 카테고리의 topic으로 메타데이터 수집
    logger.info(f"[Panel Details] 메타데이터 수집 시작: {len(mb_sn_list)}개 패널, {len(category_config)}개 카테고리")
    try:
        category_count = 0
        for category_name, category_info in category_config.items():
            category_count += 1
            pinecone_topic = category_info.get("pinecone_topic")
            if not pinecone_topic:
                continue
            
            try:
                logger.debug(f"[Panel Details] 카테고리 {category_count}/{len(category_config)}: {category_name} ({pinecone_topic})")
                topic_results = index.query(
                    vector=random_vector,
                    top_k=len(mb_sn_list) * 2,  # 충분히 많이 가져오기
                    include_metadata=True,
                    filter={
                        "topic": pinecone_topic,
                        "mb_sn": {"$in": mb_sn_list}
                    }
                )
                logger.debug(f"[Panel Details] {category_name}: {len(topic_results.matches)}개 매치")
                
                # mb_sn별로 메타데이터 병합
                for match in topic_results.matches:
                    mb_sn = match.metadata.get("mb_sn", "")
                    if not mb_sn:
                        continue
                    
                    if mb_sn not in panel_metadata_map:
                        panel_metadata_map[mb_sn] = {
                            "_index_values": []  # welcome1, welcome2, quickpoll 구분용
                        }
                    
                    # index 필드 수집 (welcome1, welcome2, quickpoll 구분용)
                    if "index" in match.metadata:
                        index_val = match.metadata.get("index")
                        if index_val and index_val not in panel_metadata_map[mb_sn]["_index_values"]:
                            panel_metadata_map[mb_sn]["_index_values"].append(index_val)
                    
                    # 메타데이터 병합 (시스템 필드 제외)
                    for key, value in match.metadata.items():
                        if key not in ["topic", "index", "mb_sn"]:  # 시스템 필드 제외
                            # 중복 키는 나중 값으로 덮어쓰기 (또는 리스트로 병합)
                            if key in panel_metadata_map[mb_sn]:
                                # 이미 있는 경우, 리스트면 병합, 아니면 덮어쓰기
                                existing = panel_metadata_map[mb_sn][key]
                                if isinstance(existing, list) and isinstance(value, list):
                                    panel_metadata_map[mb_sn][key] = list(set(existing + value))
                                elif isinstance(existing, list):
                                    if value not in existing:
                                        panel_metadata_map[mb_sn][key] = existing + [value]
                                else:
                                    panel_metadata_map[mb_sn][key] = value
                            else:
                                panel_metadata_map[mb_sn][key] = value
            except Exception as e:
                logger.debug(f"{category_name} ({pinecone_topic}) 메타데이터 조회 실패: {e}")
    except Exception as e:
        logger.warning(f"Pinecone 메타데이터 조회 실패: {e}, 빈 메타데이터 사용")
    
    # 결과 변환 (Pinecone 메타데이터만 사용)
    # ⭐ 성능 최적화: 검색 결과에서는 기본 메타데이터만 반환
    # 응답, AI 요약 등은 패널 상세 정보창에서만 로딩 (/api/panels/{panel_id})
    logger.info(f"[Panel Details] 메타데이터 수집 완료: {len(panel_metadata_map)}개 패널, 결과 변환 시작 (응답 제외)")
    
    # ⭐ 검색 결과에서는 Pinecone 메타데이터만 사용
    # merged_data는 패널 상세정보 조회 시(/api/panels/{panel_id})에만 NeonDB에서 로드
    results = []
    for mb_sn in mb_sn_list:
        metadata = panel_metadata_map.get(mb_sn, {})
        
        # 기본 정보 추출 (Pinecone 메타데이터만 사용)
        gender = metadata.get("성별", "")
        region = metadata.get("지역", "")
        detail_location = metadata.get("지역구", "")
        if detail_location and region:
            region = f"{region} {detail_location}"
        elif detail_location:
            region = detail_location
        
        age = 0
        if metadata.get("나이"):
            try:
                age = int(float(metadata["나이"]))
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
        
        # 소득 정보
        income = ""
        if metadata.get("개인소득"):
            income = str(metadata["개인소득"])
        elif metadata.get("가구소득"):
            income = str(metadata["가구소득"])
        
        # ⭐ 성능 최적화: 검색 결과에서는 응답 수집하지 않음
        # 응답 정보는 패널 상세 정보창을 열 때만 로딩 (get_panel_from_pinecone 사용)
        responses = []  # 빈 리스트 (상세 정보는 별도 API에서 로딩)
        
        # AI 요약도 검색 결과에서는 제외 (상세 정보에서만 로딩)
        ai_summary = ""  # 빈 문자열 (상세 정보는 별도 API에서 로딩)
        
        # 유사도 점수 가져오기 (없으면 0.0)
        similarity = 0.0
        if similarity_scores and mb_sn in similarity_scores:
            similarity = similarity_scores[mb_sn]
        
        # 시스템 필드 제외하고 실제 데이터만 포함
        clean_metadata = {}
        for key, value in metadata.items():
            if key not in ["topic", "index", "mb_sn", "text", "_index_values"]:  # 시스템 필드 제외
                clean_metadata[key] = value
        
        # ⭐ 검색 결과에서는 Pinecone 메타데이터만 사용
        # 직업/직무 정보는 패널 상세정보 조회 시(/api/panels/{panel_id}) NeonDB merged 테이블에서 로드
        original_job = ""
        original_job_role = ""
        
        results.append({
            "id": mb_sn,
            "name": mb_sn,
            "mb_sn": mb_sn,
            "gender": gender,
            "age": age,
            "region": region,
            "income": str(income) if income else "",
            "welcome1_info": {
                "gender": gender,
                "age": age,
                "region": region,
                "age_group": metadata.get("연령대", ""),
                "marriage": metadata.get("결혼여부", ""),
                "children": metadata.get("자녀수"),
                "family": metadata.get("가족수", ""),
                "education": metadata.get("최종학력", ""),
            },
            "welcome2_info": {
                "job": metadata.get("직업", "") or original_job,
                "job_role": metadata.get("직무", "") or original_job_role,
                "personal_income": metadata.get("개인소득", ""),
                "household_income": metadata.get("가구소득", ""),
            },
            "similarity": similarity,
            "embedding": None,
            "responses": responses,
            "aiSummary": ai_summary,
            "created_at": datetime.now().isoformat(),
            "metadata": clean_metadata
        })
    
    # 페이지네이션
    total_count = len(results)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_results = results[start_idx:end_idx]
    
    pages = max(1, (total_count + limit - 1) // limit) if total_count > 0 else 0
    
    convert_time = time.time() - convert_start_time
    logger.info(f"[Panel Details] 완료: {convert_time:.2f}초, 총 {total_count}개 패널, 페이지네이션 후 {len(paginated_results)}개 반환")
    
    return {
        "count": len(paginated_results),
        "total": total_count,
        "page": page,
        "page_size": limit,
        "pages": pages,
        "results": paginated_results
    }

