"""패널 상세 API 엔드포인트"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any
import logging

from app.db.session import get_session
from app.api.pinecone_panel_detail import get_panel_from_pinecone

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/api/panels/{panel_id}")
async def get_panel(
    panel_id: str,
    session: AsyncSession = Depends(get_session)
):
    """패널 상세 정보 조회 (Pinecone 사용)"""
    logger.info(f"[Panel API] ========== 패널 상세 조회 시작: {panel_id} ==========")
    """
    패널 상세 정보 조회 (Pinecone에서 직접 조회)
    
    Args:
        panel_id: 패널 ID (mb_sn)
        
    Returns:
        패널 상세 정보 (Pinecone 메타데이터 기반)
    """
    try:
        # ⭐ Pinecone에서 패널 상세 정보 조회 (PostgreSQL 완전 대체)
        result = get_panel_from_pinecone(panel_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Panel not found")
        
        # Pinecone에서 이미 모든 정보를 가져왔으므로 그대로 반환
        logger.info(f"[Panel API] ========== 패널 상세 조회 완료: {panel_id} ==========")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Panel API] 패널 조회 실패: {panel_id}, 오류: {str(e)}", exc_info=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Panel fetch failed: {str(e)}")
