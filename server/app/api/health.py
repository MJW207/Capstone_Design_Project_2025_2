"""Health check API"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import os

from app.db.session import get_session
from app.db.dao_panels import fetch_raw_sample

router = APIRouter()


@router.get("/health")
async def ping():
    """기본 Health check"""
    return {"ok": True}


@router.get("/health/db")
async def db_ping(session: AsyncSession = Depends(get_session)):
    """
    DB 연결 및 스키마 확인
    
    Returns:
        {
            "ok": true,
            "search_path": "RawData, public",
            "version": "PostgreSQL ..."
        }
    """
    try:
        # 현재 search_path와 버전 확인
        q = await session.execute(text("SHOW search_path"))
        search_path = q.scalar_one_or_none()
        
        v = await session.execute(text("SELECT version()"))
        version = v.scalar_one_or_none()
        
        return {
            "ok": True,
            "search_path": search_path,
            "version": version
        }
    except Exception as e:
        return {
            "ok": False,
            "db": False,
            "error": str(e)
        }


@router.get("/health/raw-sample")
async def raw_sample(
    limit: int = Query(default=5, ge=1, le=100, description="반환할 샘플 행 수"),
    session: AsyncSession = Depends(get_session)
):
    """
    RawData 스키마에서 샘플 데이터 조회
    
    Args:
        limit: 반환할 행 수 (1-100, 기본 5)
        session: 비동기 데이터베이스 세션
        
    Returns:
        {
            "count": 5,
            "rows": [...]
        }
    """
    try:
        rows = await fetch_raw_sample(session, limit=limit)
        return {
            "count": len(rows),
            "rows": rows
        }
    except Exception as e:
        return {
            "count": 0,
            "rows": [],
            "error": str(e)
        }


@router.get("/healthz")
async def healthz(session: AsyncSession = Depends(get_session)):
    """
    헬스체크 및 사전 점검
    
    - DB 연결 확인
    
    Returns:
        {
            "ok": true,
            "db": true
        }
    """
    result = {
        "ok": True,
        "db": False
    }
    
    # DB 연결 확인
    try:
        await session.execute(text("SELECT 1"))
        result["db"] = True
    except Exception as e:
        result["ok"] = False
        result["db_error"] = str(e)
    
    return result


@router.post("/health/enable-pgvector")
async def enable_pgvector(session: AsyncSession = Depends(get_session)):
    """
    pgvector 확장 활성화
    
    Returns:
        {
            "success": true,
            "extension_exists": true,
            "message": "pgvector 확장이 활성화되었습니다"
        }
    """
    try:
        # 확장 설치 여부 확인
        check_sql = "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as ext_exists;"
        result = await session.execute(text(check_sql))
        ext_exists = result.scalar()
        
        if ext_exists:
            return {
                "success": True,
                "extension_exists": True,
                "message": "pgvector 확장이 이미 활성화되어 있습니다"
            }
        
        # 확장 활성화 시도
        try:
            await session.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            await session.commit()
            
            # 다시 확인
            result = await session.execute(text(check_sql))
            ext_exists = result.scalar()
            
            if ext_exists:
                return {
                    "success": True,
                    "extension_exists": True,
                    "message": "pgvector 확장이 활성화되었습니다"
                }
            else:
                return {
                    "success": False,
                    "extension_exists": False,
                    "message": "pgvector 확장 활성화에 실패했습니다. 권한 문제일 수 있습니다."
                }
        except Exception as e:
            error_msg = str(e)
            await session.rollback()
            
            return {
                "success": False,
                "extension_exists": False,
                "error": error_msg,
                "message": f"pgvector 확장 활성화 실패: {error_msg}. Neon DB 대시보드에서 수동으로 활성화해주세요."
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "pgvector 확장 확인 중 오류가 발생했습니다"
        }
