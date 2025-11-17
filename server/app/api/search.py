"""패널 검색 API 엔드포인트"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import logging

from app.db.session import get_session
from app.core.config import (
    CHROMA_SEARCH_ENABLED,
    CHROMA_BASE_DIR,
    ANTHROPIC_API_KEY,
    UPSTAGE_API_KEY,
    load_category_config
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/search/status")
async def get_search_status():
    """검색 상태 확인 (ChromaDB 검색 + 필터 검색)"""
    try:
        status = {
            "chromadb_search_enabled": CHROMA_SEARCH_ENABLED,
            "status": "active",
            "message": ""
        }
        
        # ChromaDB 검색 상태 확인
        if CHROMA_SEARCH_ENABLED:
            try:
                import os
                if os.path.exists(CHROMA_BASE_DIR):
                    # ChromaDB 디렉토리 확인
                    panel_dirs = [d for d in os.listdir(CHROMA_BASE_DIR) 
                                 if os.path.isdir(os.path.join(CHROMA_BASE_DIR, d)) 
                                 and d.startswith("panel_")]
                    status["chromadb_panels_count"] = len(panel_dirs)
                    status["chromadb_available"] = True
                else:
                    status["chromadb_available"] = False
                    status["chromadb_error"] = f"ChromaDB 디렉토리를 찾을 수 없습니다: {CHROMA_BASE_DIR}"
                
                # 카테고리 설정 파일 확인
                try:
                    category_config = load_category_config()
                    status["category_config_loaded"] = True
                    status["category_count"] = len(category_config)
                except Exception as e:
                    status["category_config_loaded"] = False
                    status["category_config_error"] = str(e)
                    
            except Exception as e:
                status["chromadb_available"] = False
                status["chromadb_error"] = str(e)
        else:
            status["chromadb_available"] = False
        
        # 전체 상태 메시지 생성
        modes = []
        if CHROMA_SEARCH_ENABLED and status.get("chromadb_available"):
            modes.append("ChromaDB 검색")
        modes.append("필터 검색")
        
        if modes:
            status["message"] = f"사용 가능한 검색 모드: {', '.join(modes)}"
        else:
            status["status"] = "warning"
            status["message"] = "활성화된 검색 모드가 없습니다."
        
        return status
    except Exception as e:
        return {
            "chromadb_search_enabled": False,
            "status": "error",
            "message": f"상태 확인 중 오류: {str(e)}"
        }


async def _apply_filters_to_mb_sns(
    session: AsyncSession,
    mb_sn_list: List[str],
    filters_dict: Dict[str, Any]
) -> List[str]:
    """
    mb_sn 리스트에 필터 적용
    
    Args:
        session: DB 세션
        mb_sn_list: 패널 ID 리스트
        filters_dict: 필터 딕셔너리
        
    Returns:
        필터링된 mb_sn 리스트
    """
    if not mb_sn_list or not filters_dict:
        return mb_sn_list
    
    from app.core.config import DBN, fq
    
    W1 = fq(DBN.RAW, "welcome_1st")
    W2 = fq(DBN.RAW, "welcome_2nd")
    QA = fq(DBN.RAW, "quick_answer")
    
    # 필터 조건 구성
    filter_conditions = []
    params = {"mb_sn_list": mb_sn_list}
    
    # 성별 필터
    if selected_genders := filters_dict.get("selectedGenders"):
        if isinstance(selected_genders, list):
            gender_conditions = []
            for i, gender in enumerate(selected_genders):
                param_name = f"gender_{i}"
                params[param_name] = gender
                # '남'/'여'를 'M'/'F'로 변환
                if gender in ['남', '남성']:
                    params[param_name] = 'M'
                elif gender in ['여', '여성']:
                    params[param_name] = 'F'
                gender_conditions.append(f"w1.gender = :{param_name}")
            filter_conditions.append(f"({' OR '.join(gender_conditions)})")
    
    # 지역 필터
    if selected_regions := filters_dict.get("selectedRegions"):
        if isinstance(selected_regions, list):
            region_conditions = []
            for i, region in enumerate(selected_regions):
                param_name = f"region_{i}"
                params[param_name] = region
                region_conditions.append(f"w1.location = :{param_name}")
            filter_conditions.append(f"({' OR '.join(region_conditions)})")
    
    # 나이 필터
    if age_range := filters_dict.get("ageRange"):
        if isinstance(age_range, list) and len(age_range) == 2:
            age_min, age_max = age_range[0], age_range[1]
            if age_min is not None:
                params["age_min"] = age_min
                filter_conditions.append("""
                    CASE 
                        WHEN COALESCE(NULLIF(w1.birth_year, ''), NULL) IS NOT NULL
                             AND w1.birth_year ~ '^[0-9]+$'
                        THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, MAKE_DATE(w1.birth_year::int, 1, 1)))::int
                        ELSE NULL 
                    END >= :age_min
                """)
            if age_max is not None:
                params["age_max"] = age_max
                filter_conditions.append("""
                    CASE 
                        WHEN COALESCE(NULLIF(w1.birth_year, ''), NULL) IS NOT NULL
                             AND w1.birth_year ~ '^[0-9]+$'
                        THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, MAKE_DATE(w1.birth_year::int, 1, 1)))::int
                        ELSE NULL 
                    END <= :age_max
                """)
    
    # 소득 필터
    if selected_incomes := filters_dict.get("selectedIncomes"):
        if isinstance(selected_incomes, list):
            income_conditions = []
            for income_range_str in selected_incomes:
                if "~" in income_range_str:
                    parts = income_range_str.replace("~", " ").replace("만원", "").split()
                    if len(parts) == 2:
                        try:
                            min_income = int(parts[0]) * 10000
                            max_income = int(parts[1]) * 10000
                            income_conditions.append(
                                f"((w2.data->>'income_personal')::numeric BETWEEN {min_income} AND {max_income} "
                                f"OR (w2.data->>'income_household')::numeric BETWEEN {min_income} AND {max_income})"
                            )
                        except (ValueError, TypeError):
                            pass
            if income_conditions:
                filter_conditions.append(f"({' OR '.join(income_conditions)})")
    
    # 퀵폴 필터
    if filters_dict.get("quickpollOnly"):
        filter_conditions.append("qa.mb_sn IS NOT NULL")
    
    # 필터가 없으면 원본 리스트 반환
    if not filter_conditions:
        return mb_sn_list
    
    # 필터 SQL 쿼리
    filter_sql = f"""
    SELECT w1.mb_sn
    FROM {W1} w1
    LEFT JOIN {W2} w2 ON w1.mb_sn = w2.mb_sn
    LEFT JOIN {QA} qa ON w1.mb_sn = qa.mb_sn
    WHERE w1.mb_sn = ANY(:mb_sn_list)
    """
    if filter_conditions:
        filter_sql += " AND " + " AND ".join(filter_conditions)
    
    result = await session.execute(text(filter_sql), params)
    filtered_mb_sns = [row[0] for row in result]
    
    # 원본 순서 유지
    mb_sn_set = set(filtered_mb_sns)
    return [mb_sn for mb_sn in mb_sn_list if mb_sn in mb_sn_set]


async def _get_panel_details_from_mb_sns(
    session: AsyncSession,
    mb_sn_list: List[str],
    page: int,
    limit: int
) -> Dict[str, Any]:
    """
    mb_sn 리스트로부터 패널 상세 정보 조회 (기존 API 형식으로 변환)
    
    Args:
        session: DB 세션
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
    
    from app.core.config import DBN, fq
    
    W1 = fq(DBN.RAW, "welcome_1st")
    W2 = fq(DBN.RAW, "welcome_2nd")
    QA = fq(DBN.RAW, "quick_answer")
    
    # RawData에서 패널 정보 조회
    raw_data_sql = f"""
    SELECT 
        w1.mb_sn,
        w1.gender,
        CASE 
            WHEN COALESCE(NULLIF(w1.birth_year, ''), NULL) IS NOT NULL
                 AND w1.birth_year ~ '^[0-9]+$'
            THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, MAKE_DATE(w1.birth_year::int, 1, 1)))::int
            ELSE NULL 
        END AS age_raw,
        w1."location",
        w2."data"->>'w2_data' AS w2_data,
        CASE WHEN qa.mb_sn IS NOT NULL THEN true ELSE false END AS has_quickpoll
    FROM {W1} w1
    LEFT JOIN {W2} w2 ON w1.mb_sn = w2.mb_sn
    LEFT JOIN {QA} qa ON w1.mb_sn = qa.mb_sn
    WHERE w1.mb_sn = ANY(:mb_sn_list)
    ORDER BY array_position(:mb_sn_list, w1.mb_sn)
    """
    
    result = await session.execute(text(raw_data_sql), {"mb_sn_list": mb_sn_list})
    
    all_rows = []
    for row in result:
        all_rows.append({
            "mb_sn": row[0],
            "gender": row[1] or "",
            "age_raw": int(row[2] or 0) if row[2] is not None else 0,
            "location": row[3] or "",
            "w2_data": row[4] or "",
            "has_quickpoll": row[5] or False
        })
    
    # 페이지네이션
    total_count = len(all_rows)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_rows = all_rows[start_idx:end_idx]
    
    # merged_final.json에서 메타데이터 로드
    from app.api.panels import load_merged_data
    merged_data = load_merged_data()
    
    # 결과 변환
    results = []
    for r in paginated_rows:
        mb_sn = r["mb_sn"]
        merged_metadata = merged_data.get(mb_sn, {}) if merged_data else {}
        
        results.append({
            "id": mb_sn,
            "name": mb_sn,
            "mb_sn": mb_sn,
            "gender": r["gender"],
            "age": r["age_raw"],
            "region": r["location"],
            "coverage": "qw" if r["has_quickpoll"] else "w",
            "similarity": 0.0,
            "embedding": None,
            "responses": {"q1": str(r["w2_data"])[:140]},
            "created_at": datetime.now().isoformat(),
            "metadata": merged_metadata
        })
    
    pages = max(1, (total_count + limit - 1) // limit) if total_count > 0 else 0
    
    return {
        "count": len(results),
        "total": total_count,
        "page": page,
        "page_size": limit,
        "pages": pages,
        "results": results
    }


# 파이프라인 싱글톤 (재사용)
_pipeline_instance: Optional[Any] = None
_pipeline_lock = None

# ChromaDB 검색 결과 캐시 (쿼리 -> mb_sn 리스트)
_chromadb_cache: Dict[str, Dict[str, Any]] = {}
_cache_lock = None
_cache_max_size = 100  # 최대 캐시 크기


def _get_cache_key(query: str, top_k: int) -> str:
    """캐시 키 생성"""
    return f"{query.strip().lower()}:{top_k}"


def _get_cached_result(query: str, top_k: int) -> Optional[List[str]]:
    """캐시에서 검색 결과 가져오기"""
    import threading
    global _chromadb_cache, _cache_lock
    
    if _cache_lock is None:
        _cache_lock = threading.Lock()
    
    cache_key = _get_cache_key(query, top_k)
    
    with _cache_lock:
        if cache_key in _chromadb_cache:
            cached = _chromadb_cache[cache_key]
            logger.debug(f"[ChromaDB 캐시] 캐시 히트: '{query}' (top_k={top_k})")
            return cached.get('results')
    
    return None


def _set_cached_result(query: str, top_k: int, results: List[str]):
    """검색 결과를 캐시에 저장"""
    import threading
    global _chromadb_cache, _cache_lock
    
    if _cache_lock is None:
        _cache_lock = threading.Lock()
    
    cache_key = _get_cache_key(query, top_k)
    
    with _cache_lock:
        # 캐시 크기 제한 (LRU 방식)
        if len(_chromadb_cache) >= _cache_max_size:
            # 가장 오래된 항목 제거 (FIFO)
            oldest_key = next(iter(_chromadb_cache))
            del _chromadb_cache[oldest_key]
            logger.debug(f"[ChromaDB 캐시] 오래된 캐시 제거: '{oldest_key}'")
        
        _chromadb_cache[cache_key] = {
            'results': results,
            'timestamp': datetime.now().isoformat()
        }
        logger.debug(f"[ChromaDB 캐시] 캐시 저장: '{query}' (top_k={top_k}), 결과: {len(results)}개")


def _get_pipeline():
    """파이프라인 싱글톤 인스턴스 반환 (지연 초기화)"""
    global _pipeline_instance, _pipeline_lock
    
    if _pipeline_instance is None:
        import threading
        if _pipeline_lock is None:
            _pipeline_lock = threading.Lock()
        
        with _pipeline_lock:
            if _pipeline_instance is None:
                from app.services.chroma_pipeline import PanelSearchPipeline
                category_config = load_category_config()
                _pipeline_instance = PanelSearchPipeline(
                    chroma_base_dir=CHROMA_BASE_DIR,
                    category_config=category_config,
                    anthropic_api_key=ANTHROPIC_API_KEY,
                    upstage_api_key=UPSTAGE_API_KEY
                )
                logger.info("ChromaDB 파이프라인 초기화 완료")
    
    return _pipeline_instance


async def _search_with_chromadb(
    query_text: str,
    top_k: int = 100,
    use_cache: bool = True,
    force_refresh: bool = False
) -> Optional[List[str]]:
    """
    ChromaDB를 사용한 패널 검색 (비동기 실행, 파이프라인 재사용, 캐싱 지원)
    
    Args:
        query_text: 검색 쿼리
        top_k: 반환할 패널 수
        use_cache: 캐시 사용 여부
        force_refresh: 강제 새로고침 (캐시 무시)
        
    Returns:
        mb_sn 리스트 또는 None (실패 시)
    """
    if not CHROMA_SEARCH_ENABLED:
        return None
    
    # 캐시 확인 (강제 새로고침이 아니고 캐시 사용이 활성화된 경우)
    if use_cache and not force_refresh:
        cached_result = _get_cached_result(query_text, top_k)
        if cached_result is not None:
            logger.info(f"[ChromaDB 캐시] 캐시에서 결과 반환: '{query_text}' (top_k={top_k}), 결과: {len(cached_result)}개")
            return cached_result
    
    try:
        import asyncio
        
        # 싱글톤 파이프라인 가져오기
        pipeline = _get_pipeline()
        
        # 동기 함수를 비동기로 실행 (LLM 호출 등 블로킹 작업 포함)
        # 별도 스레드 풀 사용 (기본 executor는 I/O 작업에 최적화)
        loop = asyncio.get_event_loop()
        mb_sn_list = await loop.run_in_executor(
            None, 
            lambda: pipeline.search(query_text, top_k=top_k)
        )
        
        # 검색 성공 시 캐시에 저장
        if mb_sn_list is not None and use_cache:
            _set_cached_result(query_text, top_k, mb_sn_list)
        
        logger.info(f"ChromaDB 검색 완료: {len(mb_sn_list) if mb_sn_list else 0}개 패널 발견")
        return mb_sn_list
        
    except Exception as e:
        logger.error(f"ChromaDB 검색 실패: {e}", exc_info=True)
        # 오류 발생 시에도 캐시된 결과가 있으면 반환 (fallback)
        if use_cache and not force_refresh:
            cached_result = _get_cached_result(query_text, top_k)
            if cached_result is not None:
                logger.warning(f"[ChromaDB 캐시] 검색 실패, 캐시된 결과 반환: '{query_text}'")
                return cached_result
        return None


@router.post("/api/search")
async def api_search_post(
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_session)
):
    """패널 검색 API - ChromaDB 검색만 사용, 필터 지원"""
    try:
        filters_dict = payload.get("filters") or {}
        query_text = payload.get("query") or filters_dict.get("query")
        page = int(payload.get("page", 1))
        limit = int(payload.get("limit", 20))
        
        # 쿼리가 있는 경우: ChromaDB 검색
        if query_text and str(query_text).strip():
            if not CHROMA_SEARCH_ENABLED:
                logger.warning("ChromaDB 검색이 비활성화되어 있습니다.")
                return {
                    "query": query_text,
                    "page": page,
                    "page_size": limit,
                    "count": 0,
                    "total": 0,
                    "pages": 0,
                    "mode": "chromadb",
                    "error": "ChromaDB 검색이 비활성화되어 있습니다.",
                    "results": []
                }
            
            import time
            api_start = time.time()
            logger.info(f"[API] ========== ChromaDB 검색 시작 ==========")
            logger.info(f"[API] 쿼리: '{query_text}'")
            logger.info(f"[API] 최대 반환 개수: 10개")
            
            # 패널 검색 (테스트용: 10개로 제한)
            search_top_k = 10  # 테스트용으로 10개로 제한
            force_refresh = payload.get("force_refresh", False)  # 재검색 버튼 클릭 시 True
            chroma_start = time.time()
            chroma_mb_sns = await _search_with_chromadb(
                query_text, 
                top_k=search_top_k,
                use_cache=True,
                force_refresh=force_refresh
            )
            chroma_time = time.time() - chroma_start
            logger.info(f"[API] ChromaDB 검색 완료: {chroma_time:.2f}초, 결과: {len(chroma_mb_sns) if chroma_mb_sns else 0}개, 캐시 사용: {not force_refresh}")
            
            if chroma_mb_sns:
                # 필터 적용
                filter_start = time.time()
                filtered_mb_sns = await _apply_filters_to_mb_sns(
                    session, chroma_mb_sns, filters_dict
                )
                filter_time = time.time() - filter_start
                logger.info(f"[API] 필터 적용 완료: {filter_time:.2f}초, 결과: {len(filtered_mb_sns)}개 패널")
                
                if filtered_mb_sns:
                    # 최대 10개로 제한
                    limit_start = time.time()
                    filtered_mb_sns = filtered_mb_sns[:10]
                    limit_time = time.time() - limit_start
                    logger.info(f"[API] 10개로 제한 완료: {limit_time:.4f}초, 최종: {len(filtered_mb_sns)}개 패널")
                    
                    # 필터링된 결과를 기존 API 형식으로 변환 (페이지네이션 없이 전체 반환)
                    convert_start = time.time()
                    panel_details = await _get_panel_details_from_mb_sns(
                        session, filtered_mb_sns, 1, 10
                    )
                    convert_time = time.time() - convert_start
                    logger.info(f"[API] 결과 변환 완료: {convert_time:.2f}초, 반환 결과: {len(panel_details['results'])}개")
                    
                    total_time = time.time() - api_start
                    logger.info(f"[API] ========== 전체 검색 완료 ==========")
                    logger.info(f"[API] 총 소요 시간: {total_time:.2f}초")
                    logger.info(f"[API]   - ChromaDB 검색: {chroma_time:.2f}초")
                    logger.info(f"[API]   - 필터 적용: {filter_time:.2f}초")
                    logger.info(f"[API]   - 개수 제한: {limit_time:.4f}초")
                    logger.info(f"[API]   - 결과 변환: {convert_time:.2f}초")
                    logger.info(f"[API] 최종 반환 개수: {len(panel_details['results'])}개")
                    
                    return {
                        "query": query_text,
                        "page": 1,
                        "page_size": len(panel_details["results"]),
                        "count": len(panel_details["results"]),
                        "total": len(panel_details["results"]),
                        "pages": 1,
                        "mode": "chromadb",
                        "results": panel_details["results"]
                    }
                else:
                    # 필터로 인해 결과가 0개
                    return {
                        "query": query_text,
                        "page": page,
                        "page_size": limit,
                        "count": 0,
                        "total": 0,
                        "pages": 0,
                        "mode": "chromadb",
                        "error": "필터 조건에 맞는 결과가 없습니다.",
                        "results": []
                    }
            else:
                # ChromaDB 검색 실패 시 필터 검색으로 폴백
                logger.info("ChromaDB 검색 실패, 필터 검색으로 폴백")
        
        # 쿼리가 없거나 ChromaDB 검색 실패 시: 필터 기반 검색
        from app.db.dao_panels import search_panels
        
        search_filters = {
            "gender": filters_dict.get("selectedGenders"),
            "region": filters_dict.get("selectedRegions"),
            "limit": page * limit,
            "offset": (page - 1) * limit
        }
        
        if age_range := filters_dict.get("ageRange"):
            if isinstance(age_range, list) and len(age_range) == 2:
                search_filters["age_min"] = age_range[0]
                search_filters["age_max"] = age_range[1]
        
        if query_text:
            search_filters["query"] = query_text
        
        # None 값 제거
        search_filters = {k: v for k, v in search_filters.items() if v is not None}
        
        try:
            rows = await search_panels(session, search_filters)
            total_count = len(rows)
            
            # merged_final.json에서 메타데이터 로드
            from app.api.panels import load_merged_data
            merged_data = load_merged_data()
            
            # 결과 변환
            results = []
            for r in rows:
                mb_sn = r.get("mb_sn", "")
                merged_metadata = merged_data.get(mb_sn, {}) if merged_data else {}
                
                results.append({
                    "id": mb_sn,
                    "name": mb_sn,
                    "mb_sn": mb_sn,  # 클러스터링 매핑을 위해 mb_sn 필드 명시적으로 추가
                    "gender": r.get("gender", ""),
                    "age": int(r.get("age_raw", 0) or 0),
                    "region": r.get("location", ""),
                    "coverage": "qw" if r.get("qa_answers") else "w",
                    "similarity": 0.0,
                    "embedding": None,
                    "responses": {"q1": str(r.get("w2_data", ""))[:140]},
                    "created_at": datetime.now().isoformat(),
                    "metadata": merged_metadata
                })
            
            pages = max(1, (total_count + limit - 1) // limit) if total_count > 0 else 0
            
            return {
                "query": query_text,
                "page": page,
                "page_size": limit,
                "count": len(results),
                "total": total_count,
                "pages": pages,
                "mode": "filter",
                "results": results
            }
        except Exception as filter_error:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"필터 검색 실패: {str(filter_error)}")
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        logger.error(f"검색 API 오류: {e}\n{error_detail}")
        raise HTTPException(
            status_code=500,
            detail=f"검색 중 오류 발생: {str(e)}"
        )
