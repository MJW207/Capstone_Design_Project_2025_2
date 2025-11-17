"""LLM 기반 메타데이터 추출기"""
import json
import re
from typing import Dict, Any
from anthropic import Anthropic
import logging

logger = logging.getLogger(__name__)


class MetadataExtractor:
    """LLM으로 검색 쿼리에서 메타데이터 추출"""

    def __init__(self, api_key: str):
        """
        Args:
            api_key: Anthropic API 키
        """
        self.client = Anthropic(api_key=api_key)
        self.model = "claude-sonnet-4-5-20250929"

    def extract(self, query: str) -> Dict[str, Any]:
        """
        자연어 쿼리에서 구조화된 메타데이터 추출 (다중 값/범위 지원)

        Args:
            query: 검색 쿼리 (예: "서울 강남구 27세 기혼 남자")

        Returns:
            메타데이터 딕셔너리 (예: {"지역": "서울", "지역구": "강남구", "나이": 27, "연령대": "20대", "성별": "남", "결혼여부": "기혼"})
        """
        prompt = f"""당신은 자연어 질의에서 메타데이터를 추출하는 전문가입니다.

자연어 질의를 분석하여 모든 정보를 메타데이터로 추출하세요.

=== 추출 규칙 ===

1. **지역 관련 정보는 모두 "지역" 키로 추출** (매우 중요!)
   - 국내 지역: "서울", "경기", "부산" 등 → "지역" 키 사용
   - 지역구: "강남구", "서초구", "양산시" 등 → "지역구" 키로 별도 추출
   - 해외 관련: "해외", "외국", "국외", "외국인", "해외 거주" 등 → "지역": "해외"
   - "거주지", "거주", "사는 곳" 등의 키 사용 금지
   - 반드시 "지역" 키만 사용할 것

2. **다중 값은 리스트로 표현**
   - "서울, 경기" → "지역": ["서울", "경기"]
   - "서울 또는 경기" → "지역": ["서울", "경기"]
   - "20대, 30대" → "연령대": ["20대", "30대"]

3. **나이와 연령대 모두 추출**
   - "27세" → "나이": 27, "연령대": "20대"
   - "35세" → "나이": 35, "연령대": "30대"
   - 연령대만 있으면: "20대" → "연령대": "20대"

4. **범위는 연령대 리스트로 변환**
   - "10~20세" → "연령대": ["10대", "20대"]
   - "20대~30대" → "연령대": ["20대", "30대"]
   - **"40세 이하" → "연령대": ["10대", "20대", "30대", "40대"]** ⭐
   - **"40대 이하" → "연령대": ["10대", "20대", "30대", "40대"]** ⭐

5. **성별 정규화**
   - "남성", "남자", "남" → "남자"
   - "여성", "여자", "여" → "여자"

6. **결혼여부 추출** (⭐⭐⭐ 가장 중요! 절대 지켜야 함!)
   - 반드시 "결혼여부" 키만 사용 (다른 키 사용 절대 금지!)
   - "기혼", "결혼한", "결혼한 사람", "결혼함" → "결혼여부": "기혼"
   - "미혼", "미혼인", "결혼 안한" → "결혼여부": "미혼"
   - ⚠️ 절대 사용 금지 키: "결혼상태", "결혼상황", "혼인", "결혼" (이런 키 쓰면 안됨!)

7. **자녀수/가족수 추출** (⭐⭐⭐ 매우 중요!)
   - 반드시 "자녀수", "가족수" 키만 사용 (다른 키 사용 절대 금지!)
   - "자녀 2명" → "자녀수": 2
   - "가족 3명", "가족 구성 3명" → "가족수": 3
   - **"혼자 사는", "1인 가구", "독거", "혼자 거주" → "가족수": 1** ⭐
   - **"2인 가구" → "가족수": 2** ⭐
   - ⚠️ 절대 사용 금지 키: "가구형태", "가구유형", "거주형태" (이런 키 쓰면 안됨!)

8. **학력 추출**
   - "고졸", "고등학교 졸업" → "학력": "고등학교 졸업 이하"
   - "대학생", "대학 재학" → "학력": "대학교 재학"
   - "대졸", "대학교 졸업" → "학력": "대학교 졸업"
   - "대학원", "석사", "박사" → "학력": "대학원 재학/졸업 이상"

9. **직업 추출** (⭐ 중요: 정규화하여 추출)
   - "전문직", "의사", "간호사", "변호사" 등 → "직업": "전문직"
   - "교직", "교수", "교사", "강사" → "직업": "교직"
   - "경영관리직", "사장", "임원" → "직업": "경영관리직"
   - "사무직", "공무원", "직장인" → "직업": "사무직"
   - "자영업", "사업" → "직업": "자영업"
   - "판매직", "세일즈" → "직업": "판매직"
   - "서비스직" → "직업": "서비스직"
   - "생산직", "노무직" → "직업": "생산/노무직"
   - "기능직", "기술직" → "직업": "기능직"
   - "농업", "임업", "축산업", "수산업" → "직업": "농업/임업/축산업/광업/수산업"
   - "임대업" → "직업": "임대업"
   - "학생", "중학생", "고등학생" → "직업": "중/고등학생"
   - "대학생", "대학원생" → "직업": "대학생/대학원생"
   - "전업주부", "주부" → "직업": "전업주부"
   - "퇴직", "은퇴", "연금생활자" → "직업": "퇴직/연금생활자"
   - "일하는", "근무하는", "종사하는" 등의 표현에서 직업 추출

10. **모호한 표현 해석**
   - "젊은층", "청년" → "연령대": ["20대", "30대"]
   - "중년층", "장년" → "연령대": ["40대", "50대"]
   - "MZ세대" → "연령대": ["20대", "30대"]

11. **전국/전체는 빈 값으로 처리**
   - "전국" → 지역 필드 생성하지 않음

12. **수도권 특별 처리**
   - "수도권" → "지역": ["서울", "경기", "인천"]

=== 예시 ===

입력: "서울 강남구 27세 기혼 남자"
출력:
{{
    "지역": "서울",
    "지역구": "강남구",
    "나이": 27,
    "연령대": "20대",
    "결혼여부": "기혼",
    "성별": "남자"
}}

입력: "전문직에서 일하는 사람"
출력:
{{
    "직업": "전문직"
}}

질의: {query}

⚠️⚠️⚠️ 필수 주의사항:
- 직업은 15개 보기 중 하나로 정규화하여 추출 (정확히 매칭)
- 결혼 관련 정보는 반드시 "결혼여부" 키만 사용!
- 가족/가구 관련 정보는 반드시 "가족수" 키만 사용!
- "혼자 사는", "1인 가구", "독거" 등은 모두 "가족수": 1로 변환!
- "XX세 이하"는 해당 연령대까지 모든 연령대를 리스트로 반환

JSON만 반환하세요. 다른 설명은 하지 마세요.
"""

        try:
            # API 키 유효성 검사
            if not self.client or not hasattr(self.client, 'api_key') or not self.client.api_key:
                logger.warning("[메타데이터 추출] Anthropic API 키가 설정되지 않았습니다. 빈 메타데이터 반환")
                return {}
            
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                temperature=0.0,
                messages=[{"role": "user", "content": prompt}]
            )

            text = response.content[0].text
            
            # JSON 파싱 (코드블록 제거)
            if '```json' in text:
                json_text = text.split('```json')[1].split('```')[0].strip()
            elif '```' in text:
                json_text = text.split('```')[1].strip()
            else:
                json_text = text.strip()
            
            metadata = json.loads(json_text)
            
            # ===== 후처리: 키 이름 및 값 정규화 =====
            logger.debug(f"[메타데이터 추출 - LLM 원본] {metadata}")

            # 1. 지역 키 정규화
            if "거주지" in metadata and "지역" not in metadata:
                metadata["지역"] = metadata.pop("거주지")
            if "거주" in metadata and "지역" not in metadata:
                metadata["지역"] = metadata.pop("거주")

            # 2. 결혼여부 키 정규화
            marriage_keys = ["결혼상태", "결혼상황", "혼인", "혼인여부", "결혼"]
            for key in marriage_keys:
                if key in metadata and "결혼여부" not in metadata:
                    metadata["결혼여부"] = metadata.pop(key)
                    logger.debug(f"   [후처리] '{key}' → '결혼여부'로 키 정규화")
                    break

            # 3. 결혼여부 값 정규화
            if "결혼여부" in metadata:
                marriage = metadata["결혼여부"]
                if isinstance(marriage, str):
                    original = marriage
                    if marriage in ["결혼함", "결혼", "결혼한", "기혼자", "유부남", "유부녀"]:
                        metadata["결혼여부"] = "기혼"
                        logger.debug(f"   [후처리] 결혼여부 값 '{original}' → '기혼'으로 정규화")
                    elif marriage in ["미혼인", "결혼 안함", "미혼자"]:
                        metadata["결혼여부"] = "미혼"
                        logger.debug(f"   [후처리] 결혼여부 값 '{original}' → '미혼'으로 정규화")

            # 4. 가족수 키 정규화
            household_keys = ["가구형태", "가구유형", "거주형태", "가구구성"]
            for key in household_keys:
                if key in metadata and "가족수" not in metadata:
                    value = metadata.pop(key)
                    if isinstance(value, str):
                        match = re.search(r'(\d+)인', value)
                        if match:
                            metadata["가족수"] = int(match.group(1))
                            logger.debug(f"   [후처리] '{key}: {value}' → '가족수: {metadata['가족수']}'로 변환")
                    break

            # 5. ⭐ 직업 정규화 (15개 보기로 매핑)
            if "직업" in metadata:
                job = metadata["직업"]
                job_normalized = self._normalize_job(job)
                if job_normalized != job:
                    logger.debug(f"   [후처리] 직업 '{job}' → '{job_normalized}'로 정규화")
                    metadata["직업"] = job_normalized

            # 6. 성별 정규화
            if "성별" in metadata:
                gender = metadata["성별"]
                if isinstance(gender, str):
                    if gender in ["남성", "남자", "male", "M"]:
                        metadata["성별"] = "남"
                    elif gender in ["여성", "여자", "female", "F"]:
                        metadata["성별"] = "여"
                elif isinstance(gender, list):
                    normalized = []
                    for g in gender:
                        if g in ["남성", "남자", "male", "M"]:
                            normalized.append("남")
                        elif g in ["여성", "여자", "female", "F"]:
                            normalized.append("여")
                        else:
                            normalized.append(g)
                    metadata["성별"] = normalized
            
            logger.debug(f"[메타데이터 추출 - 최종] {metadata}")
            return metadata

        except Exception as e:
            error_msg = str(e)
            # 인증 오류인 경우 경고만 출력하고 빈 메타데이터 반환
            if "401" in error_msg or "authentication" in error_msg.lower() or "invalid x-api-key" in error_msg.lower():
                logger.warning(f"[메타데이터 추출] Anthropic API 인증 오류: {error_msg}. 빈 메타데이터로 계속 진행")
            else:
                # 다른 오류도 경고로 처리 (검색은 계속 진행)
                logger.warning(f"[메타데이터 추출] 추출 실패 (계속 진행): {error_msg}")
            return {}

    def _normalize_job(self, job: str) -> str:
        """직업을 15개 보기 중 하나로 정규화"""
        job_lower = job.lower()
        
        # 15개 보기 매핑
        if any(kw in job_lower for kw in ["전문직", "의사", "간호사", "변호사", "회계사", "예술가", "종교인", "엔지니어", "프로그래머", "기술사"]):
            return "전문직"
        elif any(kw in job_lower for kw in ["교직", "교수", "교사", "강사"]):
            return "교직"
        elif any(kw in job_lower for kw in ["경영", "관리직", "사장", "임원", "대기업 간부", "고위 공무원"]):
            return "경영/관리직"
        elif any(kw in job_lower for kw in ["사무직", "공무원", "회사원", "직장인", "은행원", "군인", "경찰", "소방관"]):
            return "사무직"
        elif any(kw in job_lower for kw in ["자영업", "사업"]):
            return "자영업"
        elif any(kw in job_lower for kw in ["판매직", "세일즈", "보험설계사", "영업"]):
            return "판매직"
        elif any(kw in job_lower for kw in ["서비스직", "미용", "요식업"]):
            return "서비스직"
        elif any(kw in job_lower for kw in ["생산직", "노무직", "운전", "현장직"]):
            return "생산/노무직"
        elif any(kw in job_lower for kw in ["기능직", "기술직", "제빵", "목수", "전기공", "정비사", "배관공"]):
            return "기능직"
        elif any(kw in job_lower for kw in ["농업", "임업", "축산", "수산", "광업"]):
            return "농업/임업/축산업/광업/수산업"
        elif "임대" in job_lower:
            return "임대업"
        elif any(kw in job_lower for kw in ["중학생", "고등학생", "학생"]) and "대학" not in job_lower:
            return "중/고등학생"
        elif any(kw in job_lower for kw in ["대학생", "대학원생"]):
            return "대학생/대학원생"
        elif any(kw in job_lower for kw in ["주부", "전업주부"]):
            return "전업주부"
        elif any(kw in job_lower for kw in ["퇴직", "은퇴", "연금"]):
            return "퇴직/연금생활자"
        
        # 15개 보기에 해당하지 않으면 그대로 반환
        return job


