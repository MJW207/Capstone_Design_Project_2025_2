"""패널 검색 API 엔드포인트"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Dict, Any
from datetime import datetime
import json

from app.db.session import get_session
from app.db.dao_embeddings import search_panels_by_embedding
from app.embeddings import embed_text

router = APIRouter()


@router.post("/api/search")
async def api_search_post(
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_session)
):
    """패널 검색 API - 벡터 검색 모드"""
    filters_dict = payload.get("filters") or {}
    query_text = payload.get("query") or filters_dict.get("query")
    page = int(payload.get("page", 1))
    limit = int(payload.get("limit", 20))
    
    if not query_text or not str(query_text).strip():
        return {
            "results": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "pages": 0,
            "mode": "vector",
            "query": query_text
        }
    
    try:
        # 1. 텍스트를 임베딩으로 변환
        query_text_clean = str(query_text).strip()
        query_embedding = embed_text(query_text_clean)
        if len(query_embedding) != 768:
            raise RuntimeError(f"임베딩 차원 불일치: {len(query_embedding)} != 768")
    except Exception as embed_error:
        return {
            "results": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "pages": 0,
            "mode": "vector",
            "query": query_text,
            "error": f"임베딩 생성 실패: {str(embed_error)}"
        }
    
    # 2. 필터 구성
    vector_filters = {}
    if filters_dict.get("selectedGenders"):
        vector_filters["gender"] = filters_dict["selectedGenders"]
    if filters_dict.get("selectedRegions"):
        vector_filters["region"] = filters_dict["selectedRegions"]
    
    # 3. 벡터 검색 실행
    search_limit = min(page * limit, 200)
    try:
        vector_rows = await search_panels_by_embedding(
            session, 
            query_embedding, 
            limit=search_limit,
            filters=vector_filters if vector_filters else None
        )
    except Exception as search_error:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"벡터 검색 실패: {str(search_error)}")
    
    # 4. 페이지네이션 적용
    total_count = len(vector_rows)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_rows = vector_rows[start_idx:end_idx]
    
    # 5. 벡터 검색 결과에서 demographics JSONB를 우선 사용, 부족한 정보만 RawData에서 조인
    detailed_rows = []
    
    if paginated_rows:
        from app.core.config import DBN, fq
        
        mb_sn_needs_raw_data = []
        
        # 먼저 demographics JSONB에서 정보 추출 시도
        for vector_row in paginated_rows:
            mb_sn = vector_row.get("mb_sn")
            demographics = vector_row.get("demographics")
            
            gender = ""
            age = 0
            region = ""
            
            if demographics:
                try:
                    if isinstance(demographics, dict):
                        demo_dict = demographics
                    elif isinstance(demographics, str):
                        demo_dict = json.loads(demographics)
                    else:
                        demo_dict = {}
                    
                    gender = demo_dict.get("gender") or demo_dict.get("Gender") or ""
                    age = demo_dict.get("age") or demo_dict.get("Age") or 0
                    region = demo_dict.get("region") or demo_dict.get("Region") or demo_dict.get("location") or demo_dict.get("Location") or ""
                    
                    if isinstance(age, str):
                        try:
                            age = int(age)
                        except (ValueError, TypeError):
                            age = 0
                    elif not isinstance(age, (int, float)):
                        age = 0
                    else:
                        age = int(age)
                except (json.JSONDecodeError, AttributeError, TypeError):
                    pass
            
            # demographics에서 정보가 부족하면 RawData 조회 필요
            if not gender or not region or age == 0:
                mb_sn_needs_raw_data.append(mb_sn)
            
            detailed_rows.append({
                "mb_sn": mb_sn,
                "gender": gender,
                "age_raw": age,
                "location": region,
                "combined_text": vector_row.get("combined_text") or "",
                "similarity": float(vector_row.get("similarity") or 0.0),
                "demographics": demographics
            })
        
        # demographics에서 부족한 정보를 RawData에서 조회
        if mb_sn_needs_raw_data:
            W1 = fq(DBN.RAW, "welcome_1st")
            
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
                w1."location"
            FROM {W1} w1
            WHERE w1.mb_sn = ANY(:mb_sn_list)
            """
            
            result = await session.execute(text(raw_data_sql), {"mb_sn_list": mb_sn_needs_raw_data})
            raw_data_map = {row[0]: {
                "gender": row[1] or "",
                "age_raw": int(row[2] or 0) if row[2] is not None else 0,
                "location": row[3] or ""
            } for row in result}
            
            # RawData 정보로 부족한 필드 보완
            for detail_row in detailed_rows:
                mb_sn = detail_row["mb_sn"]
                if mb_sn in raw_data_map:
                    raw_info = raw_data_map[mb_sn]
                    if not detail_row["gender"]:
                        detail_row["gender"] = raw_info["gender"]
                    if detail_row["age_raw"] == 0:
                        detail_row["age_raw"] = raw_info["age_raw"]
                    if not detail_row["location"]:
                        detail_row["location"] = raw_info["location"]
    else:
        detailed_rows = paginated_rows
    
    # 페이지네이션 계산
    total = total_count
    pages = max(1, (total + limit - 1) // limit) if total > 0 else 0
    
    # 결과 변환
    results = []
    for r in detailed_rows:
        gender = r.get("gender") or ""
        age = int(r.get("age_raw") or 0)
        region = r.get("location") or ""
        similarity = r.get("similarity") or 0.0
        combined_text = r.get("combined_text") or ""
        combined_text = combined_text[:140] if combined_text else ""
        
        results.append({
            "id": r["mb_sn"],
            "name": r["mb_sn"],
            "gender": gender,
            "age": age,
            "region": region,
            "coverage": "qw" if combined_text else "w",
            "similarity": similarity,
            "embedding": None,
            "responses": {"q1": combined_text},
            "created_at": datetime.now().isoformat()
        })
    
    return {
        "query": query_text,
        "page": page,
        "page_size": limit,
        "count": len(results),
        "total": total,
        "pages": pages,
        "mode": "vector",
        "results": results
    }
