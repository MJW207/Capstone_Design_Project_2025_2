"""Pinecone 검색 파이프라인"""
from typing import List, Dict, Any, Optional
import logging
import time

from .metadata_extractor import MetadataExtractor
from .metadata_filter_extractor import MetadataFilterExtractor
from .category_classifier import CategoryClassifier
from .text_generator import CategoryTextGenerator
from .embedding_generator import EmbeddingGenerator
from .pinecone_searcher import PineconePanelSearcher
from .pinecone_result_filter import PineconeResultFilter

logger = logging.getLogger(__name__)


class PanelSearchPipeline:
    """전체 검색 파이프라인 (Pinecone + LLM 기반 메타데이터 필터)"""

    def __init__(
        self,
        pinecone_api_key: str,
        pinecone_index_name: str,
        category_config: Dict[str, Any],
        anthropic_api_key: str,
        upstage_api_key: str
    ):
        """
        Args:
            pinecone_api_key: Pinecone API 키
            pinecone_index_name: Pinecone 인덱스 이름
            category_config: 카테고리 설정 딕셔너리
            anthropic_api_key: Anthropic API 키
            upstage_api_key: Upstage API 키
        """
        self.metadata_extractor = MetadataExtractor(anthropic_api_key)
        self.filter_extractor = MetadataFilterExtractor()
        self.category_classifier = CategoryClassifier(category_config, anthropic_api_key)
        self.text_generator = CategoryTextGenerator(anthropic_api_key)
        self.embedding_generator = EmbeddingGenerator(upstage_api_key)
        self.searcher = PineconePanelSearcher(pinecone_api_key, pinecone_index_name, category_config)
        self.result_filter = PineconeResultFilter(self.searcher)

    def search(self, query: str, top_k: int = 10, external_filters: Optional[Dict[str, Dict[str, Any]]] = None) -> List[str]:
        """
        자연어 쿼리로 패널 검색

        Args:
            query: 검색 쿼리 (예: "서울 20대 남자")
            top_k: 반환할 패널 수
            external_filters: 외부 필터 (카테고리별 Pinecone 필터)
                예: {"기본정보": {"지역": {"$in": ["서울"]}}, "직업소득": {...}}

        Returns:
            mb_sn 리스트
        """
        start_time = time.time()
        logger.info(f"[검색 시작] 쿼리: '{query}', top_k: {top_k}, 외부 필터: {bool(external_filters)}")

        # 빈 쿼리이고 외부 필터만 있는 경우
        if (not query or not query.strip()) and external_filters:
            logger.info("[검색] 빈 쿼리, 외부 필터만으로 검색")
            # 필터만으로 검색 진행 (임베딩 생성 불필요)
            metadata = {}
            classified = {}
        else:
            # 1단계: 메타데이터 추출
            step_start = time.time()
            logger.info("[1단계] 메타데이터 추출 시작")
            try:
                if query and query.strip():
                    metadata = self.metadata_extractor.extract(query)
                else:
                    metadata = {}
                step_time = time.time() - step_start
                logger.info(f"[1단계 완료] 메타데이터 추출: {step_time:.2f}초, 결과: {metadata}")
            except Exception as e:
                logger.warning(f"[1단계 경고] 메타데이터 추출 실패 (계속 진행): {e}")
                metadata = {}  # 빈 메타데이터로 계속 진행
            
            if not metadata:
                logger.warning("[경고] 메타데이터가 비어있음, 기본 검색으로 진행")
                metadata = {}

        # 2단계: 카테고리 분류
        step_start = time.time()
        logger.info("[2단계] 카테고리 분류 시작")
        try:
            if metadata:
                classified = self.category_classifier.classify(metadata)
            else:
                # 메타데이터가 없으면 외부 필터의 카테고리 사용
                classified = external_filters.keys() if external_filters else {}
                if isinstance(classified, dict):
                    pass  # 이미 딕셔너리
                else:
                    # 리스트나 다른 타입이면 딕셔너리로 변환
                    classified = {cat: {} for cat in classified} if classified else {}
            step_time = time.time() - step_start
            logger.info(f"[2단계 완료] 카테고리 분류: {step_time:.2f}초, 결과: {classified}")
        except Exception as e:
            logger.warning(f"[2단계 경고] 카테고리 분류 실패 (계속 진행): {e}")
            classified = {}  # 빈 분류로 계속 진행
        
        if not classified:
            logger.warning("[경고] 카테고리가 비어있음, 쿼리 텍스트로 직접 검색 시도")
            # 메타데이터가 없을 때 쿼리 텍스트를 직접 임베딩하여 검색
            try:
                logger.info("[폴백 검색] 쿼리 텍스트를 직접 임베딩하여 검색")
                
                # 쿼리 텍스트를 직접 임베딩
                query_embedding = self.embedding_generator.generate({"query": query})
                if not query_embedding or "query" not in query_embedding:
                    logger.warning("[폴백 검색] 임베딩 생성 실패")
                    return []
                
                embedding = query_embedding["query"]
                
                # 첫 번째 카테고리만 사용 (가장 일반적인 카테고리)
                all_categories = list(self.searcher.category_config.keys())
                if not all_categories:
                    logger.warning("[폴백 검색] 카테고리 설정이 없음")
                    return []
                
                primary_category = all_categories[0]  # 첫 번째 카테고리만 사용
                logger.info(f"[폴백 검색] 검색할 카테고리: {primary_category}")
                
                # Pinecone 검색 (메타데이터 필터 없음)
                results = self.searcher.search_by_category(
                    query_embedding=embedding,
                    category=primary_category,
                    top_k=top_k * 10,  # 더 많이 가져와서 정렬
                    filter_mb_sns=None,  # 전체 검색
                    metadata_filter=None  # 필터 없음
                )
                
                # mb_sn 추출 및 점수 순 정렬
                mb_sn_scores = {}
                for r in results:
                    mb_sn = r.get("mb_sn", "")
                    if mb_sn:
                        score = r.get("score", 0.0)
                        if mb_sn not in mb_sn_scores or score > mb_sn_scores[mb_sn]:
                            mb_sn_scores[mb_sn] = score
                
                # 점수 순으로 정렬하여 상위 top_k개 반환
                sorted_panels = sorted(mb_sn_scores.items(), key=lambda x: x[1], reverse=True)
                final_mb_sns = [mb_sn for mb_sn, _ in sorted_panels[:top_k]]
                
                logger.info(f"[폴백 검색 완료] {len(final_mb_sns)}개 패널 발견")
                return final_mb_sns
                
            except Exception as e:
                logger.error(f"[폴백 검색 실패] {e}", exc_info=True)
                return []

        # 2.5단계: 카테고리별 메타데이터 필터 추출 및 정규화
        step_start = time.time()
        logger.info("[2.5단계] 카테고리별 메타데이터 필터 추출 시작")
        category_filters = {}
        
        # 외부 필터가 있으면 우선 사용 (프론트엔드 필터)
        if external_filters:
            logger.info(f"[2.5단계] 외부 필터 적용: {external_filters}")
            category_filters.update(external_filters)
        
        # 쿼리에서 추출한 메타데이터 필터 추가 (외부 필터와 병합)
        for category in classified.keys():
            if category not in category_filters:  # 외부 필터가 없을 때만 추가
                cat_filter = self.filter_extractor.extract_filters(metadata, category)
                if cat_filter:
                    category_filters[category] = cat_filter
            else:
                # 외부 필터와 병합 (외부 필터 우선)
                cat_filter = self.filter_extractor.extract_filters(metadata, category)
                if cat_filter:
                    # 외부 필터에 없는 키만 추가
                    for key, value in cat_filter.items():
                        if key not in category_filters[category]:
                            category_filters[category][key] = value
        
        step_time = time.time() - step_start
        logger.info(f"[2.5단계 완료] 필터 추출: {step_time:.2f}초, 결과: {category_filters}")

        # 3단계: 자연어 텍스트 생성 (병렬 처리)
        step_start = time.time()
        logger.info("[3단계] 자연어 텍스트 생성 시작 (병렬)")
        texts = {}
        
        # 빈 쿼리이고 외부 필터만 있는 경우 텍스트 생성 생략
        if (not query or not query.strip()) and external_filters and not classified:
            logger.info("[3단계] 빈 쿼리, 텍스트 생성 생략 (필터만 사용)")
            # 필터만으로 검색하기 위해 더미 텍스트 생성
            for category in external_filters.keys():
                texts[category] = ""  # 빈 텍스트
        elif classified:
            # 병렬 처리로 텍스트 생성
            from concurrent.futures import ThreadPoolExecutor, as_completed
            with ThreadPoolExecutor(max_workers=min(len(classified), 5)) as executor:
                futures = {
                    executor.submit(self.text_generator.generate, category, items): category
                    for category, items in classified.items()
                }
                
                for future in as_completed(futures):
                    category = futures[future]
                    text = future.result()
                    if text:
                        texts[category] = text
        
        step_time = time.time() - step_start
        logger.info(f"[3단계 완료] 텍스트 생성: {step_time:.2f}초, 카테고리 수: {len(texts)}")

        # 4단계: 임베딩 생성
        step_start = time.time()
        logger.info("[4단계] 임베딩 생성 시작")
        try:
            # 빈 텍스트가 있으면 랜덤 벡터 사용
            if any(not text for text in texts.values()):
                logger.info("[4단계] 빈 텍스트 감지, 랜덤 벡터 사용")
                import numpy as np
                dimension = 4096  # Upstage Solar embedding dimension
                random_vector = np.random.rand(dimension).astype(np.float32).tolist()
                norm = np.linalg.norm(random_vector)
                if norm > 0:
                    random_vector = (np.array(random_vector) / norm).tolist()
                
                embeddings = {}
                for category in texts.keys():
                    embeddings[category] = random_vector
            else:
                embeddings = self.embedding_generator.generate(texts)
            step_time = time.time() - step_start
            logger.info(f"[4단계 완료] 임베딩 생성: {step_time:.2f}초, 카테고리 수: {len(embeddings)}")
        except Exception as e:
            logger.warning(f"[4단계 경고] 임베딩 생성 실패 (계속 진행): {e}")
            embeddings = {}
        
        if not embeddings:
            logger.warning("[경고] 임베딩이 비어있음, 검색 불가")
            return []

        # 5단계: 단계적 필터링 검색
        step_start = time.time()
        logger.info("[5단계] 단계적 필터링 검색 시작")

        category_order = list(embeddings.keys())
        final_mb_sns = self.result_filter.filter_by_categories(
            embeddings=embeddings,
            category_order=category_order,
            final_count=top_k,
            topic_filters=category_filters
        )
        step_time = time.time() - step_start
        logger.info(f"[5단계 완료] 단계적 필터링: {step_time:.2f}초, 최종 결과: {len(final_mb_sns)}개")

        total_time = time.time() - start_time
        logger.info(f"[검색 완료] 총 소요 시간: {total_time:.2f}초, 결과: {len(final_mb_sns)}개 패널")

        return final_mb_sns

