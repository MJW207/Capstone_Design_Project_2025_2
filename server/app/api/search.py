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
    PINECONE_SEARCH_ENABLED,
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    ANTHROPIC_API_KEY,
    UPSTAGE_API_KEY,
    load_category_config
)
from app.services.pinecone_filter_converter import PineconeFilterConverter
from app.api.pinecone_panel_details import _get_panel_details_from_pinecone

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/search/status")
async def get_search_status():
    """검색 상태 확인 (Pinecone 검색 + 필터 검색)"""
    try:
        status = {
            "pinecone_search_enabled": PINECONE_SEARCH_ENABLED,
            "status": "active",
            "message": ""
        }
        
        # Pinecone 검색 상태 확인
        if PINECONE_SEARCH_ENABLED:
            try:
                if PINECONE_API_KEY:
                    status["pinecone_available"] = True
                    status["pinecone_index_name"] = PINECONE_INDEX_NAME
                else:
                    status["pinecone_available"] = False
                    status["pinecone_error"] = "Pinecone API 키가 설정되지 않았습니다"
                
                # 카테고리 설정 파일 확인
                try:
                    category_config = load_category_config()
                    status["category_config_loaded"] = True
                    status["category_count"] = len(category_config)
                except Exception as e:
                    status["category_config_loaded"] = False
                    status["category_config_error"] = str(e)
                    
            except Exception as e:
                status["pinecone_available"] = False
                status["pinecone_error"] = str(e)
        else:
            status["pinecone_available"] = False
        
        # 전체 상태 메시지 생성
        modes = []
        if PINECONE_SEARCH_ENABLED and status.get("pinecone_available"):
            modes.append("Pinecone 검색")
        modes.append("필터 검색")
        
        if modes:
            status["message"] = f"사용 가능한 검색 모드: {', '.join(modes)}"
        else:
            status["status"] = "warning"
            status["message"] = "활성화된 검색 모드가 없습니다."
        
        return status
    except Exception as e:
        return {
            "pinecone_search_enabled": False,
            "status": "error",
            "message": f"상태 확인 중 오류: {str(e)}"
        }


# ⭐ PostgreSQL 필터 함수 제거됨 - Pinecone 필터로 완전 대체
# async def _apply_filters_to_mb_sns() 함수는 더 이상 사용하지 않음
# 모든 필터링은 Pinecone 메타데이터 필터로 처리됨


# ⭐ PostgreSQL 패널 상세 정보 조회 함수 제거됨 - Pinecone으로 완전 대체
# async def _get_panel_details_from_mb_sns() 함수는 더 이상 사용하지 않음
# 모든 패널 상세 정보는 _get_panel_details_from_pinecone()으로 처리됨


# 파이프라인 싱글톤 (재사용)
_pipeline_instance: Optional[Any] = None
_pipeline_lock = None

# Pinecone 검색 결과 캐시 (쿼리 -> mb_sn 리스트)
_pinecone_cache: Dict[str, Dict[str, Any]] = {}
_cache_lock = None
_cache_max_size = 100  # 최대 캐시 크기


def _get_cache_key(query: str, top_k: int) -> str:
    """캐시 키 생성"""
    return f"{query.strip().lower()}:{top_k}"


def _get_cached_result(query: str, top_k: int) -> Optional[List[str]]:
    """캐시에서 검색 결과 가져오기"""
    import threading
    global _pinecone_cache, _cache_lock
    
    if _cache_lock is None:
        _cache_lock = threading.Lock()
    
    cache_key = _get_cache_key(query, top_k)
    
    with _cache_lock:
        if cache_key in _pinecone_cache:
            cached = _pinecone_cache[cache_key]
            logger.debug(f"[Pinecone 캐시] 캐시 히트: '{query}' (top_k={top_k})")
            return cached.get('results')
    
    return None


def _set_cached_result(query: str, top_k: int, results: List[str]):
    """검색 결과를 캐시에 저장"""
    import threading
    global _pinecone_cache, _cache_lock
    
    if _cache_lock is None:
        _cache_lock = threading.Lock()
    
    cache_key = _get_cache_key(query, top_k)
    
    with _cache_lock:
        # 캐시 크기 제한 (LRU 방식)
        if len(_pinecone_cache) >= _cache_max_size:
            # 가장 오래된 항목 제거 (FIFO)
            oldest_key = next(iter(_pinecone_cache))
            del _pinecone_cache[oldest_key]
            logger.debug(f"[Pinecone 캐시] 오래된 캐시 제거: '{oldest_key}'")
        
        _pinecone_cache[cache_key] = {
            'results': results,
            'top_k': top_k,
            'timestamp': datetime.now().isoformat()
        }
        logger.debug(f"[Pinecone 캐시] 캐시 저장: '{query}' (top_k={top_k}), 결과: {len(results)}개")


def _get_pipeline():
    """파이프라인 싱글톤 인스턴스 반환 (지연 초기화)"""
    global _pipeline_instance, _pipeline_lock
    
    if _pipeline_instance is None:
        import threading
        if _pipeline_lock is None:
            _pipeline_lock = threading.Lock()
        
        with _pipeline_lock:
            if _pipeline_instance is None:
                from app.services.pinecone_pipeline import PanelSearchPipeline
                category_config = load_category_config()
                
                if not PINECONE_API_KEY:
                    raise ValueError("PINECONE_API_KEY 환경변수가 설정되지 않았습니다.")
                
                _pipeline_instance = PanelSearchPipeline(
                    pinecone_api_key=PINECONE_API_KEY,
                    pinecone_index_name=PINECONE_INDEX_NAME,
                    category_config=category_config,
                    anthropic_api_key=ANTHROPIC_API_KEY,
                    upstage_api_key=UPSTAGE_API_KEY
                )
                logger.info("Pinecone 파이프라인 초기화 완료")
    
    return _pipeline_instance


async def _search_with_pinecone(
    query_text: str,
    top_k: int = 100,
    use_cache: bool = True,
    force_refresh: bool = False,
    filters_dict: Optional[Dict[str, Any]] = None
) -> Optional[List[str]]:
    """
    Pinecone을 사용한 패널 검색 (비동기 실행, 파이프라인 재사용, 캐싱 지원)
    
    Args:
        query_text: 검색 쿼리
        top_k: 반환할 패널 수
        use_cache: 캐시 사용 여부
        force_refresh: 강제 새로고침 (캐시 무시)
        
    Returns:
        mb_sn 리스트 또는 None (실패 시)
    """
    if not PINECONE_SEARCH_ENABLED:
        return None
    
    # 캐시 확인 (강제 새로고침이 아니고 캐시 사용이 활성화된 경우)
    if use_cache and not force_refresh:
        cached_result = _get_cached_result(query_text, top_k)
        if cached_result is not None:
            logger.info(f"[Pinecone 캐시] 캐시에서 결과 반환: '{query_text}' (top_k={top_k}), 결과: {len(cached_result)}개")
            return cached_result
    
    try:
        import asyncio
        
        # 싱글톤 파이프라인 가져오기
        pipeline = _get_pipeline()
        
        # 프론트엔드 필터를 Pinecone 필터로 변환
        external_filters = None
        if filters_dict:
            converter = PineconeFilterConverter()
            external_filters = converter.convert_to_pinecone_filters(filters_dict)
            if external_filters:
                logger.info(f"[Pinecone 검색] 외부 필터 적용: {external_filters}")
        
        # 동기 함수를 비동기로 실행 (LLM 호출 등 블로킹 작업 포함)
        # 별도 스레드 풀 사용 (기본 executor는 I/O 작업에 최적화)
        loop = asyncio.get_event_loop()
        mb_sn_list = await loop.run_in_executor(
            None, 
            lambda: pipeline.search(query_text, top_k=top_k, external_filters=external_filters)
        )
        
        # 검색 성공 시 캐시에 저장
        if mb_sn_list is not None and use_cache:
            _set_cached_result(query_text, top_k, mb_sn_list)
        
        logger.info(f"Pinecone 검색 완료: {len(mb_sn_list) if mb_sn_list else 0}개 패널 발견")
        return mb_sn_list
        
    except Exception as e:
        logger.error(f"Pinecone 검색 실패: {e}", exc_info=True)
        # 오류 발생 시에도 캐시된 결과가 있으면 반환 (fallback)
        if use_cache and not force_refresh:
            cached_result = _get_cached_result(query_text, top_k)
            if cached_result is not None:
                logger.warning(f"[Pinecone 캐시] 검색 실패, 캐시된 결과 반환: '{query_text}'")
                return cached_result
        return None


@router.post("/api/search")
async def api_search_post(
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_session)
):
    """패널 검색 API - Pinecone 검색 사용, 필터 지원"""
    try:
        filters_dict = payload.get("filters") or {}
        query_text = payload.get("query") or filters_dict.get("query")
        page = int(payload.get("page", 1))
        limit = int(payload.get("limit", 20))
        
        # 쿼리가 있는 경우: Pinecone 검색
        if query_text and str(query_text).strip():
            if not PINECONE_SEARCH_ENABLED:
                logger.warning("Pinecone 검색이 비활성화되어 있습니다.")
                return {
                    "query": query_text,
                    "page": page,
                    "page_size": limit,
                    "count": 0,
                    "total": 0,
                    "pages": 0,
                    "mode": "pinecone",
                    "error": "Pinecone 검색이 비활성화되어 있습니다.",
                    "results": []
                }
            
            import time
            api_start = time.time()
            logger.info(f"[API] ========== Pinecone 검색 시작 ==========")
            logger.info(f"[API] 쿼리: '{query_text}'")
            logger.info(f"[API] 최대 반환 개수: 10개")
            
            # 패널 검색 (테스트용: 10개로 제한)
            search_top_k = 10  # 테스트용으로 10개로 제한
            force_refresh = payload.get("force_refresh", False)  # 재검색 버튼 클릭 시 True
            pinecone_start = time.time()
            pinecone_mb_sns = await _search_with_pinecone(
                query_text, 
                top_k=search_top_k,
                use_cache=True,
                force_refresh=force_refresh,
                filters_dict=filters_dict  # 필터 전달
            )
            pinecone_time = time.time() - pinecone_start
            logger.info(f"[API] Pinecone 검색 완료: {pinecone_time:.2f}초, 결과: {len(pinecone_mb_sns) if pinecone_mb_sns else 0}개, 캐시 사용: {not force_refresh}")
            
            if pinecone_mb_sns:
                # ⭐ 필터는 이미 Pinecone 검색 시 적용됨 (PostgreSQL 필터 제거)
                filtered_mb_sns = pinecone_mb_sns
                logger.info(f"[API] Pinecone 필터 적용 완료, 결과: {len(filtered_mb_sns)}개 패널")
                
                if filtered_mb_sns:
                    # 최대 10개로 제한
                    limit_start = time.time()
                    filtered_mb_sns = filtered_mb_sns[:10]
                    limit_time = time.time() - limit_start
                    logger.info(f"[API] 10개로 제한 완료: {limit_time:.4f}초, 최종: {len(filtered_mb_sns)}개 패널")
                    
                    # 필터링된 결과를 기존 API 형식으로 변환 (Pinecone 메타데이터 사용)
                    convert_start = time.time()
                    panel_details = await _get_panel_details_from_pinecone(
                        filtered_mb_sns, 1, 10
                    )
                    convert_time = time.time() - convert_start
                    logger.info(f"[API] 결과 변환 완료: {convert_time:.2f}초, 반환 결과: {len(panel_details['results'])}개")
                    
                    total_time = time.time() - api_start
                    logger.info(f"[API] ========== 전체 검색 완료 ==========")
                    logger.info(f"[API] 총 소요 시간: {total_time:.2f}초")
                    logger.info(f"[API]   - Pinecone 검색: {pinecone_time:.2f}초")
                    logger.info(f"[API]   - 결과 변환: {convert_time:.2f}초")
                    logger.info(f"[API] 최종 반환 개수: {len(panel_details['results'])}개")
                    
                    return {
                        "query": query_text,
                        "page": 1,
                        "page_size": len(panel_details["results"]),
                        "count": len(panel_details["results"]),
                        "total": len(panel_details["results"]),
                        "pages": 1,
                        "mode": "pinecone",
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
                        "mode": "pinecone",
                        "error": "필터 조건에 맞는 결과가 없습니다.",
                        "results": []
                    }
            else:
                # Pinecone 검색 실패 시 필터 검색으로 폴백
                logger.info("Pinecone 검색 실패, 필터 검색으로 폴백")
        
        # 쿼리가 없거나 Pinecone 검색 실패 시: 필터만으로 Pinecone 검색
        if filters_dict and any(filters_dict.values()):
            logger.info("[API] 필터만으로 Pinecone 검색 시도")
            try:
                # 필터를 Pinecone 필터로 변환
                converter = PineconeFilterConverter()
                external_filters = converter.convert_to_pinecone_filters(filters_dict)
                
                if external_filters:
                    # 빈 쿼리로 Pinecone 검색 (필터만 적용)
                    import asyncio
                    pipeline = _get_pipeline()
                    loop = asyncio.get_event_loop()
                    
                    # 빈 쿼리로 검색 (필터만 적용)
                    mb_sn_list = await loop.run_in_executor(
                        None,
                        lambda: pipeline.search("", top_k=limit * page, external_filters=external_filters)
                    )
                    
                    if mb_sn_list:
                        # 페이지네이션
                        start_idx = (page - 1) * limit
                        end_idx = start_idx + limit
                        paginated_mb_sns = mb_sn_list[start_idx:end_idx]
                        
                        # 패널 상세 정보 조회
                        panel_details = await _get_panel_details_from_pinecone(
                            paginated_mb_sns, page, limit
                        )
                        
                        return {
                            "query": "",
                            "page": page,
                            "page_size": limit,
                            "count": panel_details["count"],
                            "total": panel_details["total"],
                            "pages": panel_details["pages"],
                            "mode": "pinecone_filter",
                            "results": panel_details["results"]
                        }
            except Exception as e:
                logger.error(f"필터 검색 실패: {e}", exc_info=True)
        
        # Fallback: 빈 결과 반환
        return {
            "query": query_text or "",
            "page": page,
            "page_size": limit,
            "count": 0,
            "total": 0,
            "pages": 0,
            "mode": "pinecone",
            "error": "검색 결과가 없습니다.",
            "results": []
        }
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        logger.error(f"검색 API 오류: {e}\n{error_detail}")
        raise HTTPException(
            status_code=500,
            detail=f"검색 중 오류 발생: {str(e)}"
        )
