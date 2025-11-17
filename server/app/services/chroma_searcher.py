"""ChromaDB 검색기"""
import os
from typing import Dict, Any, List, Optional
from langchain_chroma import Chroma
from langchain_upstage import UpstageEmbeddings
import logging

logger = logging.getLogger(__name__)


class ChromaPanelSearcher:
    """ChromaDB에서 topic + 단계적 완화 필터링 검색 (복수 값 OR 조건 지원)"""

    def __init__(self, chroma_base_dir: str, category_config: Dict[str, Any], upstage_api_key: str):
        """
        Args:
            chroma_base_dir: ChromaDB 데이터베이스 경로
            category_config: 카테고리 설정 딕셔너리
            upstage_api_key: Upstage API 키
        """
        self.chroma_base_dir = chroma_base_dir
        self.category_config = category_config
        self.embeddings = UpstageEmbeddings(
            api_key=upstage_api_key,
            model="solar-embedding-1-large"
        )

    def get_available_panels(self) -> List[str]:
        """사용 가능한 패널 목록"""
        if not os.path.exists(self.chroma_base_dir):
            return []

        panels = []
        for item in os.listdir(self.chroma_base_dir):
            full_path = os.path.join(self.chroma_base_dir, item)
            if os.path.isdir(full_path) and item.startswith("panel_"):
                mb_sn = item.replace("panel_", "").replace("_", "-")
                panels.append(mb_sn)

        return panels

    def _is_no_response(self, text: str) -> bool:
        """텍스트가 무응답인지 확인"""
        no_response_patterns = [
            "무응답", "응답하지 않았", "정보 없음", "해당 없음",
            "해당사항 없음", "기록 없음", "데이터 없음"
        ]
        text_lower = text.lower()
        return any(pattern in text_lower for pattern in no_response_patterns)

    def _has_all_required_keys(self, doc_metadata: Dict[str, Any], required_keys: List[str]) -> bool:
        """
        문서 메타데이터에 필요한 모든 키가 존재하고 값이 있는지 확인
        
        Args:
            doc_metadata: 문서의 메타데이터
            required_keys: 필수 키 목록
        
        Returns:
            모든 키가 존재하고 빈 문자열이 아니면 True
        """
        for key in required_keys:
            value = doc_metadata.get(key, '')
            if not value or value == '':
                return False
        return True

    def _build_filter_condition(self, key: str, value: Any) -> Dict[str, Any]:
        """
        메타데이터 필터 조건 생성 (리스트는 OR 조건으로 변환)

        Args:
            key: 메타데이터 키
            value: 단일 값 또는 리스트

        Returns:
            ChromaDB 필터 조건
            - 단일 값: {key: value}
            - 리스트: {"$or": [{key: v1}, {key: v2}, ...]}
        """
        if isinstance(value, list) and len(value) > 0:
            # 리스트인 경우 OR 조건으로 변환
            return {"$or": [{key: item} for item in value]}
        else:
            # 단일 값인 경우
            return {key: value}

    def _partial_match_score(self, doc_metadata: Dict[str, Any], required_filters: Dict[str, Any]) -> float:
        """
        부분 매칭 스코어 계산 (복수 값 OR 조건 지원)

        Returns:
            0.0 ~ 1.0 (일치하는 필터 비율)
        """
        if not required_filters:
            return 1.0

        matched = 0
        total = len(required_filters)

        for key, expected_value in required_filters.items():
            actual_value = doc_metadata.get(key, '')

            # 빈값 체크
            if not actual_value or actual_value == '':
                continue

            # expected_value가 리스트인 경우 OR 조건 (하나라도 일치하면 매칭)
            if isinstance(expected_value, list):
                if str(actual_value) in [str(v) for v in expected_value]:
                    matched += 1
            else:
                # 단일 값인 경우 정확히 일치
                if str(actual_value) == str(expected_value):
                    matched += 1

        return matched / total if total > 0 else 0.0

    def search_by_category(
        self,
        mb_sn: str,
        category: str,
        query_embedding: List[float],
        metadata_filter: Dict[str, Any] = None,
        top_k: int = 5
    ) -> Optional[Dict[str, Any]]:
        """
        특정 패널의 특정 카테고리에서 단계적 완화 필터링 검색 (복수 값 OR 조건 지원)

        1단계: 모든 메타데이터 필터 적용 (리스트는 OR 조건)
        2단계: 부분 매칭 (일부 메타데이터만 일치, 모든 필터 키가 존재해야 함)
        ** 3단계 제거: topic만으로 검색하면 빈 메타데이터도 반환되므로 제거 **

        예시:
            metadata_filter = {"지역": ["서울", "경기"], "성별": "남"}
            → WHERE topic="인구" AND (지역="서울" OR 지역="경기") AND 성별="남"
        """
        topic = self.category_config.get(category, {}).get("pinecone_topic", category)
        collection_name = f"panel_{mb_sn}".replace("-", "_")
        persist_directory = os.path.join(self.chroma_base_dir, collection_name)

        if not os.path.exists(persist_directory):
            return None

        vectorstore = None
        try:
            vectorstore = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                persist_directory=persist_directory
            )

            # ===== 1단계: 엄격한 필터링 (모든 메타데이터 일치, 리스트는 OR 조건) =====
            if metadata_filter:
                filter_conditions = [{"topic": topic}]
                for key, value in metadata_filter.items():
                    if value:
                        # 리스트는 OR 조건으로, 단일 값은 그대로 추가
                        condition = self._build_filter_condition(key, value)
                        filter_conditions.append(condition)
                where_filter = {"$and": filter_conditions}
            else:
                where_filter = {"topic": topic}

            results = vectorstore.similarity_search_by_vector_with_relevance_scores(
                embedding=query_embedding,
                k=top_k * 10,
                filter=where_filter
            )

            # 무응답 제외
            valid_results = []
            for doc, score in results:
                if not self._is_no_response(doc.page_content):
                    valid_results.append((doc, score))

            # 1단계 성공
            if valid_results:
                best_doc, best_score = valid_results[0]
                return {
                    "mb_sn": mb_sn,
                    "category": category,
                    "topic": best_doc.metadata.get("topic"),
                    "score": float(best_score),
                    "metadata": best_doc.metadata,
                    "text": best_doc.page_content[:200],
                    "filter_level": "strict"
                }

            # ===== 2단계: 부분 매칭 (topic만 필터링 후 후처리, 모든 필터 키 존재 필수) =====
            if metadata_filter:
                results = vectorstore.similarity_search_by_vector_with_relevance_scores(
                    embedding=query_embedding,
                    k=top_k * 20,
                    filter={"topic": topic}
                )

                # 부분 매칭 + 무응답 제외 + 모든 필터 키 존재 확인
                partial_results = []
                required_keys = list(metadata_filter.keys())
                
                for doc, score in results:
                    if self._is_no_response(doc.page_content):
                        continue
                    
                    # ⭐ 핵심 수정: 모든 필터 키가 존재하고 값이 있어야 함
                    # 예: {"결혼여부": "기혼"} 필터인데 문서에 "결혼여부" 키가 없으면 제외
                    if not self._has_all_required_keys(doc.metadata, required_keys):
                        continue

                    match_score = self._partial_match_score(doc.metadata, metadata_filter)
                    if match_score > 0:  # 최소 1개 이상 일치
                        # 스코어 = 유사도 * 부분매칭비율
                        combined_score = score * (0.5 + 0.5 * match_score)
                        partial_results.append((doc, combined_score, match_score))

                # 부분 매칭 스코어로 정렬
                partial_results.sort(key=lambda x: x[1], reverse=True)

                if partial_results:
                    best_doc, combined_score, match_ratio = partial_results[0]
                    return {
                        "mb_sn": mb_sn,
                        "category": category,
                        "topic": best_doc.metadata.get("topic"),
                        "score": float(combined_score),
                        "metadata": best_doc.metadata,
                        "text": best_doc.page_content[:200],
                        "filter_level": "partial",
                        "match_ratio": match_ratio
                    }

            # ⭐ 3단계 제거: 메타데이터 필터가 있는 경우 topic만으로 검색하지 않음
            # 이유: 빈 메타데이터 패널도 반환되어 검색 품질이 떨어짐
            
            return None

        except Exception as e:
            logger.error(f"ChromaDB 검색 오류 (mb_sn={mb_sn}, category={category}): {e}")
            return None
        finally:
            if vectorstore is not None:
                try:
                    if hasattr(vectorstore, '_client'):
                        vectorstore._client = None
                    del vectorstore
                except:
                    pass



import os
from typing import Dict, Any, List, Optional
from langchain_chroma import Chroma
from langchain_upstage import UpstageEmbeddings
import logging

logger = logging.getLogger(__name__)


class ChromaPanelSearcher:
    """ChromaDB에서 topic + 단계적 완화 필터링 검색 (복수 값 OR 조건 지원)"""

    def __init__(self, chroma_base_dir: str, category_config: Dict[str, Any], upstage_api_key: str):
        """
        Args:
            chroma_base_dir: ChromaDB 데이터베이스 경로
            category_config: 카테고리 설정 딕셔너리
            upstage_api_key: Upstage API 키
        """
        self.chroma_base_dir = chroma_base_dir
        self.category_config = category_config
        self.embeddings = UpstageEmbeddings(
            api_key=upstage_api_key,
            model="solar-embedding-1-large"
        )

    def get_available_panels(self) -> List[str]:
        """사용 가능한 패널 목록"""
        if not os.path.exists(self.chroma_base_dir):
            return []

        panels = []
        for item in os.listdir(self.chroma_base_dir):
            full_path = os.path.join(self.chroma_base_dir, item)
            if os.path.isdir(full_path) and item.startswith("panel_"):
                mb_sn = item.replace("panel_", "").replace("_", "-")
                panels.append(mb_sn)

        return panels

    def _is_no_response(self, text: str) -> bool:
        """텍스트가 무응답인지 확인"""
        no_response_patterns = [
            "무응답", "응답하지 않았", "정보 없음", "해당 없음",
            "해당사항 없음", "기록 없음", "데이터 없음"
        ]
        text_lower = text.lower()
        return any(pattern in text_lower for pattern in no_response_patterns)

    def _has_all_required_keys(self, doc_metadata: Dict[str, Any], required_keys: List[str]) -> bool:
        """
        문서 메타데이터에 필요한 모든 키가 존재하고 값이 있는지 확인
        
        Args:
            doc_metadata: 문서의 메타데이터
            required_keys: 필수 키 목록
        
        Returns:
            모든 키가 존재하고 빈 문자열이 아니면 True
        """
        for key in required_keys:
            value = doc_metadata.get(key, '')
            if not value or value == '':
                return False
        return True

    def _build_filter_condition(self, key: str, value: Any) -> Dict[str, Any]:
        """
        메타데이터 필터 조건 생성 (리스트는 OR 조건으로 변환)

        Args:
            key: 메타데이터 키
            value: 단일 값 또는 리스트

        Returns:
            ChromaDB 필터 조건
            - 단일 값: {key: value}
            - 리스트: {"$or": [{key: v1}, {key: v2}, ...]}
        """
        if isinstance(value, list) and len(value) > 0:
            # 리스트인 경우 OR 조건으로 변환
            return {"$or": [{key: item} for item in value]}
        else:
            # 단일 값인 경우
            return {key: value}

    def _partial_match_score(self, doc_metadata: Dict[str, Any], required_filters: Dict[str, Any]) -> float:
        """
        부분 매칭 스코어 계산 (복수 값 OR 조건 지원)

        Returns:
            0.0 ~ 1.0 (일치하는 필터 비율)
        """
        if not required_filters:
            return 1.0

        matched = 0
        total = len(required_filters)

        for key, expected_value in required_filters.items():
            actual_value = doc_metadata.get(key, '')

            # 빈값 체크
            if not actual_value or actual_value == '':
                continue

            # expected_value가 리스트인 경우 OR 조건 (하나라도 일치하면 매칭)
            if isinstance(expected_value, list):
                if str(actual_value) in [str(v) for v in expected_value]:
                    matched += 1
            else:
                # 단일 값인 경우 정확히 일치
                if str(actual_value) == str(expected_value):
                    matched += 1

        return matched / total if total > 0 else 0.0

    def search_by_category(
        self,
        mb_sn: str,
        category: str,
        query_embedding: List[float],
        metadata_filter: Dict[str, Any] = None,
        top_k: int = 5
    ) -> Optional[Dict[str, Any]]:
        """
        특정 패널의 특정 카테고리에서 단계적 완화 필터링 검색 (복수 값 OR 조건 지원)

        1단계: 모든 메타데이터 필터 적용 (리스트는 OR 조건)
        2단계: 부분 매칭 (일부 메타데이터만 일치, 모든 필터 키가 존재해야 함)
        ** 3단계 제거: topic만으로 검색하면 빈 메타데이터도 반환되므로 제거 **

        예시:
            metadata_filter = {"지역": ["서울", "경기"], "성별": "남"}
            → WHERE topic="인구" AND (지역="서울" OR 지역="경기") AND 성별="남"
        """
        topic = self.category_config.get(category, {}).get("pinecone_topic", category)
        collection_name = f"panel_{mb_sn}".replace("-", "_")
        persist_directory = os.path.join(self.chroma_base_dir, collection_name)

        if not os.path.exists(persist_directory):
            return None

        vectorstore = None
        try:
            vectorstore = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                persist_directory=persist_directory
            )

            # ===== 1단계: 엄격한 필터링 (모든 메타데이터 일치, 리스트는 OR 조건) =====
            if metadata_filter:
                filter_conditions = [{"topic": topic}]
                for key, value in metadata_filter.items():
                    if value:
                        # 리스트는 OR 조건으로, 단일 값은 그대로 추가
                        condition = self._build_filter_condition(key, value)
                        filter_conditions.append(condition)
                where_filter = {"$and": filter_conditions}
            else:
                where_filter = {"topic": topic}

            results = vectorstore.similarity_search_by_vector_with_relevance_scores(
                embedding=query_embedding,
                k=top_k * 10,
                filter=where_filter
            )

            # 무응답 제외
            valid_results = []
            for doc, score in results:
                if not self._is_no_response(doc.page_content):
                    valid_results.append((doc, score))

            # 1단계 성공
            if valid_results:
                best_doc, best_score = valid_results[0]
                return {
                    "mb_sn": mb_sn,
                    "category": category,
                    "topic": best_doc.metadata.get("topic"),
                    "score": float(best_score),
                    "metadata": best_doc.metadata,
                    "text": best_doc.page_content[:200],
                    "filter_level": "strict"
                }

            # ===== 2단계: 부분 매칭 (topic만 필터링 후 후처리, 모든 필터 키 존재 필수) =====
            if metadata_filter:
                results = vectorstore.similarity_search_by_vector_with_relevance_scores(
                    embedding=query_embedding,
                    k=top_k * 20,
                    filter={"topic": topic}
                )

                # 부분 매칭 + 무응답 제외 + 모든 필터 키 존재 확인
                partial_results = []
                required_keys = list(metadata_filter.keys())
                
                for doc, score in results:
                    if self._is_no_response(doc.page_content):
                        continue
                    
                    # ⭐ 핵심 수정: 모든 필터 키가 존재하고 값이 있어야 함
                    # 예: {"결혼여부": "기혼"} 필터인데 문서에 "결혼여부" 키가 없으면 제외
                    if not self._has_all_required_keys(doc.metadata, required_keys):
                        continue

                    match_score = self._partial_match_score(doc.metadata, metadata_filter)
                    if match_score > 0:  # 최소 1개 이상 일치
                        # 스코어 = 유사도 * 부분매칭비율
                        combined_score = score * (0.5 + 0.5 * match_score)
                        partial_results.append((doc, combined_score, match_score))

                # 부분 매칭 스코어로 정렬
                partial_results.sort(key=lambda x: x[1], reverse=True)

                if partial_results:
                    best_doc, combined_score, match_ratio = partial_results[0]
                    return {
                        "mb_sn": mb_sn,
                        "category": category,
                        "topic": best_doc.metadata.get("topic"),
                        "score": float(combined_score),
                        "metadata": best_doc.metadata,
                        "text": best_doc.page_content[:200],
                        "filter_level": "partial",
                        "match_ratio": match_ratio
                    }

            # ⭐ 3단계 제거: 메타데이터 필터가 있는 경우 topic만으로 검색하지 않음
            # 이유: 빈 메타데이터 패널도 반환되어 검색 품질이 떨어짐
            
            return None

        except Exception as e:
            logger.error(f"ChromaDB 검색 오류 (mb_sn={mb_sn}, category={category}): {e}")
            return None
        finally:
            if vectorstore is not None:
                try:
                    if hasattr(vectorstore, '_client'):
                        vectorstore._client = None
                    del vectorstore
                except:
                    pass


