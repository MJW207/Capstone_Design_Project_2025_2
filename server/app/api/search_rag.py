"""
RAG 의미검색 API 엔드포인트
자연어 쿼리를 받아 의미 기반 검색을 수행하고 답변과 근거 청크를 반환합니다.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import os

from app.db.session import get_session
from app.core.config import DBN, fq

router = APIRouter()


class RAGSearchRequest(BaseModel):
    """RAG 검색 요청"""
    query: str
    filters: Optional[Dict[str, Any]] = None
    top_k: int = 20


@router.post("/api/search/rag")
async def search_rag(
    req: RAGSearchRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    RAG 의미검색 (자연어 쿼리)
    
    자연어 쿼리를 받아 의미 기반으로 패널을 검색하고,
    검색 결과를 기반으로 요약 답변과 근거 청크를 반환합니다.
    
    Request:
        {
            "query": "20대 서울 거주 커피 좋아하는 패널",
            "filters": {
                "selectedGenders": ["F"],
                "selectedRegions": ["서울"]
            },
            "top_k": 20
        }
    
    Response:
        {
            "mode": "rag",
            "answer": "요약 텍스트",
            "chunks": [
                {
                    "id": 123,
                    "panel_id": "w123",
                    "score": 0.78,
                    "excerpt": "...",
                    "meta": {...}
                }
            ]
        }
    """
    # TODO: pgvector 기반 실제 임베딩 검색 구현
    # 현재는 필터 기반 검색 + 간단한 텍스트 매칭으로 대체
    
    # 1. 필터 파싱
    filters_dict = req.filters or {}
    
    # 2. 기본 필터 검색 수행 (dao_panels 사용)
    from app.db.dao_panels import search_panels
    
    search_filters = {
        "gender": filters_dict.get("selectedGenders"),
        "region": filters_dict.get("selectedRegions"),
        "limit": req.top_k,
        "offset": 0
    }
    
    if age_range := filters_dict.get("ageRange"):
        if isinstance(age_range, list) and len(age_range) == 2:
            search_filters["age_min"] = age_range[0]
            search_filters["age_max"] = age_range[1]
    
    # None 값 제거
    search_filters = {k: v for k, v in search_filters.items() if v is not None}
    
    # 3. 검색 실행
    try:
        rows = await search_panels(session, search_filters)
        
        # 4. 쿼리와 텍스트 매칭 (임시 구현)
        # 실제로는 임베딩 기반 유사도 계산 필요
        query_lower = req.query.lower()
        matched_chunks = []
        
        for idx, row in enumerate(rows):
            # 텍스트 데이터 추출
            text_parts = []
            if row.get("w2_data"):
                try:
                    import json
                    if isinstance(row["w2_data"], dict):
                        text_parts.append(json.dumps(row["w2_data"], ensure_ascii=False))
                    else:
                        text_parts.append(str(row["w2_data"]))
                except:
                    pass
            
            if row.get("qa_answers"):
                try:
                    import json
                    if isinstance(row["qa_answers"], dict):
                        text_parts.append(json.dumps(row["qa_answers"], ensure_ascii=False))
                    else:
                        text_parts.append(str(row["qa_answers"]))
                except:
                    pass
            
            combined_text = " ".join(text_parts)
            
            # 간단한 키워드 매칭 점수 (임시)
            score = 0.0
            query_words = query_lower.split()
            text_lower = combined_text.lower()
            
            for word in query_words:
                if word in text_lower:
                    score += 1.0 / len(query_words)
            
            # 쿼리 단어가 모두 포함되면 점수 높음
            if all(word in text_lower for word in query_words):
                score += 0.5
            
            if score > 0:
                matched_chunks.append({
                    "id": idx + 1,
                    "panel_id": row.get("mb_sn", ""),
                    "score": min(score, 1.0),
                    "excerpt": combined_text[:200] + ("..." if len(combined_text) > 200 else ""),
                    "meta": {
                        "gender": row.get("gender", ""),
                        "age": int(row.get("age_raw", 0)) if row.get("age_raw") else 0,
                        "region": row.get("location", "")
                    }
                })
        
        # 점수 순으로 정렬
        matched_chunks.sort(key=lambda x: x["score"], reverse=True)
        matched_chunks = matched_chunks[:req.top_k]
        
        # 5. 간단한 답변 생성 (임시)
        if matched_chunks:
            top_chunk = matched_chunks[0]
            answer = f"검색 쿼리 '{req.query}'에 해당하는 패널 {len(matched_chunks)}건을 찾았습니다. "
            answer += f"주요 특성: {top_chunk['meta'].get('gender', '')}, {top_chunk['meta'].get('age', 0)}세, {top_chunk['meta'].get('region', '')} 거주."
        else:
            answer = f"검색 쿼리 '{req.query}'에 해당하는 패널을 찾지 못했습니다."
        
        return {
            "mode": "rag",
            "answer": answer,
            "chunks": matched_chunks,
            "query": req.query
        }
        
    except Exception as e:
        print(f"RAG search error: {e}")
        raise HTTPException(status_code=500, detail=f"RAG search failed: {str(e)}")


