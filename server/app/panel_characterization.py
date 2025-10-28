"""
패널 특성 문장화 서비스
LLM을 사용하여 패널 데이터를 검색 최적화된 자연어로 변환
"""

import json
from typing import Dict, Any, Optional
import os
from anthropic import Anthropic


CHARACTERIZATION_PROMPT = """
다음 패널 데이터를 분석하여 검색과 분석에 최적화된 자연어 프로필을 생성해주세요.

=== 패널 기본 정보 ===
나이: {age}세
성별: {gender}
지역: {region}
소득: {income}

=== 응답 데이터 ===
{welcome_data}

{qpoll_data}

=== 지침 ===
다음 형식으로 요약해주세요:

1. **인구통계학적 특성**: 나이, 성별, 지역 등 기본 정보 요약
2. **관심사 및 선호도**: 응답에서 추출된 관심사와 선호하는 제품/서비스
3. **행동 패턴**: 소비 패턴, 라이프스타일, 활동 특성
4. **핵심 키워드**: 검색에 유용한 키워드 5-10개

각 섹션은 간결하고 구체적으로 작성하되, 자연스러운 문장으로 작성해주세요.
검색 쿼리에 매칭되기 쉽도록 관련 키워드를 자연스럽게 포함해주세요.

출력 형식: 마크다운 없이 순수 텍스트로 작성해주세요.
"""


class PanelCharacterizationService:
    """패널 특성 문장화 서비스"""
    
    def __init__(self):
        """초기화"""
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key:
            self.client = Anthropic(api_key=api_key)
        else:
            self.client = None
            print("경고: ANTHROPIC_API_KEY가 설정되지 않았습니다. LLM 기능을 사용할 수 없습니다.")
    
    def characterize_panel(self, panel_data: Dict[str, Any]) -> str:
        """
        패널 데이터를 자연어 특성으로 변환
        
        Args:
            panel_data: 패널 데이터 딕셔너리
                - id: 패널 ID
                - payload: welcome1_raw의 payload (문자열)
                - data: welcome2_2nd의 data (JSON)
        
        Returns:
            패널 특성을 설명하는 자연어 텍스트
        """
        # 데이터 파싱
        welcome_data = self._parse_welcome_data(panel_data)
        qpoll_data = self._parse_qpoll_data(panel_data)
        
        # LLM에 전달할 프롬프트 생성
        prompt = self._build_prompt(welcome_data, qpoll_data)
        
        # LLM 호출
        if self.client:
            try:
                message = self.client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=500,
                    messages=[{
                        "role": "user",
                        "content": prompt
                    }]
                )
                
                # 응답 텍스트 추출
                text = ""
                for content_block in message.content:
                    if content_block.type == "text":
                        text += content_block.text
                
                return text
            except Exception as e:
                print(f"LLM 호출 실패: {e}")
                # 폴백: 기본 특성 생성
                return self._generate_basic_characterization(panel_data)
        else:
            # LLM 없이 기본 특성 생성
            return self._generate_basic_characterization(panel_data)
    
    def _parse_welcome_data(self, panel_data: Dict[str, Any]) -> str:
        """Welcome 데이터 파싱"""
        try:
            data = panel_data.get("data", {})
            if isinstance(data, str):
                data = json.loads(data)
            
            # 필요한 필드 추출
            info_parts = []
            if "age" in data:
                info_parts.append(f"나이: {data['age']}")
            if "gender" in data:
                info_parts.append(f"성별: {data['gender']}")
            if "region" in data:
                info_parts.append(f"지역: {data['region']}")
            if "income" in data:
                info_parts.append(f"소득: {data['income']}")
            
            # payload도 추가 (있는 경우)
            payload = panel_data.get("payload", "")
            if payload:
                info_parts.append(f"\n추가 정보: {payload[:200]}")  # 처음 200자만
            
            return "\n".join(info_parts)
        except Exception as e:
            print(f"Welcome 데이터 파싱 실패: {e}")
            return str(panel_data.get("data", ""))
    
    def _parse_qpoll_data(self, panel_data: Dict[str, Any]) -> str:
        """qpoll 응답 데이터 파싱"""
        try:
            data = panel_data.get("data", {})
            if isinstance(data, str):
                data = json.loads(data)
            
            # qpoll 관련 필드가 있는지 확인
            qpoll_info = data.get("qpoll", {}) or data.get("responses", {})
            
            if qpoll_info and isinstance(qpoll_info, dict):
                qpoll_text = "qpoll 응답:\n"
                for key, value in qpoll_info.items():
                    if value:  # 빈 값이 아닌 경우만
                        qpoll_text += f"- {key}: {value}\n"
                return qpoll_text
            else:
                return "qpoll 응답 없음"
        except Exception as e:
            print(f"qpoll 데이터 파싱 실패: {e}")
            return "qpoll 응답 없음"
    
    def _build_prompt(self, welcome_data: str, qpoll_data: str) -> str:
        """프롬프트 생성"""
        # 간단한 예시 데이터로 프롬프트 생성
        # 실제로는 panel_data에서 추출
        return CHARACTERIZATION_PROMPT.format(
            age=30,
            gender="남성",
            region="서울",
            income="400~600",
            welcome_data=welcome_data,
            qpoll_data=qpoll_data
        )
    
    def _generate_basic_characterization(self, panel_data: Dict[str, Any]) -> str:
        """LLM 없이 기본 특성 생성 (폴백)"""
        try:
            data = panel_data.get("data", {})
            if isinstance(data, str):
                data = json.loads(data)
            
            characteristics = []
            
            # 기본 정보
            if "age" in data:
                characteristics.append(f"{data['age']}세")
            if "gender" in data:
                characteristics.append(data['gender'])
            if "region" in data:
                characteristics.append(f"{data['region']} 거주")
            
            # qpoll 응답 여부
            has_qpoll = self._check_has_qpoll(panel_data)
            if has_qpoll:
                characteristics.append("qpoll 응답자")
            
            base_text = " ".join(characteristics)
            
            # 기본 특성 설명 추가
            char_description = f"패널 {panel_data.get('id', 'N/A')}: {base_text}."
            
            return char_description
        except Exception as e:
            print(f"기본 특성 생성 실패: {e}")
            return f"패널 ID: {panel_data.get('id', 'Unknown')}"
    
    def _check_has_qpoll(self, panel_data: Dict[str, Any]) -> bool:
        """qpoll 응답이 있는지 확인"""
        try:
            payload = panel_data.get("payload", "")
            if payload and len(payload.strip()) > 0:
                return True
            
            data = panel_data.get("data", {})
            if isinstance(data, str):
                data = json.loads(data)
            
            # data에 응답 관련 필드가 있는지 확인
            if isinstance(data, dict):
                # qpoll, responses, answers 등의 키가 있는지 확인
                qpoll_keys = ['qpoll', 'responses', 'answers', 'questions']
                for key in qpoll_keys:
                    if key in data and data[key]:
                        return True
            
            return False
        except:
            return False


# 전역 인스턴스
characterization_service = PanelCharacterizationService()


