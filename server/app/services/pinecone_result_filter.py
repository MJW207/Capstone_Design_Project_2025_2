"""Pinecone 결과 필터"""
from typing import Dict, List, Any
import logging
import time

logger = logging.getLogger(__name__)


class PineconeResultFilter:
    """카테고리 순서에 따라 단계적으로 mb_sn을 필터링 (Pinecone 최적화)"""

    def __init__(self, pinecone_searcher):
        self.searcher = pinecone_searcher

    def filter_by_categories(
        self,
        embeddings: Dict[str, List[float]],
        category_order: List[str],
        final_count: int,
        topic_filters: Dict[str, Dict[str, Any]] = None
    ) -> List[str]:
        """
        카테고리 순서대로 단계적으로 필터링하여 최종 mb_sn 리스트 반환

        Args:
            embeddings: {"카테고리명": [임베딩 벡터]}
            category_order: 카테고리 순서 (예: ["기본정보", "직업소득", "자동차"])
            final_count: 최종 출력할 mb_sn 개수
            topic_filters: topic별 메타데이터 필터 (예: {"기본정보": {...}, "직업소득": {...}})

        Returns:
            최종 선별된 mb_sn 리스트
        """
        if not category_order:
            return []

        filter_start = time.time()
        logger.info(f"\n[Pinecone 필터링 시작]")
        logger.info(f"   카테고리 순서: {category_order}")
        logger.info(f"   최종 반환 개수: {final_count}개")

        # 첫 번째 카테고리로 초기 선별
        first_category = category_order[0]
        first_embedding = embeddings.get(first_category)

        if first_embedding is None:
            return []

        # 🎯 첫 번째 카테고리의 메타데이터 필터 가져오기
        first_filter = (topic_filters or {}).get(first_category, {})

        if first_filter:
            logger.info(f"\n[1단계] {first_category} 카테고리 검색 (메타데이터 필터 적용)")
            logger.info(f"   필터: {first_filter}")
        else:
            logger.info(f"\n[1단계] {first_category} 카테고리 검색 (필터 없음)")

        # 초기 검색 수 결정
        initial_count = max(final_count * 10, 100)

        first_results = self.searcher.search_by_category(
            query_embedding=first_embedding,
            category=first_category,
            top_k=initial_count,
            filter_mb_sns=None,  # 첫 단계는 전체 검색
            metadata_filter=first_filter
        )

        # 첫 번째 카테고리에서 선별된 mb_sn 추출 및 점수 집계
        mb_sn_scores = {}
        for r in first_results:
            mb_sn = r.get("mb_sn", "")
            if mb_sn:
                score = r.get("score", 0.0)
                if mb_sn not in mb_sn_scores or score > mb_sn_scores[mb_sn]:
                    mb_sn_scores[mb_sn] = score

        candidate_mb_sns = list(mb_sn_scores.keys())
        logger.info(f"   -> {len(candidate_mb_sns)}개 후보 선별")

        # 후보가 없으면 빈 리스트 반환
        if len(candidate_mb_sns) == 0:
            return []

        # 나머지 카테고리로 점진적 필터링
        for i, category in enumerate(category_order[1:], start=2):
            embedding = embeddings.get(category)

            if embedding is None:
                continue

            # 🎯 현재 카테고리의 메타데이터 필터 가져오기
            category_filter = (topic_filters or {}).get(category, {})

            if category_filter:
                logger.info(f"\n[{i}단계] {category} 카테고리로 재필터링 (메타데이터 필터 적용)")
                logger.info(f"   필터: {category_filter}")
            else:
                logger.info(f"\n[{i}단계] {category} 카테고리로 재필터링 (필터 없음)")

            # 후보가 비어있으면 필터링 중단
            if len(candidate_mb_sns) == 0:
                break

            # 검색 수 결정 (후보 수의 2배 또는 최대 1000개)
            search_count = min(len(candidate_mb_sns) * 2, 1000)
            search_count = max(search_count, 1)

            results = self.searcher.search_by_category(
                query_embedding=embedding,
                category=category,
                top_k=search_count,
                filter_mb_sns=candidate_mb_sns,  # 이전 단계에서 선별된 mb_sn들로 제한
                metadata_filter=category_filter
            )

            # mb_sn별 최고 점수 집계 (누적 점수)
            new_scores = {}
            for r in results:
                mb_sn = r.get("mb_sn", "")
                if mb_sn in candidate_mb_sns:
                    score = r.get("score", 0.0)
                    prev_score = mb_sn_scores.get(mb_sn, 0.0)
                    new_scores[mb_sn] = prev_score + score

            # 점수 순으로 정렬하여 상위 후보 선별
            sorted_mb_sns = sorted(new_scores.items(), key=lambda x: x[1], reverse=True)

            # 다음 단계를 위한 후보 수 결정
            next_candidate_count = max(final_count * 3, 30)
            candidate_mb_sns = [mb_sn for mb_sn, score in sorted_mb_sns[:next_candidate_count]]
            mb_sn_scores = dict(sorted_mb_sns[:next_candidate_count])

            logger.info(f"   -> {len(candidate_mb_sns)}개 후보 선별")

        # 최종 결과 반환
        final_mb_sns = candidate_mb_sns[:final_count]
        total_time = time.time() - filter_start

        logger.info(f"\n[Pinecone 필터링 완료] 총 소요 시간: {total_time:.2f}초, 최종 결과: {len(final_mb_sns)}개")
        logger.info("=" * 80)

        return final_mb_sns

