"""Pinecone에서 단일 패널 상세 정보 가져오기"""
from typing import Dict, Any, Optional
from datetime import datetime
import logging
import json
import numpy as np

from app.core.config import PINECONE_API_KEY, PINECONE_INDEX_NAME, load_category_config
from app.utils.merged_data_loader import load_merged_data
from pinecone import Pinecone

logger = logging.getLogger(__name__)


def get_panel_from_pinecone(panel_id: str) -> Optional[Dict[str, Any]]:
    """
    Pinecone에서 패널 상세 정보 조회
    
    Args:
        panel_id: 패널 ID (mb_sn)
        
    Returns:
        패널 상세 정보 딕셔너리 또는 None
    """
    try:
        category_config = load_category_config()
        
        # Pinecone 인덱스 연결
        pc = Pinecone(api_key=PINECONE_API_KEY)
        index = pc.Index(PINECONE_INDEX_NAME)
        
        # 인구 topic으로 메타데이터 조회
        pinecone_topic = category_config.get("기본정보", {}).get("pinecone_topic", "인구")
        
        # 랜덤 벡터로 검색 (메타데이터만 필요)
        dimension = 4096
        random_vector = np.random.rand(dimension).astype(np.float32).tolist()
        norm = np.linalg.norm(random_vector)
        if norm > 0:
            random_vector = (np.array(random_vector) / norm).tolist()
        
        # 인구 topic에서 mb_sn으로 검색
        results = index.query(
            vector=random_vector,
            top_k=1,
            include_metadata=True,
            filter={
                "topic": pinecone_topic,
                "mb_sn": panel_id
            }
        )
        
        metadata = {}
        if results.matches:
            metadata = results.matches[0].metadata or {}
        
        # 직업소득 topic에서도 조회 (소득 정보)
        income_metadata = {}
        income_topic = category_config.get("직업소득", {}).get("pinecone_topic", "직업소득")
        try:
            income_results = index.query(
                vector=random_vector,
                top_k=1,
                include_metadata=True,
                filter={
                    "topic": income_topic,
                    "mb_sn": panel_id
                }
            )
            if income_results.matches:
                income_metadata = income_results.matches[0].metadata or {}
        except Exception as e:
            logger.debug(f"직업소득 메타데이터 조회 실패: {e}")
        
        # merged_final.json에서 메타데이터 로드
        merged_data = load_merged_data()
        merged_metadata = merged_data.get(panel_id, {}) if merged_data else {}
        
        # 기본 정보 추출
        gender = metadata.get("성별", "") or merged_metadata.get("gender", "")
        region = metadata.get("지역", "") or merged_metadata.get("location", "")
        detail_location = metadata.get("지역구", "") or merged_metadata.get("detail_location", "")
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
        if not age and merged_metadata.get("age"):
            try:
                age = int(merged_metadata["age"])
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
        
        # 소득 정보 (직업소득 topic 또는 merged_final.json)
        income = ""
        if income_metadata.get("개인소득"):
            income = str(income_metadata["개인소득"])
        elif income_metadata.get("가구소득"):
            income = str(income_metadata["가구소득"])
        elif merged_metadata.get("income_personal"):
            income = str(merged_metadata["income_personal"])
        elif merged_metadata.get("income_household"):
            income = str(merged_metadata["income_household"])
        
        # Qpoll 응답 추출
        responses = []
        qpoll_answers = merged_metadata.get("answers", {})
        if qpoll_answers and isinstance(qpoll_answers, dict):
            for q_key, q_data in qpoll_answers.items():
                if isinstance(q_data, dict) and "question" in q_data and "answer" in q_data:
                    responses.append({
                        "key": q_key,
                        "title": q_data.get("question", q_key),
                        "answer": q_data.get("answer", ""),
                        "date": datetime.now().strftime("%Y.%m.%d")
                    })
        
        if not responses:
            responses.append({
                "key": "no_qpoll",
                "title": "Qpoll 응답 없음",
                "answer": "해당 패널은 qpoll에 응답하지 않았습니다.",
                "date": datetime.now().strftime("%Y.%m.%d")
            })
        
        # 태그 추출 (metadata에서)
        tags = []
        # Pinecone 메타데이터에는 태그 정보가 없을 수 있으므로 merged_final.json 사용
        if merged_metadata.get("tags"):
            if isinstance(merged_metadata["tags"], list):
                tags = [str(tag) for tag in merged_metadata["tags"]]
            elif isinstance(merged_metadata["tags"], str):
                tags = [tag.strip() for tag in merged_metadata["tags"].split(",") if tag.strip()]
        
        # 근거 추출 (Pinecone text 필드)
        evidence = []
        text = metadata.get("text", "")
        if text:
            evidence.append({
                "text": text[:500],
                "source": "pinecone",
                "similarity": None
            })
        
        # AI 요약 (Pinecone text 필드 사용)
        ai_summary = text[:300] + "..." if len(text) > 300 else text
        if not ai_summary:
            ai_summary = "요약 정보가 없습니다."
        
        result = {
            "id": panel_id,
            "name": panel_id,
            "gender": gender,
            "age": age,
            "region": region,
            "income": str(income) if income else "",
            "coverage": "qw" if qpoll_answers else "w",
            "tags": tags,
            "responses": responses,
            "evidence": evidence,
            "aiSummary": ai_summary,
            "created_at": datetime.now().isoformat(),
            "metadata": merged_metadata
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Pinecone 패널 상세 정보 조회 실패: {panel_id}, 오류: {e}", exc_info=True)
        return None

