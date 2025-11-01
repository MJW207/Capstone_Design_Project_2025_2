"""패널 상세 API 엔드포인트"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import json

from app.db.session import get_session
from app.db.dao_panels import get_panel_detail

router = APIRouter()


@router.get("/api/panels/{panel_id}")
async def get_panel(
    panel_id: str,
    session: AsyncSession = Depends(get_session)
):
    """
    패널 상세 정보 조회 (RawData 테이블들과 panel_embeddings_v 뷰 JOIN)
    
    Args:
        panel_id: 패널 ID (mb_sn)
        
    Returns:
        패널 상세 정보 (실제 데이터 기반)
    """
    try:
        row = await get_panel_detail(session, panel_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Panel not found")
        
        # 1. 기본 정보 추출 (demographics 우선, welcome_1st로 보완)
        demo = row.get("demographics") or {}
        if isinstance(demo, str):
            try:
                demo = json.loads(demo)
            except (json.JSONDecodeError, TypeError):
                demo = {}
        
        # demographics에서 추출
        gender = demo.get("gender") or demo.get("Gender") or ""
        region = demo.get("region") or demo.get("Region") or ""
        age = 0
        if demo.get("age"):
            try:
                age = int(demo["age"])
            except (ValueError, TypeError):
                age = 0
        elif demo.get("Age"):
            try:
                age = int(demo["Age"])
            except (ValueError, TypeError):
                age = 0
        
        # welcome_1st 데이터로 보완
        if row.get("w1_gender"):
            gender = row["w1_gender"]
        if row.get("w1_location"):
            region = row["w1_location"]
        if not age and row.get("w1_birth_year"):
            try:
                birth_year = int(row["w1_birth_year"])
                age = datetime.now().year - birth_year
            except (ValueError, TypeError):
                pass
        
        # welcome_2nd에서 소득 정보 추출
        w2_data = row.get("w2_data")
        income = ""
        if isinstance(w2_data, dict):
            income = w2_data.get("income_personal") or w2_data.get("income_household") or w2_data.get("income") or ""
        elif isinstance(w2_data, str):
            try:
                w2_dict = json.loads(w2_data)
                income = w2_dict.get("income_personal") or w2_dict.get("income_household") or w2_dict.get("income") or ""
            except (json.JSONDecodeError, TypeError):
                pass
        
        # 2. 응답이력 추출 (quick_answer.answers)
        responses = []
        qa_answers = row.get("qa_answers")
        if qa_answers:
            try:
                # JSONB가 dict일 수도 있고 문자열일 수도 있음
                if isinstance(qa_answers, dict):
                    answers_dict = qa_answers
                elif isinstance(qa_answers, str):
                    answers_dict = json.loads(qa_answers)
                else:
                    answers_dict = {}
                
                # 각 질문-답변을 응답이력으로 변환
                for question_key, answer_value in answers_dict.items():
                    responses.append({
                        "key": question_key,
                        "title": question_key,  # 키를 제목으로 사용 (필요시 매핑 가능)
                        "answer": str(answer_value) if answer_value else "",
                        "date": (
                            row.get("created_at").strftime("%Y.%m.%d")
                            if row.get("created_at")
                            else datetime.now().strftime("%Y.%m.%d")
                        )
                    })
            except (json.JSONDecodeError, AttributeError, TypeError):
                pass
        
        # 응답이력이 없으면 combined_text를 요약으로 사용
        if not responses and row.get("combined_text"):
            responses.append({
                "key": "summary",
                "title": "요약",
                "answer": row["combined_text"][:600],
                "date": (
                    row.get("created_at").strftime("%Y.%m.%d")
                    if row.get("created_at")
                    else datetime.now().strftime("%Y.%m.%d")
                )
            })
        
        # 3. 태그/근거 추출 (chunks, all_labels, categories)
        tags = []
        evidence = []
        
        
        # all_labels 또는 categories에서 태그 추출
        all_labels = row.get("all_labels")
        categories = row.get("categories")
        
        if all_labels:
            try:
                # JSONB는 dict나 list일 수 있음
                if isinstance(all_labels, (list, tuple)):
                    tags = [str(tag).replace('#', '') if str(tag).startswith('#') else str(tag) for tag in all_labels if tag]
                elif isinstance(all_labels, dict):
                    tags = [str(k).replace('#', '') if str(k).startswith('#') else str(k) for k in all_labels.keys() if k]
                elif isinstance(all_labels, str):
                    # 문자열인 경우 JSON 파싱 시도
                    try:
                        labels_parsed = json.loads(all_labels)
                        if isinstance(labels_parsed, list):
                            tags = [str(tag).replace('#', '') if str(tag).startswith('#') else str(tag) for tag in labels_parsed if tag]
                        elif isinstance(labels_parsed, dict):
                            tags = [str(k).replace('#', '') if str(k).startswith('#') else str(k) for k in labels_parsed.keys() if k]
                    except json.JSONDecodeError:
                        tags = [tag.strip().replace('#', '') for tag in all_labels.replace('\n', ',').split(',') if tag.strip()]
            except Exception:
                pass
        
        if categories:
            try:
                if isinstance(categories, (list, tuple)):
                    new_tags = [str(cat).replace('#', '') if str(cat).startswith('#') else str(cat) for cat in categories if cat and str(cat) not in tags]
                    tags.extend(new_tags)
                elif isinstance(categories, dict):
                    new_tags = [str(k).replace('#', '') if str(k).startswith('#') else str(k) for k in categories.keys() if k and str(k) not in tags]
                    tags.extend(new_tags)
                elif isinstance(categories, str):
                    try:
                        cats_parsed = json.loads(categories)
                        if isinstance(cats_parsed, list):
                            new_tags = [str(cat).replace('#', '') if str(cat).startswith('#') else str(cat) for cat in cats_parsed if cat and str(cat) not in tags]
                        elif isinstance(cats_parsed, dict):
                            new_tags = [str(k).replace('#', '') if str(k).startswith('#') else str(k) for k in cats_parsed.keys() if k and str(k) not in tags]
                        else:
                            new_tags = []
                        tags.extend(new_tags)
                    except json.JSONDecodeError:
                        new_tags = [tag.strip().replace('#', '') for tag in categories.replace('\n', ',').split(',') if tag.strip() and tag.strip() not in tags]
                        tags.extend(new_tags)
            except Exception:
                pass
        
        # 태그 중복 제거 및 정리
        tags = list(dict.fromkeys(tags))
        
        # chunks에서 근거 추출 (실제 청크 텍스트)
        chunks = row.get("chunks")
        if chunks:
            try:
                if isinstance(chunks, (list, tuple)):
                    # 리스트인 경우 각 요소를 근거로 추가
                    for idx, chunk in enumerate(chunks):
                        if chunk:
                            chunk_text = str(chunk).strip()
                            if chunk_text:
                                evidence.append({
                                    "text": chunk_text[:500],  # 최대 500자
                                    "source": f"chunk_{idx+1}",
                                    "similarity": None  # 유사도는 벡터 검색 결과에만 있음
                                })
                elif isinstance(chunks, dict):
                    # dict인 경우 값들을 근거로 추가
                    for idx, (key, value) in enumerate(chunks.items()):
                        chunk_text = str(value).strip() if value else str(key).strip()
                        if chunk_text:
                            evidence.append({
                                "text": chunk_text[:500],
                                "source": f"chunk_{key}",
                                "similarity": None
                            })
                elif isinstance(chunks, str):
                    # 문자열인 경우 JSON 파싱 시도
                    try:
                        chunks_parsed = json.loads(chunks)
                        if isinstance(chunks_parsed, list):
                            for idx, chunk in enumerate(chunks_parsed):
                                if chunk:
                                    chunk_text = str(chunk).strip()
                                    if chunk_text:
                                        evidence.append({
                                            "text": chunk_text[:500],
                                            "source": f"chunk_{idx+1}",
                                            "similarity": None
                                        })
                        elif isinstance(chunks_parsed, dict):
                            for key, value in chunks_parsed.items():
                                chunk_text = str(value).strip() if value else str(key).strip()
                                if chunk_text:
                                    evidence.append({
                                        "text": chunk_text[:500],
                                        "source": f"chunk_{key}",
                                        "similarity": None
                                    })
                        else:
                            # 파싱 결과가 단일 값이면 직접 사용
                            chunk_text = str(chunks_parsed).strip()
                            if chunk_text:
                                evidence.append({
                                    "text": chunk_text[:500],
                                    "source": "chunk",
                                    "similarity": None
                                })
                    except json.JSONDecodeError:
                        chunk_text = chunks.strip()
                        if chunk_text:
                            evidence.append({
                                "text": chunk_text[:500],
                                "source": "chunk",
                                "similarity": None
                            })
            except Exception:
                pass
        
        # combined_text를 요약 근거로 추가 (첫 번째 위치)
        combined_text = row.get("combined_text")
        if combined_text:
            combined_text_str = str(combined_text).strip()
            if combined_text_str:
                # 중복 체크 (이미 chunks에 포함되어 있는지)
                is_duplicate = any(
                    combined_text_str[:200] in e.get("text", "")[:200] or 
                    e.get("text", "")[:200] in combined_text_str[:200]
                    for e in evidence
                )
                if not is_duplicate:
                    evidence.insert(0, {
                        "text": combined_text_str[:500],
                        "source": "combined_text",
                        "similarity": None
                    })
        
        # AI 요약 생성 (combined_text 사용)
        ai_summary = row.get("combined_text") or ""
        if ai_summary:
            ai_summary = ai_summary[:300] + "..." if len(ai_summary) > 300 else ai_summary
        else:
            ai_summary = "요약 정보가 없습니다."
        
        return {
            "id": panel_id,
            "name": panel_id,
            "gender": gender,
            "age": age,
            "region": region,
            "income": str(income) if income else "",
            "coverage": "qw" if qa_answers else "w",
            "tags": tags,
            "responses": responses,  # 실제 응답이력
            "evidence": evidence,  # 실제 근거 데이터
            "aiSummary": ai_summary,
            "created_at": (
                row.get("created_at").isoformat() 
                if row.get("created_at") 
                else datetime.now().isoformat()
            )
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Panel fetch failed: {str(e)}")

