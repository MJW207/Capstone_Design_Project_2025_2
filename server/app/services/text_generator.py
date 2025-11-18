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

    def generate(self, category: str, metadata_items: List[str]) -> str:
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
            return self._generate_by_llm(category, metadata_items)

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

    def _generate_by_llm(self, category: str, metadata_items: List[str]) -> str:
        """LLM으로 텍스트 생성 (템플릿이 없는 경우)"""
        metadata_str = ", ".join(metadata_items)
        
        prompt = f"""다음 메타데이터를 자연스러운 한국어 문장으로 변환하세요.

카테고리: {category}
메타데이터: {metadata_str}

규칙:
- 존댓말 사용 (입니다/습니다)
- 제공된 정보만 사용
- 카테고리 이름 포함하지 말 것

문장만 출력하세요:"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=512,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            text = response.content[0].text.strip()
            text = text.replace('"', '').replace("'", '').replace('```', '').strip()
            
            logger.debug(f"[{category}] {text[:80]}...")
            return text
        
        except Exception as e:
            logger.error(f"[ERROR] LLM 텍스트 생성 실패: {e}")
            return metadata_str



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

    def generate(self, category: str, metadata_items: List[str]) -> str:
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
            return self._generate_by_llm(category, metadata_items)

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

    def _generate_by_llm(self, category: str, metadata_items: List[str]) -> str:
        """LLM으로 텍스트 생성 (템플릿이 없는 경우)"""
        metadata_str = ", ".join(metadata_items)
        
        prompt = f"""다음 메타데이터를 자연스러운 한국어 문장으로 변환하세요.

카테고리: {category}
메타데이터: {metadata_str}

규칙:
- 존댓말 사용 (입니다/습니다)
- 제공된 정보만 사용
- 카테고리 이름 포함하지 말 것

문장만 출력하세요:"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=512,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            text = response.content[0].text.strip()
            text = text.replace('"', '').replace("'", '').replace('```', '').strip()
            
            logger.debug(f"[{category}] {text[:80]}...")
            return text
        
        except Exception as e:
            logger.error(f"[ERROR] LLM 텍스트 생성 실패: {e}")
            return metadata_str


