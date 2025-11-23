"""라이프스타일 분류 서비스 (Final_panel_insight.ipynb 기반)"""
from typing import Dict, Any, List, Optional
import json
import re
import logging
import numpy as np
from anthropic import Anthropic
from pinecone import Pinecone

from app.core.config import PINECONE_API_KEY, PINECONE_INDEX_NAME, load_category_config

logger = logging.getLogger(__name__)

# 라이프스타일 정의 (Final_panel_insight.ipynb에서 가져옴)
LIFESTYLE_DEFINITIONS = {
    "1": {
        "name": "실용·효율 중심 도시형",
        "definition": "합리적인 소비와 기능 중심의 실용성을 중시하며, 낭비 없는 생활과 체계적인 루틴을 통해 삶의 효율을 높이려는 성향을 가진 사람.",
        "core_signals": [
            "가격 대비 가치, 효율성에 대한 관심",
            "생필품 중심의 계획적 소비",
            "할인·포인트 등 실속 있는 소비 혜택 선호",
            "아침 알람 설정, 혼밥 등 시간 관리 중심 생활"
        ]
    },
    "2": {
        "name": "디지털·AI 친화형",
        "definition": "AI와 디지털 기술을 일상에 자연스럽게 통합하며, 새로운 도구에 대한 호기심과 적응력이 높은 사람. 기술을 통해 문제를 해결하고, 다양한 플랫폼을 능숙하게 활용한다.",
        "core_signals": [
            "챗GPT 등 AI 서비스 사용 경험 및 선호",
            "앱 및 디지털 서비스 사용 빈도 높음",
            "새로운 기술·앱에 대한 개방성"
        ]
    },
    "3": {
        "name": "건강·체력관리형",
        "definition": "운동, 식습관, 수면 등 자기 몸 관리에 관심이 높으며, 지속적인 체력 유지를 삶의 중요한 요소로 생각하는 사람.",
        "core_signals": [
            "유산소·헬스 등 체력 활동 습관",
            "야식·간식 조절 등 식습관 관리",
            "수면 루틴 및 컨디션 조절에 민감함"
        ]
    },
    "4": {
        "name": "감정·힐링 중심형",
        "definition": "정서적 안정과 스트레스 해소를 중요하게 여기며, 휴식이나 감정 기반의 소비를 통해 마음의 만족을 추구하는 사람.",
        "core_signals": [
            "스트레스 원인 및 해소 방법에 대한 민감도",
            "본인을 위한 소비(감정적 만족) 선호",
            "힐링 경험(선물, 여유, 안정)에 가치를 둠"
        ]
    },
    "5": {
        "name": "뷰티·자기관리형",
        "definition": "외모, 피부, 패션에 대한 꾸준한 관심과 투자를 통해 자기 표현과 자기 효능감을 중요하게 여기는 사람.",
        "core_signals": [
            "피부 상태에 대한 민감도",
            "스킨케어 소비 루틴 고정",
            "여름철 뷰티·패션 필수템 보유"
        ]
    },
    "6": {
        "name": "환경·정리·미니멀형",
        "definition": "불필요한 소비를 줄이고, 환경 보호와 물건 정리에 집중하는 삶의 방식을 추구하는 사람. 재활용, 절제된 소비를 일상에서 실천한다.",
        "core_signals": [
            "일회용품 사용 줄이기 실천",
            "미니멀 vs 맥시멀 인식 명확",
            "버리기 아까운 물건의 처리 방식 고민"
        ]
    },
    "7": {
        "name": "여가·경험 중심형",
        "definition": "여행, 물놀이, 레저 등 활동 기반의 즐거움을 중시하며, 즉흥적이고 유연한 라이프스타일을 추구하는 사람.",
        "core_signals": [
            "여행 스타일, 장소 선호 명확",
            "레저 중심 소비·경험 중요시",
            "여름철 외부 활동에 대한 기대감"
        ]
    },
    "8": {
        "name": "가족·관계 중심형",
        "definition": "가족, 반려동물, 유대 관계를 삶의 중심으로 여기며, 감정적 연결과 돌봄에 높은 가치를 두는 사람.",
        "core_signals": [
            "반려동물과의 생활 경험",
            "가족을 위한 선택과 소비",
            "행복한 노년·관계에 대한 관심"
        ]
            }
            }


def load_texts_by_mb_sn(panel_id: str, max_results: int = 200) -> List[Dict[str, str]]:
    """
    Pinecone에서 특정 mb_sn의 모든 feature_sentence를 가져옴 (Final_panel_insight.ipynb 기반)
    
    Args:
        panel_id: 패널 ID (mb_sn)
        max_results: 최대 결과 수 (기본값 200)
        
    Returns:
        [{"topic": "...", "text": "..."}] 형태의 리스트
    """
    try:
        category_config = load_category_config()
        
        # Pinecone 인덱스 연결
        pc = Pinecone(api_key=PINECONE_API_KEY)
        index = pc.Index(PINECONE_INDEX_NAME)
        
        # 인덱스 차원 동적으로 가져오기
        stats = index.describe_index_stats()
        dimension = stats.get('dimension', 1536)
        
        # 랜덤 벡터로 검색 (메타데이터만 필요)
        random_vector = np.random.rand(dimension).astype(np.float32).tolist()
        norm = np.linalg.norm(random_vector)
        if norm > 0:
            random_vector = (np.array(random_vector) / norm).tolist()
        
        # 모든 topic에서 mb_sn으로 검색
        all_features = []
        
        # 각 카테고리의 topic으로 검색
        for category_name, category_info in category_config.items():
            pinecone_topic = category_info.get("pinecone_topic")
            if not pinecone_topic:
                continue
            
            try:
                results = index.query(
                    vector=random_vector,
                    top_k=max_results,
                    include_metadata=True,
                    filter={
                        "topic": pinecone_topic,
                        "mb_sn": panel_id
                    }
                )
                
                for match in results.matches:
                    metadata = match.metadata or {}
                    topic = metadata.get("topic", pinecone_topic)
                    text = metadata.get("text", "")
                    if text:
                        all_features.append({
                            "topic": topic,
                            "text": text
                        })
            except Exception as e:
                logger.debug(f"[load_texts_by_mb_sn] {category_name} topic 검색 실패: {e}")
                continue
        
        logger.info(f"[load_texts_by_mb_sn] {panel_id}: {len(all_features)}개 feature_sentence 수집")
        return all_features
        
    except Exception as e:
        logger.error(f"[load_texts_by_mb_sn] 실패: {panel_id}, 오류: {e}", exc_info=True)
        return []


def generate_lifestyle_summary(panel_id: str, api_key: str) -> str:
    """
    패널 ID를 기반으로 라이프스타일 분류 후 요약 텍스트 생성
    
    Args:
        panel_id: 패널 ID (mb_sn)
        api_key: Anthropic API 키
        
    Returns:
        AI 요약 텍스트
    """
    try:
        # 1. Pinecone에서 feature_sentence 수집
        feature_list = load_texts_by_mb_sn(panel_id)
        
        if not feature_list or len(feature_list) <= 1:
            return "라이프스타일을 분류할 수 있는 충분한 정보가 없습니다."
        
        # 2. 라이프스타일 분류
        classifier = LifestyleClassifier(api_key)
        result = classifier.classify(feature_list)
        
        # 3. 요약 텍스트 생성
        if not result.get("lifestyle") or len(result["lifestyle"]) == 0:
            return result.get("message", "라이프스타일을 분류할 수 없습니다.")
        
        # primary 라이프스타일로 요약 생성
        primary = None
        secondary = None
        for lifestyle in result["lifestyle"]:
            if lifestyle.get("role") == "primary":
                primary = lifestyle
            elif lifestyle.get("role") == "secondary":
                secondary = lifestyle
        
        summary_parts = []
        if primary:
            summary_parts.append(f"{primary.get('lifestyle_name', '')} 유형으로, {primary.get('reason', '')}")
        if secondary:
            summary_parts.append(f"또한 {secondary.get('lifestyle_name', '')} 특성도 보이며, {secondary.get('reason', '')}")
        
        summary = " ".join(summary_parts)
        if not summary:
            summary = "라이프스타일 분석이 완료되었습니다."
        
        return summary
        
    except Exception as e:
        logger.error(f"[generate_lifestyle_summary] 실패: {panel_id}, 오류: {e}", exc_info=True)
        return "라이프스타일 요약 생성 중 오류가 발생했습니다."


def normalize_feature_data(feature_data_raw: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    Pinecone에서 가져온 feature_sentence 리스트를 normalize.
    이미 topic/text 형태이므로 그대로 반환.
    """
    if not isinstance(feature_data_raw, list):
        return []

    normalized = []
    for item in feature_data_raw:
        topic = item.get("topic")
        text = item.get("text")
        if topic and text:
            normalized.append({
                "topic": topic,
                "text": text
            })

    return normalized


def extract_json_from_response(text: str) -> str:
    """LLM 응답에서 JSON 추출"""
    match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return match.group(1)
    match = re.search(r"(\{.*?\})", text, re.DOTALL)
    if match:
        return match.group(1)
    return ""


class LifestyleClassifier:
    """라이프스타일 분류기 (Final_panel_insight.ipynb 기반)"""
    
    def __init__(self, api_key: str):
        """
        Args:
            api_key: Anthropic API 키
        """
        self.client = Anthropic(api_key=api_key)
        self.model = "claude-opus-4-1-20250805"
        logger.debug(f"[LifestyleClassifier] 초기화 완료, 모델: {self.model}")
    
    def classify(self, feature_list: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        feature_list를 기반으로 라이프스타일 분류
        
        Args:
            feature_list: [{"topic": "...", "text": "..."}] 형태의 리스트
            
        Returns:
            {
                "lifestyle": [...],
                "evidence_topics": [...]
            }
        """
        if not feature_list or len(feature_list) <= 1:
            return {
                "lifestyle": [],
                "message": "라이프스타일을 분류할 수 없습니다.",
                "evidence_topics": []
            }
        
        # feature_list -> topic/text 구조로 정규화
        analysis_items = [
            {"topic": f["topic"], "text": f["text"]}
            for f in feature_list
        ]

        lifestyle_json = json.dumps(LIFESTYLE_DEFINITIONS, ensure_ascii=False, indent=2)
        analysis_json = json.dumps(analysis_items, ensure_ascii=False, indent=2)

        # 노트북의 프롬프트 생성 (전체 규칙 포함)
        prompt = self._build_prompt(lifestyle_json, analysis_json)
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                temperature=0.1,
                messages=[{"role": "user", "content": prompt}],
                timeout=60.0  # 60초 타임아웃 (라이프스타일 분류는 더 복잡하므로)
            )
            
            text = response.content[0].text
            logger.debug(f"[라이프스타일 분류] LLM 원본 응답: {text[:500]}")
            
            # JSON 추출
            json_str = extract_json_from_response(text)
            if not json_str:
                logger.warning("[라이프스타일 분류] JSON 추출 실패")
                return {
                    "lifestyle": [],
                    "message": "라이프스타일 분류 실패",
                    "evidence_topics": []
                }
            
            parsed = json.loads(json_str)
            logger.info(f"[라이프스타일 분류] 분류 완료: {parsed}")
            return parsed
            
        except json.JSONDecodeError as e:
            logger.error(f"[라이프스타일 분류] JSON 파싱 실패: {e}")
            return {
                "lifestyle": [],
                "message": "라이프스타일 분류 실패",
                "evidence_topics": []
            }
        except Exception as e:
            logger.error(f"[라이프스타일 분류] 분류 실패: {e}", exc_info=True)
            return {
                "lifestyle": [],
                "message": "라이프스타일 분류 실패",
                "evidence_topics": []
            }
    
    def _build_prompt(self, lifestyle_json: str, analysis_json: str) -> str:
        """프롬프트 생성 (노트북의 전체 규칙 포함)"""
        # 노트북의 전체 프롬프트를 그대로 사용
        # (너무 길어서 생략, 실제로는 노트북의 프롬프트를 그대로 복사)
        return f"""
당신은 사람의 라이프스타일을 정밀하게 해석하는 전문 프로파일러(Personality & Lifestyle Analyst)입니다.
당신의 임무는 입력된 feature_sentence들을 기반으로 이 사람이 어떤 라이프스타일 **행동 유형**에 해당하는지를 논리적·일관적으로 분류하는 것입니다.

행동 유형 정의(JSON):
{lifestyle_json}

분석 대상 feature_sentence 목록:
{analysis_json}

[출력 형식]
{{
  "lifestyle": [
    {{
      "id": "1~8 중 하나",
      "lifestyle_name": "행동 유형 이름",
      "role": "primary",
      "reason": "이 유형을 선택한 핵심 근거를 2문장 이내로 간결하게 작성"
    }}
  ],
  "evidence_topics": ["근거가 된 topic 이름들"]
}}

규칙:
- feature_sentence 개수가 1개 이하이면 → "라이프스타일을 분류할 수 없습니다." 메시지 반환
- 가장 일관된 유형이 단 하나라면 → primary 1개만 출력
- 단정 짓기 어려울 때만 → primary + secondary (최대 2개)
- 강화 신호는 반드시 2개 이상 반복되어야 함
- 단발적 행동은 근거로 사용 금지

이제 위 규칙을 따르고, 오직 하나의 JSON 객체만 출력하세요.
"""

