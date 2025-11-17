"""결과 필터"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Any
import gc
import logging
import time

logger = logging.getLogger(__name__)


class ResultFilter:
    """단계적 필터링으로 최종 후보 선별 (병렬 검색 최적화)"""

    def __init__(self, searcher, max_workers: int = 10):
        """
        Args:
            searcher: ChromaPanelSearcher 인스턴스
            max_workers: 병렬 작업자 수 (기본값 10으로 증가)
        """
        self.searcher = searcher
        self.max_workers = max_workers

    def filter_by_categories(
        self,
        available_panels: List[str],
        category_embeddings: Dict[str, List[float]],
        category_filters: Dict[str, Dict[str, Any]],
        category_order: List[str],
        final_count: int = 10
    ) -> List[str]:
        """
        단계적 필터링 (병렬 검색)

        Args:
            available_panels: 검색 대상 패널 리스트
            category_embeddings: 카테고리별 임베딩
            category_filters: 카테고리별 메타데이터 필터
            category_order: 카테고리 적용 순서
            final_count: 최종 반환 개수

        Returns:
            최종 선별된 mb_sn 리스트
        """
        filter_start = time.time()
        logger.info(f"\n[필터링 시작] 병렬 검색 활성화, workers={self.max_workers}")
        logger.info(f"   초기 후보 (전체): {len(available_panels)}개")
        logger.info(f"   카테고리 순서: {category_order}")
        logger.info(f"   최종 반환 개수: {final_count}개")

        # 초기 후보를 100개로 제한
        max_initial_panels = 100
        if len(available_panels) > max_initial_panels:
            available_panels = available_panels[:max_initial_panels]
            logger.info(f"   초기 후보 제한: {len(available_panels)}개로 축소")
        else:
            logger.info(f"   초기 후보: {len(available_panels)}개 (전체 사용)")

        # 1단계: 첫 번째 카테고리로 초기 후보 선별 (병렬 검색)
        step_start = time.time()
        first_category = category_order[0]
        first_embedding = category_embeddings[first_category]
        first_filter = category_filters.get(first_category, {})

        logger.info(f"[1단계] {first_category} 카테고리로 검색 시작 (병렬, {len(available_panels)}개 패널)")
        logger.info(f"   메타데이터 필터: {first_filter}")
        
        candidate_scores = {}
        completed_count = 0

        # 병렬 검색 실행
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_mb_sn = {
                executor.submit(
                    self.searcher.search_by_category,
                    mb_sn,
                    first_category,
                    first_embedding,
                    first_filter,
                    1
                ): mb_sn
                for mb_sn in available_panels
            }

            for future in as_completed(future_to_mb_sn):
                mb_sn = future_to_mb_sn[future]
                completed_count += 1
                if completed_count % 50 == 0:
                    logger.debug(f"   진행률: {completed_count}/{len(available_panels)} ({completed_count*100//len(available_panels)}%)")
                try:
                    result = future.result()
                    if result:
                        candidate_scores[mb_sn] = result["score"]
                except Exception as e:
                    logger.debug(f"검색 실패 (mb_sn={mb_sn}): {e}")

        step_time = time.time() - step_start
        logger.info(f"[1단계 완료] {step_time:.2f}초, 매칭된 패널: {len(candidate_scores)}개")

        # ⭐ 가비지 컬렉션으로 메모리 정리
        gc.collect()

        # 상위 100개만 선택 (더 빠른 처리)
        candidates = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)[:100]
        candidate_mb_sns = [mb_sn for mb_sn, _ in candidates]

        logger.info(f"   -> {len(candidate_mb_sns)}개 후보 선별")

        # 2단계 이후: 순차적으로 필터링 (병렬 검색)
        for step, category in enumerate(category_order[1:], 2):
            if category not in category_embeddings:
                continue

            step_start = time.time()
            logger.info(f"\n[{step}단계] {category} 카테고리로 필터링 시작 (병렬, {len(candidate_mb_sns)}개 후보)")
            embedding = category_embeddings[category]
            cat_filter = category_filters.get(category, {})
            logger.info(f"   메타데이터 필터: {cat_filter}")

            new_scores = {}
            completed_count = 0

            # 병렬 검색 실행
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                future_to_mb_sn = {
                    executor.submit(
                        self.searcher.search_by_category,
                        mb_sn,
                        category,
                        embedding,
                        cat_filter,
                        1
                    ): mb_sn
                    for mb_sn in candidate_mb_sns
                }

                for future in as_completed(future_to_mb_sn):
                    mb_sn = future_to_mb_sn[future]
                    completed_count += 1
                    if completed_count % 20 == 0:
                        logger.debug(f"   진행률: {completed_count}/{len(candidate_mb_sns)} ({completed_count*100//len(candidate_mb_sns)}%)")
                    try:
                        result = future.result()
                        if result:
                            prev_score = candidate_scores.get(mb_sn, 0)
                            new_scores[mb_sn] = prev_score + result["score"]
                    except Exception as e:
                        logger.debug(f"검색 실패 (mb_sn={mb_sn}): {e}")

            step_time = time.time() - step_start
            logger.info(f"[{step}단계 완료] {step_time:.2f}초, 매칭된 패널: {len(new_scores)}개")

            # ⭐ 가비지 컬렉션
            gc.collect()

            candidates = sorted(new_scores.items(), key=lambda x: x[1], reverse=True)[:final_count * 3]
            candidate_mb_sns = [mb_sn for mb_sn, _ in candidates]
            candidate_scores = dict(candidates)

            logger.info(f"   -> {len(candidate_mb_sns)}개 후보로 축소")

        final_mb_sns = candidate_mb_sns[:final_count]
        total_time = time.time() - filter_start

        logger.info(f"\n[필터링 완료] 총 소요 시간: {total_time:.2f}초")
        logger.info(f"   최종 선별된 패널: {len(final_mb_sns)}개 (요청: {final_count}개)")
        if len(final_mb_sns) != final_count:
            logger.warning(f"   ⚠️ 요청한 개수({final_count}개)와 다름: {len(final_mb_sns)}개")

        return final_mb_sns

