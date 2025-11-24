"""카테고리별 텍스트 생성기"""
from typing import Dict, List
from anthropic import Anthropic
import logging

logger = logging.getLogger(__name__)


class CategoryTextGenerator:
    """카테고리별로 자연어 텍스트 생성 (Pinecone 저장 형식에 맞춤)"""

    def __init__(self, api_key: str):
        """
        Args:
            api_key: Anthropic API 키
        """
        self.client = Anthropic(api_key=api_key)
        self.model = "claude-sonnet-4-5-20250929"

    def generate(self, category: str, metadata_items: List[str], full_metadata_dict: Dict[str, str] = None) -> str:
        """
        카테고리별 자연어 텍스트 생성 (Pinecone 실제 저장 형식 참고)
        
        ⭐ 중요: Pinecone에 저장된 텍스트 형식을 최대한 유사하게 생성해야 벡터 유사도가 높아짐
        """
        if not metadata_items:
            return ""

        # 메타데이터를 딕셔너리로 파싱
        metadata_dict = {}
        for item in metadata_items:
            if ": " in item:
                key, value = item.split(": ", 1)
                metadata_dict[key] = value

        try:
            # 카테고리별 템플릿 기반 텍스트 생성
            text = self._generate_by_template(category, metadata_dict)
            
            if text:
                logger.debug(f"[{category}] {text[:80]}...")
                return text
            
            # 템플릿이 없으면 LLM으로 생성
            return self._generate_by_llm(category, metadata_items, full_metadata_dict)

        except Exception as e:
            logger.error(f"[ERROR] 텍스트 생성 실패 ({category}): {e}")
            return ", ".join(metadata_items)

    def _generate_by_template(self, category: str, metadata: Dict[str, str]) -> str:
        """
        Pinecone 저장 형식을 참고한 템플릿 기반 텍스트 생성
        
        실제 Pinecone 저장 예시:
        - 인구: "경기 성남시에 거주하는 48세 남이며 미혼, 가족 구성은 2명, 최종 학력은 대학교 재학입니다."
        - 직업소득: "현재 직업은 전문직 (의사, 간호사, 변호사, 회계사, 예술가, 종교인, 엔지니어, 프로그래머, 기술사 등)이며, 직무는 IT입니다. 월평균 개인 소득은 월 600~699만원이고, 가구 소득은 월 600~699만원입니다."
        """
        
        if category == "기본정보":
            # Pinecone topic="인구" 형식
            parts = []
            
            # 지역 정보
            if "지역" in metadata or "지역구" in metadata:
                region_text = ""
                if "지역" in metadata and "지역구" in metadata:
                    region_text = f"{metadata['지역']} {metadata['지역구']}"
                elif "지역구" in metadata:
                    region_text = metadata['지역구']
                elif "지역" in metadata:
                    region_text = metadata['지역']
                
                if region_text:
                    parts.append(f"{region_text}에 거주하는")
            
            # 나이
            if "나이" in metadata:
                parts.append(f"{metadata['나이']}세")
            
            # 성별
            if "성별" in metadata:
                parts.append(metadata['성별'])
            
            # 기본 정보 연결
            base_text = " ".join(parts) if parts else ""
            
            # 추가 정보 (이며 ~)
            additional = []
            if "결혼여부" in metadata:
                additional.append(metadata['결혼여부'])
            
            if "자녀수" in metadata:
                additional.append(f"자녀는 {metadata['자녀수']}명")
            
            if "가족수" in metadata:
                additional.append(f"가족 구성은 {metadata['가족수']}명")
            
            if "학력" in metadata:
                additional.append(f"최종 학력은 {metadata['학력']}")
            
            # 최종 조합
            if base_text and additional:
                return f"{base_text}이며 {', '.join(additional)}입니다."
            elif base_text:
                return f"{base_text}입니다."
            elif additional:
                return f"{', '.join(additional)}입니다."
            
            return ""
        
        elif category == "직업소득":
            # Pinecone topic="직업소득" 형식
            # 직업별 상세 설명 매핑 (Pinecone 실제 패턴)
            job_details = {
                "전문직": " (의사, 간호사, 변호사, 회계사, 예술가, 종교인, 엔지니어, 프로그래머, 기술사 등)",
                "사무직": " (일반 사무직, 은행원, 공무원, 군인, 경찰, 소방관 등)",
                "서비스직": " (미용, 통신, 안내, 요식업 직원 등)",
                "판매직": " (매장 판매직, 세일즈, 보험설계사, 텔레마케터, 영업 등)",
                "생산직": " (차량운전자, 현장직, 생산직 등)",
                "생산/노무직": " (차량운전자, 현장직, 생산직 등)",
                "교직": " (교수, 교사, 강사 등)",
                "자영업": " (제조업, 건설업, 도소매업, 운수업, 무역업, 서비스업 경영)",
                "농/임/수산/축산업": "",
                "대학생/대학원생": "",
                "중/고등학생": "",
                "전업주부": "",
                "무직": "",
                "은퇴": "",
                "프리랜서": "",
                "회사원": "",
            }
            
            parts = []
            
            if "직업" in metadata:
                job = metadata['직업']
                # 상세 설명 추가
                job_detail = job_details.get(job, "")
                parts.append(f"현재 직업은 {job}{job_detail}입니다")
            
            # 학력이 있으면 추가 (직업 정보와 함께)
            if "학력" in metadata:
                parts.append(f"최종 학력은 {metadata['학력']}입니다")
            
            return ". ".join(parts) + "." if parts else ""
        
        elif category == "전자제품":
            if "전자제품" in metadata:
                products = metadata['전자제품']
                return f"{products} 등 전자제품을 보유하고 있습니다."
            return ""
        
        elif category == "휴대폰":
            if "휴대폰" in metadata:
                return f"현재 사용 중인 휴대폰은 {metadata['휴대폰']}입니다."
            return ""
        
        elif category == "자동차":
            if "자동차" in metadata:
                car = metadata['자동차']
                if car in ["없음", "없습니다", "보유하지 않음"]:
                    return "현재 보유 차량은 없습니다."
                else:
                    return f"{car} 모델의 자동차를 보유하고 있습니다."
            return ""
        
        elif category == "흡연":
            if "흡연" in metadata:
                smoking = metadata['흡연']
                if smoking in ["흡연", "일반담배", "담배"]:
                    return "일반 담배를 경험한 적이 있습니다."
                elif smoking in ["비흡연", "없음"]:
                    return "흡연 경험이 없습니다."
                else:
                    return f"{smoking}를 경험한 적이 있습니다."
            return ""
        
        elif category == "음주":
            if "음주" in metadata:
                drinks = metadata['음주']
                return f"음주 경험이 있는 술 종류는 {drinks}입니다."
            return ""
        
        elif category == "건강":
            parts = []
            if "활동" in metadata:
                parts.append(f"{metadata['활동']} 활동을 합니다")
            if "운동" in metadata:
                parts.append(f"{metadata['운동']} 운동을 합니다")
            return ". ".join(parts) + "." if parts else ""
        
        elif category == "미디어":
            if "OTT" in metadata:
                return f"현재 이용 중인 OTT 서비스는 {metadata['OTT']}개입니다."
            return ""
        
        # 기본 템플릿이 없는 경우
        return ""

    def _generate_by_llm(self, category: str, metadata_items: List[str], full_metadata_dict: Dict[str, str] = None) -> str:
        """LLM으로 텍스트 생성 (템플릿이 없는 경우, QuickPoll 문장 구조 지원)"""
        # 메타데이터를 딕셔너리로 변환
        metadata_dict = {}
        for item in metadata_items:
            if ": " in item:
                key, value = item.split(": ", 1)
                metadata_dict[key] = value

        metadata_str = ", ".join([f"{k}: {v}" for k, v in metadata_dict.items()])
        
        # 카테고리별 QuickPoll 문장 구조 프롬프트
        category_instructions = {
            "스트레스": """⭐ QuickPoll 메타데이터가 있는 경우, 반드시 아래 문장 구조를 따라 생성하세요:
- 스트레스_원인 → '가장 스트레스를 많이 느끼는 상황은 {값}입니다.'
- 스트레스_해소 → '스트레스 해소는 주로 {값}를 통해 하고 있습니다.'
- 이사_스트레스 → '이사할 때는 {값}에서 가장 스트레스를 받습니다.'""",
            
            "미용": """⭐ QuickPoll 메타데이터가 있는 경우, 반드시 아래 문장 구조를 따라 생성하세요:
- 피부_만족도 → '현재 본인의 피부 상태에 대해서는 {값}고 느끼고 있습니다.'
- 스킨케어_지출 → '한 달 기준 스킨케어 제품에는 평균적으로 {값} 정도 소비하고 있습니다.'
- 스킨케어_구매기준 → '스킨케어 제품을 구매할 때는 {값}을 가장 중요하게 고려합니다.'""",
            
            "AI서비스": """⭐ QuickPoll 메타데이터가 있는 경우, 반드시 아래 문장 구조를 따라 생성하세요:
- AI_챗봇_사용 → '사용해 본 AI 챗봇 서비스는 {값}입니다.'
- AI_챗봇_주사용 → '그중에서 주로 사용하는 AI 챗봇 서비스는 {값}입니다.'
- AI_활용용도 → 'AI 챗봇 서비스는 주로 {값} 용도로 활용하거나 앞으로 활용하고 싶습니다.'
- AI_서비스_선호 → 'ChatGPT와 딥시크 중에서는 {값}에 더 호감을 느끼고 있습니다.'
- AI_활용분야 → '최근에는 {값} 분야에서 AI 서비스를 활용하고 있습니다.'""",
            
            "미디어": """⭐ QuickPoll 메타데이터가 있는 경우, 반드시 아래 문장 구조를 따라 생성하세요:
- OTT_이용개수 → '현재 이용 중인 OTT 서비스는 {값}입니다.'
- 주사용_앱 → '요즘 가장 많이 사용하는 앱은 {값}입니다.'""",
            
            "소비": """⭐ QuickPoll 메타데이터가 있는 경우, 반드시 아래 문장 구조를 따라 생성하세요:
- 전통시장_방문 → '전통시장은 {값} 정도의 빈도로 방문하고 있습니다.'
- 설선물_선호 → '설 선물로는 {값} 유형을 가장 선호합니다.'
- 기분좋은소비 → '본인을 위해 소비하는 것 중 가장 기분 좋아지는 소비는 {값}입니다.'
- 빠른배송_이용 → '빠른 배송 서비스는 주로 {값}을 구매할 때 이용합니다.'
- 최근지출_분야 → '최근 가장 지출이 많았던 분야는 {값}입니다.'""",
            
            "라이프스타일": """⭐ QuickPoll 메타데이터가 있는 경우, 반드시 아래 문장 구조를 따라 생성하세요:
- 알람_방식 → '아침에 기상하기 위해 주로 알람 방식을 {값}'
- 혼밥_빈도 → '혼자 외식하는 빈도는 {값} 입니다.'
- 미니멀맥시멀 → '자신은 {값}에 더 가깝다고 생각합니다.'
- 버리기아까운물건 → '버리기 아까운 물건은 주로 {값}합니다.'
- 비닐봉투_노력 → '일회용 비닐 사용을 줄이기 위해 {값}'
- 개인정보보호_습관 → '개인정보보호를 위해 {값}.'""",
            
            "경험": """⭐ QuickPoll 메타데이터가 있는 경우, 반드시 아래 문장 구조를 따라 생성하세요:
- 겨울방학_추억 → '초등학생 시절 겨울방학 때 가장 기억에 남는 일은 {값}입니다.'
- 갤러리_사진 → '휴대폰 갤러리에는 {값}이 가장 많이 저장되어 있습니다.'
- 반려동물_경험 → '{값}'
- 행복한노년_조건 → '행복한 노년을 위해 가장 중요하다고 생각하는 요소는 {값}입니다.'
- 다이어트_방법 → '가장 효과 있었던 다이어트 방법은 {값}입니다.'""",
            
            "식습관": """⭐ QuickPoll 메타데이터가 있는 경우, 반드시 아래 문장 구조를 따라 생성하세요:
- 야식_방식 → '야식을 먹을 때는 주로 {값} 방식으로 먹습니다.'
- 여름간식 → '여름철 최애 간식은 {값}입니다.'
- 초콜릿_섭취시기 → '초콜릿은 주로 {값} 때 먹습니다.'""",
            
            "여행": """⭐ QuickPoll 메타데이터가 있는 경우, 반드시 아래 문장 구조를 따라 생성하세요:
- 여행_스타일 → '여행 스타일은 {값}에 더 가깝습니다.'
- 여름물놀이_장소 → '여름철 선호하는 물놀이 장소는 {값}입니다.'
- 해외여행_희망지 → '올해 해외여행을 간다면 {값}로 가고 싶습니다.'""",
            
            "계절": """⭐ QuickPoll 메타데이터가 있는 경우, 반드시 아래 문장 구조를 따라 생성하세요:
- 여름_걱정 → '다가오는 여름철 가장 걱정되는 점은 {값}입니다.'
- 여름땀_불편함 → '여름철 땀 때문에 겪는 가장 큰 불편함은 {값}입니다.'
- 여름패션_필수템 → '여름철 절대 포기할 수 없는 패션 필수템은 {값}입니다.'
- 비_대응 → '갑작스러운 비에 우산이 없을 때는 주로 {값}.'""",
            
            "건강": """⭐ QuickPoll 메타데이터가 있는 경우, 반드시 아래 문장 구조를 따라 생성하세요:
- 체력관리 → '평소 체력 관리를 위해 주로 하고 있는 활동은 {값}입니다.'"""
        }
        
        instruction = category_instructions.get(category, "")
        
        prompt = f"""메타데이터: {metadata_str}

다음 조건을 반드시 지키면서 자연스러운 한국어 문장을 **한 문장만** 생성하세요.

[공통 규칙]
1. 반드시 주어진 메타데이터 정보만 사용하세요. **추가 추론, 상상, 일반화는 절대 하지 마세요.**
2. 메타데이터에 명시되지 않은 **직업, 감정, 이유, 원인, 성격, 해석 등**은 넣지 마세요.
3. 자연스럽고 간결한 한국어 문장으로 작성하되, **사실의 정확성**을 가장 우선시하세요.
4. 존댓말을 사용하세요. (입니다/합니다 등)
5. 출력은 **문장 하나만**, 따옴표, 번호, 마크다운 없이 반환하세요.
6. 카테고리 이름은 문장에 포함하지 마세요.

{instruction if instruction else "[카테고리 지침 없음]"}"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=512,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}],
                timeout=30.0  # 30초 타임아웃
            )
            
            text = response.content[0].text.strip()
            text = text.replace('"', '').replace("'", '').replace('```', '').strip()
            
            logger.debug(f"[{category}] {text[:80]}...")
            return text
        
        except Exception as e:
            logger.error(f"[ERROR] LLM 텍스트 생성 실패: {e}")
            return metadata_str


