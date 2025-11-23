"""패널 상세 API 엔드포인트"""
from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any
import logging

from app.api.pinecone_panel_detail import get_panel_from_pinecone
from app.utils.merged_data_loader import get_panel_from_merged_db
from app.services.lifestyle_classifier import generate_lifestyle_summary
from app.core.config import ANTHROPIC_API_KEY

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/api/panels/{panel_id}")
async def get_panel(
    panel_id: str
):
    """패널 상세 정보 조회 (NeonDB merged 테이블 + Pinecone 병합)"""
    logger.info(f"[Panel API] ========== 패널 상세 조회 시작: {panel_id} ==========")
    """
    패널 상세 정보 조회 (NeonDB merged.panel_data 테이블에서 기본 데이터 로드, Pinecone에서 응답 데이터 병합)
    
    Args:
        panel_id: 패널 ID (mb_sn)
        
    Returns:
        패널 상세 정보 (merged 데이터 + Pinecone 응답 데이터)
    """
    try:
        # 1. ⭐ NeonDB merged.panel_data 테이블에서 기본 데이터 조회
        merged_data = None
        try:
            merged_data = await get_panel_from_merged_db(panel_id)
            logger.info(f"[Panel API] merged 테이블 조회 결과: {panel_id}, 데이터 존재: {merged_data is not None}")
        except Exception as e:
            logger.warning(f"[Panel API] merged 테이블 조회 중 오류 발생: {panel_id}, 오류: {str(e)}", exc_info=True)
            # 에러가 발생해도 Pinecone에서 조회 시도
        
        if not merged_data:
            logger.warning(f"[Panel API] merged 테이블에서 패널을 찾을 수 없음: {panel_id}, Pinecone에서만 조회 시도")
            # merged 테이블에 없으면 Pinecone에서만 조회
            try:
                result = get_panel_from_pinecone(panel_id)
                if not result:
                    logger.error(f"[Panel API] Pinecone에서도 패널을 찾을 수 없음: {panel_id}")
                    raise HTTPException(status_code=404, detail=f"Panel not found: {panel_id}")
                logger.info(f"[Panel API] ========== 패널 상세 조회 완료 (Pinecone만): {panel_id} ==========")
                return result
            except Exception as e:
                logger.error(f"[Panel API] Pinecone 조회 중 오류 발생: {panel_id}, 오류: {str(e)}")
                raise HTTPException(status_code=404, detail=f"Panel not found: {panel_id}")
        
        logger.info(f"[Panel API] merged 테이블에서 패널 데이터 조회 완료: {panel_id}")
        
        # 2. merged_data로부터 welcome1_info, welcome2_info 생성 및 기본 필드 매핑
        welcome1_info = {}
        welcome2_info = {}
        
        # 기본 필드 추출 (merged_data에서 직접)
        gender = merged_data.get("gender", "")
        age = merged_data.get("age", 0)
        location = merged_data.get("location", "")
        detail_location = merged_data.get("detail_location", "")
        region = location
        if detail_location:
            region = f"{location} {detail_location}".strip() if location else detail_location
        
        # 커버리지 계산 (merged_data에는 index 정보가 없으므로 Pinecone에서 가져옴)
        coverage = None
        
        # Welcome 1차 정보 (인구통계 정보)
        if merged_data:
            welcome1_info = {
                "gender": gender,
                "age": age if age else None,
                "region": location,
                "detail_location": detail_location,
                "age_group": merged_data.get("연령대", ""),
                "marriage": merged_data.get("결혼여부", ""),
                "children": merged_data.get("자녀수"),
                "family": merged_data.get("가족수", ""),
                "education": merged_data.get("최종학력", ""),
            }
            # 빈 값 제거 (하지만 0은 유지 - 자녀수 0명일 수 있음)
            welcome1_info = {k: v for k, v in welcome1_info.items() if v not in [None, ""]}
        
        # Welcome 2차 정보 (직업/소득 정보)
        if merged_data:
            welcome2_info = {
                "job": merged_data.get("직업", ""),
                "job_role": merged_data.get("직무", ""),
                "personal_income": merged_data.get("월평균 개인소득", ""),
                "household_income": merged_data.get("월평균 가구소득", ""),
            }
            # 빈 값 제거
            welcome2_info = {k: v for k, v in welcome2_info.items() if v not in [None, ""]}
        
        # 3. Pinecone에서 응답 데이터 조회 (선택사항, 없어도 됨)
        pinecone_data = get_panel_from_pinecone(panel_id)
        
        # 4. 데이터 병합
        # merged_data를 기본으로 하고, Pinecone 데이터로 보완
        result = {
            **merged_data,  # merged 데이터가 기본
        }
        
        # ⭐ 기본 필드 명시적 설정 (프론트엔드 호환성)
        result['gender'] = gender
        result['age'] = age if age else 0
        result['region'] = region
        result['name'] = merged_data.get('mb_sn', panel_id)
        
        # welcome1_info, welcome2_info 추가
        if welcome1_info:
            result['welcome1_info'] = welcome1_info
        if welcome2_info:
            result['welcome2_info'] = welcome2_info
        
        # Pinecone 데이터가 있으면 병합
        if pinecone_data:
            # 커버리지는 Pinecone에서 가져옴
            if 'coverage' in pinecone_data:
                coverage = pinecone_data['coverage']
                result['coverage'] = coverage
            # merged_data에 merged_data 키로 저장
            result['merged_data'] = merged_data
            
            # Pinecone의 응답 데이터 병합
            if 'responses' in pinecone_data:
                result['responses'] = pinecone_data['responses']
            if 'responses_by_topic' in pinecone_data:
                # ⭐ quick_answers에서 질문 정보 보완
                responses_by_topic = pinecone_data['responses_by_topic'].copy()
                quick_answers = merged_data.get('quick_answers', {})
                
                # quick_answers가 딕셔너리인 경우, 각 topic별로 질문 정보 추가
                if isinstance(quick_answers, dict) and quick_answers:
                    # 형식 1: {Q010: {question: "...", answer: "..."}, Q019: {...}}
                    # 형식 2: {topic: {question: answer}} 또는 {topic: [{question, answer}]}
                    
                    # 먼저 Q010, Q019 형식인지 확인 (Q로 시작하고 숫자가 이어지는 키)
                    is_q_format = any(
                        (isinstance(key, str) and key.startswith('Q') and len(key) > 1 and key[1:].isdigit()) 
                        for key in quick_answers.keys()
                    )
                    
                    if is_q_format:
                        # 형식 1: {Q010: {question: "...", answer: "..."}}
                        # Pinecone의 응답과 매칭하여 질문 추가
                        logger.info(f"[Panel API] Q 형식 quick_answers 발견: {list(quick_answers.keys())[:5]}")
                        for topic, responses in responses_by_topic.items():
                            for response in responses:
                                if response.get('is_quick_answer') and not response.get('question'):
                                    answer_text = response.get('answer', '').strip()
                                    # quick_answers에서 답변이 일치하는 질문 찾기
                                    best_match = None
                                    best_match_score = 0
                                    
                                    for q_key, q_data in quick_answers.items():
                                        if isinstance(q_data, dict):
                                            q_answer = str(q_data.get('answer', '')).strip()
                                            q_question = q_data.get('question', '').strip()
                                            
                                            if q_answer and q_question:
                                                # 정확히 일치하는 경우
                                                if q_answer == answer_text:
                                                    response['question'] = q_question
                                                    best_match = None  # 정확히 일치하면 더 이상 찾을 필요 없음
                                                    break
                                                # 부분 일치 확인 (답변이 포함되어 있거나, 답변이 포함되어 있는 경우)
                                                elif q_answer in answer_text or answer_text in q_answer:
                                                    # 더 긴 일치를 우선
                                                    match_len = min(len(q_answer), len(answer_text))
                                                    if match_len > best_match_score:
                                                        best_match_score = match_len
                                                        best_match = q_question
                                    
                                    # 정확히 일치하지 않았지만 부분 일치가 있으면 사용
                                    if best_match and not response.get('question'):
                                        response['question'] = best_match
                    else:
                        # 형식 2: {topic: {question: answer}} 또는 {topic: [{question, answer}]}
                        logger.info(f"[Panel API] Topic 형식 quick_answers 발견")
                        for topic, responses in responses_by_topic.items():
                            for response in responses:
                                if response.get('is_quick_answer') and not response.get('question'):
                                    topic_data = quick_answers.get(topic)
                                    if topic_data:
                                        if isinstance(topic_data, dict):
                                            # {question: answer} 형식
                                            if 'question' in topic_data:
                                                response['question'] = topic_data['question']
                                            else:
                                                questions = list(topic_data.keys())
                                                if questions:
                                                    response['question'] = questions[0]
                                        elif isinstance(topic_data, list):
                                            # [{question, answer}] 형식
                                            for qa_item in topic_data:
                                                if isinstance(qa_item, dict):
                                                    q = qa_item.get('question') or qa_item.get('질문')
                                                    a = qa_item.get('answer') or qa_item.get('답변')
                                                    if q and a and a in response.get('answer', ''):
                                                        response['question'] = q
                                                        break
                
                result['responses_by_topic'] = responses_by_topic
            if 'metadata_by_topic' in pinecone_data:
                result['metadata_by_topic'] = pinecone_data['metadata_by_topic']
            if 'text_outputs_by_topic' in pinecone_data:
                result['text_outputs_by_topic'] = pinecone_data['text_outputs_by_topic']
            
            # welcome1_info, welcome2_info는 merged_data 우선, 없으면 Pinecone 사용
            if not welcome1_info and 'welcome1_info' in pinecone_data:
                result['welcome1_info'] = pinecone_data['welcome1_info']
            if not welcome2_info and 'welcome2_info' in pinecone_data:
                result['welcome2_info'] = pinecone_data['welcome2_info']
            
            # 기본 정보는 merged_data 우선, 없으면 Pinecone 사용
            if 'name' not in result and 'name' in pinecone_data:
                result['name'] = pinecone_data['name']
            if 'gender' not in result and 'gender' in pinecone_data:
                result['gender'] = pinecone_data['gender']
            if 'age' not in result and 'age' in pinecone_data:
                result['age'] = pinecone_data['age']
            if 'region' not in result and 'region' in pinecone_data:
                result['region'] = pinecone_data['region']
        
        # 5. 기본 필드 설정 (merged_data에서 가져온 데이터 기반)
        if 'mb_sn' in merged_data:
            result['id'] = merged_data['mb_sn']
        
        # 6. income 필드 설정
        if 'income' not in result or not result.get('income'):
            result['income'] = merged_data.get('월평균 개인소득', '') or merged_data.get('월평균 가구소득', '')
        
        # 7. created_at 필드 설정 (없으면 현재 시간)
        if 'created_at' not in result:
            from datetime import datetime
            result['created_at'] = datetime.now().isoformat()
        
        # 8. tags 필드 설정 (없으면 빈 배열)
        if 'tags' not in result:
            result['tags'] = []
        
        # 9. responses 필드 설정 (없으면 빈 배열)
        if 'responses' not in result:
            result['responses'] = []
        
        # 8. metadata 필드 설정 (merged_data의 모든 필드를 metadata로도 포함)
        if merged_data:
            # 시스템 필드 제외하고 metadata 생성
            metadata = {}
            exclude_fields = ['mb_sn', 'quick_answers', 'id', 'name', 'gender', 'age', 'region', 'income']
            for key, value in merged_data.items():
                if key not in exclude_fields and value is not None:
                    metadata[key] = value
            if metadata:
                result['metadata'] = metadata
        
        logger.info(f"[Panel API] ========== 패널 상세 조회 완료: {panel_id} ==========")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Panel API] 패널 조회 실패: {panel_id}, 오류: {str(e)}", exc_info=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Panel fetch failed: {str(e)}")


@router.get("/api/panels/{panel_id}/ai-summary")
async def get_panel_ai_summary(
    panel_id: str
):
    """패널 AI 요약 생성 (상세정보 열 때만 호출)"""
    logger.info(f"[Panel API] ========== AI 요약 생성 시작: {panel_id} ==========")
    """
    패널 AI 요약 생성 (라이프스타일 분류 기반)
    
    Args:
        panel_id: 패널 ID (mb_sn)
        
    Returns:
        AI 요약 텍스트
    """
    try:
        if not ANTHROPIC_API_KEY:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다.")
        
        # 라이프스타일 분류 기반 요약 생성
        summary = generate_lifestyle_summary(panel_id, ANTHROPIC_API_KEY)
        
        logger.info(f"[Panel API] ========== AI 요약 생성 완료: {panel_id} ==========")
        return {
            "panel_id": panel_id,
            "aiSummary": summary
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Panel API] AI 요약 생성 실패: {panel_id}, 오류: {str(e)}", exc_info=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI summary generation failed: {str(e)}")
