"""ChromaDB 검색 파이프라인"""
from typing import List, Dict, Any
import logging
import time

from .metadata_extractor import MetadataExtractor
from .metadata_filter_extractor import MetadataFilterExtractor
from .category_classifier import CategoryClassifier
from .text_generator import CategoryTextGenerator
from .embedding_generator import EmbeddingGenerator
from .chroma_searcher import ChromaPanelSearcher
from .result_filter import ResultFilter

logger = logging.getLogger(__name__)


class PanelSearchPipeline:
    """전체 검색 파이프라인 (LLM 기반 메타데이터 필터 적용)"""

    def __init__(
        self,
        chroma_base_dir: str,
        category_config: Dict[str, Any],
        anthropic_api_key: str,
        upstage_api_key: str
    ):
        """
        Args:
            chroma_base_dir: ChromaDB 데이터베이스 경로
            category_config: 카테고리 설정 딕셔너리
            anthropic_api_key: Anthropic API 키
            upstage_api_key: Upstage API 키
        """
        self.metadata_extractor = MetadataExtractor(anthropic_api_key)
        self.filter_extractor = MetadataFilterExtractor()
        self.category_classifier = CategoryClassifier(category_config, anthropic_api_key)
        self.text_generator = CategoryTextGenerator(anthropic_api_key)
        self.embedding_generator = EmbeddingGenerator(upstage_api_key)
        self.searcher = ChromaPanelSearcher(chroma_base_dir, category_config, upstage_api_key)
        self.result_filter = ResultFilter(self.searcher)

    def search(self, query: str, top_k: int = 10) -> List[str]:
        """
        자연어 쿼리로 패널 검색

        Args:
            query: 검색 쿼리 (예: "서울 20대 남자")
            top_k: 반환할 패널 수

        Returns:
            mb_sn 리스트
        """
        start_time = time.time()
        logger.info(f"[검색 시작] 쿼리: '{query}', top_k: {top_k}")

        # 1단계: 메타데이터 추출
        step_start = time.time()
        logger.info("[1단계] 메타데이터 추출 시작")
        try:
            metadata = self.metadata_extractor.extract(query)
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
            classified = self.category_classifier.classify(metadata)
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
                available_panels = self.searcher.get_available_panels()
                logger.info(f"[폴백 검색] 검색 가능한 패널: {len(available_panels)}개")
                
                # 초기 후보를 50개로 제한 (성능 향상)
                max_initial_panels = 50
                if len(available_panels) > max_initial_panels:
                    available_panels = available_panels[:max_initial_panels]
                    logger.info(f"[폴백 검색] 초기 후보 제한: {max_initial_panels}개")
                
                # 첫 번째 카테고리만 사용 (가장 일반적인 카테고리)
                all_categories = list(self.searcher.category_config.keys())
                if not all_categories:
                    logger.warning("[폴백 검색] 카테고리 설정이 없음")
                    return []
                
                primary_category = all_categories[0]  # 첫 번째 카테고리만 사용
                logger.info(f"[폴백 검색] 검색할 카테고리: {primary_category}")
                
                panel_scores = {}  # mb_sn -> 최고 점수
                
                from concurrent.futures import ThreadPoolExecutor, as_completed
                with ThreadPoolExecutor(max_workers=min(len(available_panels), 10)) as executor:
                    futures = {
                        executor.submit(
                            self.searcher.search_by_category,
                            mb_sn,
                            primary_category,
                            embedding,
                            None,  # 메타데이터 필터 없음
                            1  # top_k=1
                        ): mb_sn
                        for mb_sn in available_panels
                    }
                    
                    for future in as_completed(futures):
                        mb_sn = futures[future]
                        try:
                            result = future.result(timeout=3.0)
                            if result and result.get("score"):
                                score = result["score"]
                                panel_scores[mb_sn] = score
                        except Exception as e:
                            logger.debug(f"[폴백 검색] 검색 실패 (mb_sn={mb_sn}): {e}")
                            continue
                
                # 점수 순으로 정렬하여 상위 top_k개 반환
                sorted_panels = sorted(panel_scores.items(), key=lambda x: x[1], reverse=True)
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
        for category in classified.keys():
            cat_filter = self.filter_extractor.extract_filters(metadata, category)
            if cat_filter:
                category_filters[category] = cat_filter
        step_time = time.time() - step_start
        logger.info(f"[2.5단계 완료] 필터 추출: {step_time:.2f}초, 결과: {category_filters}")

        # 3단계: 자연어 텍스트 생성 (병렬 처리)
        step_start = time.time()
        logger.info("[3단계] 자연어 텍스트 생성 시작 (병렬)")
        texts = {}
        
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
        available_panels = self.searcher.get_available_panels()
        logger.info(f"[5단계] 검색 가능한 패널: {len(available_panels)}개")

        category_order = list(embeddings.keys())
        final_mb_sns = self.result_filter.filter_by_categories(
            available_panels=available_panels,
            category_embeddings=embeddings,
            category_filters=category_filters,
            category_order=category_order,
            final_count=top_k
        )
        step_time = time.time() - step_start
        logger.info(f"[5단계 완료] 단계적 필터링: {step_time:.2f}초, 최종 결과: {len(final_mb_sns)}개")

        total_time = time.time() - start_time
        logger.info(f"[검색 완료] 총 소요 시간: {total_time:.2f}초, 결과: {len(final_mb_sns)}개 패널")

        return final_mb_sns

