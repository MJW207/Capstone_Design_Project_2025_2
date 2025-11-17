"""패널 상세 API 엔드포인트"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import json
from pathlib import Path
from typing import Optional, Dict, Any
import logging

from app.db.session import get_session
from app.db.dao_panels import get_panel_detail

router = APIRouter()
logger = logging.getLogger(__name__)

# 프로젝트 루트 경로
PROJECT_ROOT = Path(__file__).resolve().parents[3]
MERGED_FINAL_JSON = PROJECT_ROOT / 'merged_final.json'

# merged_final.json 데이터를 메모리에 캐싱
_merged_data_cache: Optional[Dict[str, Any]] = None

def load_merged_data() -> Dict[str, Any]:
    """merged_final.json 파일을 로드하고 mb_sn을 키로 하는 딕셔너리로 변환"""
    global _merged_data_cache
    
    if _merged_data_cache is not None:
        logger.info(f"[Panel API] 캐시된 merged_data 사용: {len(_merged_data_cache)}개 패널")
        return _merged_data_cache
    
    logger.info(f"[Panel API] merged_final.json 로드 시작: {MERGED_FINAL_JSON}")
    if not MERGED_FINAL_JSON.exists():
        logger.warning(f"[Panel API] 경고: merged_final.json 파일이 존재하지 않음: {MERGED_FINAL_JSON}")
        return {}
    
    try:
        logger.info(f"[Panel API] JSON 파일 읽기 시작...")
        with open(MERGED_FINAL_JSON, 'r', encoding='utf-8') as f:
            data = json.load(f)
        logger.info(f"[Panel API] JSON 파일 읽기 완료: {len(data)}개 항목")
        
        # 배열을 mb_sn을 키로 하는 딕셔너리로 변환
        _merged_data_cache = {item['mb_sn']: item for item in data if 'mb_sn' in item}
        logger.info(f"[Panel API] 딕셔너리 변환 완료: {len(_merged_data_cache)}개 패널")
        return _merged_data_cache
    except Exception as e:
        logger.error(f"[ERROR] merged_final.json 로드 실패: {str(e)}", exc_info=True)
        return {}


@router.get("/api/panels/{panel_id}")
async def get_panel(
    panel_id: str,
    session: AsyncSession = Depends(get_session)
):
    """패널 상세 정보 조회"""
    logger.info(f"[Panel API] ========== 패널 상세 조회 시작: {panel_id} ==========")
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
        
        # 2. 응답이력 추출 (merged_final.json의 answers 필드에서 Qpoll 질문-답변 추출)
        responses = []
        
        # merged_final.json에서 answers 필드 추출
        merged_data = load_merged_data()
        qpoll_answers = {}
        if panel_id in merged_data:
            merged_panel = merged_data[panel_id]
            qpoll_answers = merged_panel.get("answers", {})
        
        # Qpoll 질문-답변을 응답이력으로 변환
        if qpoll_answers and isinstance(qpoll_answers, dict):
            for q_key, q_data in qpoll_answers.items():
                if isinstance(q_data, dict) and "question" in q_data and "answer" in q_data:
                    responses.append({
                        "key": q_key,
                        "title": q_data.get("question", q_key),
                        "answer": q_data.get("answer", ""),
                        "date": (
                            row.get("created_at").strftime("%Y.%m.%d")
                            if row.get("created_at")
                            else datetime.now().strftime("%Y.%m.%d")
                        )
                    })
        
        # Qpoll 응답이 없으면 메시지 추가
        if not responses:
            responses.append({
                "key": "no_qpoll",
                "title": "Qpoll 응답 없음",
                "answer": "해당 패널은 qpoll에 응답하지 않았습니다.",
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
        
        # merged_final.json에서 메타데이터 가져오기
        merged_metadata = {}
        merged_data = load_merged_data()
        logger.info(f"[Panel API] merged_data 로드 완료: {len(merged_data)}개 패널")
        logger.info(f"[Panel API] 패널 ID: {panel_id}, 존재 여부: {panel_id in merged_data}")
        if panel_id in merged_data:
            merged_metadata = merged_data[panel_id]
            logger.info(f"[Panel API] 메타데이터 키 개수: {len(merged_metadata)}")
            logger.info(f"[Panel API] 메타데이터 키: {list(merged_metadata.keys())[:10]}")
        else:
            logger.warning(f"[Panel API] 패널 ID {panel_id}를 merged_final.json에서 찾을 수 없음")
            # 샘플 패널 ID 확인
            if len(merged_data) > 0:
                sample_ids = list(merged_data.keys())[:5]
                logger.info(f"[Panel API] 샘플 패널 ID: {sample_ids}")
        
        # 기본 정보를 merged_final.json 데이터로 보완
        if merged_metadata:
            if not gender and merged_metadata.get("gender"):
                gender = merged_metadata["gender"]
            if not age and merged_metadata.get("age"):
                try:
                    age = int(merged_metadata["age"])
                except (ValueError, TypeError):
                    pass
            if not region and merged_metadata.get("location"):
                region = merged_metadata["location"]
            if merged_metadata.get("detail_location"):
                region = f"{region} {merged_metadata['detail_location']}" if region else merged_metadata['detail_location']
        
        result = {
            "id": panel_id,
            "name": panel_id,
            "gender": gender,
            "age": age,
            "region": region,
            "income": str(income) if income else "",
            "coverage": "qw" if qpoll_answers else "w",
            "tags": tags,
            "responses": responses,  # 실제 응답이력
            "evidence": evidence,  # 실제 근거 데이터
            "aiSummary": ai_summary,
            "created_at": (
                row.get("created_at").isoformat() 
                if row.get("created_at") 
                else datetime.now().isoformat()
            ),
            # merged_final.json 메타데이터 추가
            "metadata": merged_metadata
        }
        logger.info(f"[Panel API] 반환 데이터에 metadata 포함: {bool(merged_metadata)}, 키 개수: {len(merged_metadata) if merged_metadata else 0}")
        logger.debug(f"[Panel API] 반환 데이터 키: {list(result.keys())}")
        logger.info(f"[Panel API] ========== 패널 상세 조회 완료: {panel_id} ==========")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Panel API] 패널 조회 실패: {panel_id}, 오류: {str(e)}", exc_info=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Panel fetch failed: {str(e)}")

