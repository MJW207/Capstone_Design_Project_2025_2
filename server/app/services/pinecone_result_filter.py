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
        final_count: int = None,  # ⭐ None일 경우 전체 반환
        topic_filters: Dict[str, Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        카테고리 순서대로 단계적으로 필터링하여 최종 mb_sn 리스트 반환

        Args:
            embeddings: {"카테고리명": [임베딩 벡터]}
            category_order: 카테고리 순서 (예: ["기본정보", "직업소득", "자동차"])
            final_count: 최종 출력할 mb_sn 개수 (None이면 조건 만족하는 전체 반환)
            topic_filters: topic별 메타데이터 필터 (예: {"기본정보": {...}, "직업소득": {...}})

        Returns:
            최종 선별된 mb_sn 리스트
        """
        if not category_order:
            return []

        filter_start = time.time()
        logger.info(f"\n[Pinecone 필터링 시작]")
        logger.info(f"   카테고리 순서: {category_order}")
        if final_count is None:
            logger.info(f"   최종 반환 개수: 전체 (명수 미명시)")
        else:
            logger.info(f"   최종 반환 개수: {final_count}개")

        # 첫 번째 카테고리로 초기 선별
        first_category = category_order[0]
        first_embedding = embeddings.get(first_category)

        if first_embedding is None:
            return []

        # 🎯 첫 번째 카테고리의 메타데이터 필터 가져오기
        first_filter = (topic_filters or {}).get(first_category, {})
        has_metadata_filter = bool(first_filter)

        if first_filter:
            logger.info(f"\n[1단계] {first_category} 카테고리 검색 (메타데이터 필터 적용)")
            logger.info(f"   필터: {first_filter}")
        else:
            logger.info(f"\n[1단계] {first_category} 카테고리 검색 (필터 없음)")

        # ⭐ 초기 검색 수 결정 - final_count가 None이면 큰 수로 설정
        # ⚠️ Pinecone 제한: top_k는 최대 10000, 노트북과 동일하게 최소 10000개 검색 보장
        MAX_TOP_K = 10000  # Pinecone 최대 제한
        
        if final_count is None:
            # 명수 미명시
            if has_metadata_filter:
                initial_count = MAX_TOP_K  # 메타데이터 필터 있으면 충분히 큰 수로
                logger.info(f"   [명수 미명시 + 필터 O] 메타데이터 조건 만족하는 모든 패널 검색 (최대 {initial_count}개)")
            else:
                initial_count = MAX_TOP_K  # 필터 없으면 적당한 수
                logger.info(f"   [명수 미명시 + 필터 X] 벡터 유사도 높은 상위 {initial_count}개 검색")
        else:
            # 명수 명시됨
            # ⭐ 메타데이터 필터가 있으면 모든 후보 확보, 없으면 제한적으로
            if has_metadata_filter:
                initial_count = MAX_TOP_K  # 메타데이터 필터 O → 조건 만족하는 모든 패널 검색
                logger.info(f"   [명수 명시: {final_count}명 + 필터 O] 메타데이터 조건 만족하는 모든 패널 검색 (최대 {initial_count}개)")
            else:
                # 메타데이터 필터 X → 여유있게, 노트북과 동일하게 최소 10000개 보장
                initial_count = max(final_count * 10, MAX_TOP_K)
                logger.info(f"   [명수 명시: {final_count}명 + 필터 X] 여유있게 {initial_count}개 검색")

        first_results = self.searcher.search_by_category(
            query_embedding=first_embedding,
            category=first_category,
            top_k=initial_count,
            filter_mb_sns=None,  # 첫 단계는 전체 검색
            metadata_filter=first_filter
        )

        # ⭐ 메타데이터 필터 사용 시 - 모든 결과를 후보로 (후보 다잡기)
        if has_metadata_filter:
            candidate_mb_sns = list(set([r["mb_sn"] for r in first_results if r.get("mb_sn")]))
            logger.info(f"   -> [메타데이터 필터] {len(candidate_mb_sns)}개 후보 확보 (조건 만족하는 전체)")
        else:
            # 필터 없을 때
            mb_sn_scores = {}
            for r in first_results:
                mb_sn = r.get("mb_sn", "")
                if mb_sn:
                    score = r.get("score", 0.0)
                    if mb_sn not in mb_sn_scores or score > mb_sn_scores[mb_sn]:
                        mb_sn_scores[mb_sn] = score
            
            if final_count is None:
                # 명수도 없고 필터도 없으면 검색된 전체 사용
                candidate_mb_sns = list(set([r["mb_sn"] for r in first_results if r.get("mb_sn")]))
            else:
                # 명수 있고 필터 없으면 여유있게
                candidate_mb_sns = list(set([r["mb_sn"] for r in first_results[:max(final_count * 10, 10000)] if r.get("mb_sn")]))
            logger.info(f"   -> [필터 없음] {len(candidate_mb_sns)}개 후보 선별")

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
            has_category_filter = bool(category_filter)

            if category_filter:
                logger.info(f"\n[{i}단계] {category} 카테고리로 재필터링 (메타데이터 필터 적용)")
                logger.info(f"   필터: {category_filter}")
            else:
                logger.info(f"\n[{i}단계] {category} 카테고리로 재필터링 (필터 없음)")

            # 후보가 비어있으면 필터링 중단
            if len(candidate_mb_sns) == 0:
                break

            # 후보 수에 따라 검색 수 결정
            # ⚠️ Pinecone 제한: top_k는 최대 10000, 노트북과 동일하게 최대 10000개 검색
            MAX_TOP_K = 10000  # Pinecone 최대 제한
            
            if final_count is None and has_category_filter:
                # 명수 미명시 + 메타데이터 필터 O → 충분히 큰 수
                search_count = min(len(candidate_mb_sns) * 3, MAX_TOP_K)
            else:
                # 명수 명시 or 필터 없음 → 적당히
                search_count = min(len(candidate_mb_sns) * 2, MAX_TOP_K)

            search_count = max(search_count, 1)

            results = self.searcher.search_by_category(
                query_embedding=embedding,
                category=category,
                top_k=search_count,
                filter_mb_sns=candidate_mb_sns,  # 이전 단계에서 선별된 mb_sn들로 제한
                metadata_filter=category_filter
            )

            # ⭐ 메타데이터 필터 여부에 따라 다른 전략
            if has_category_filter:
                # 메타데이터 필터 O → 모든 결과 유지 (후보 다잡기)
                filtered_mb_sns = set([r["mb_sn"] for r in results if r.get("mb_sn") in candidate_mb_sns])
                
                # mb_sn별 최고 점수로 정렬
                mb_sn_scores = {}
                for r in results:
                    mb_sn = r.get("mb_sn", "")
                    if mb_sn in filtered_mb_sns:
                        if mb_sn not in mb_sn_scores or r.get("score", 0.0) > mb_sn_scores[mb_sn]:
                            mb_sn_scores[mb_sn] = r.get("score", 0.0)
                
                sorted_mb_sns = sorted(mb_sn_scores.items(), key=lambda x: x[1], reverse=True)
                candidate_mb_sns = [mb_sn for mb_sn, score in sorted_mb_sns]
                
                logger.info(f"   -> [메타데이터 필터] {len(candidate_mb_sns)}개 후보 유지 (조건 만족하는 전체)")
            else:
                # 메타데이터 필터 X → 벡터 유사도 기반 상위 선별
                mb_sn_scores = {}
                for r in results:
                    mb_sn = r.get("mb_sn", "")
                    if mb_sn in candidate_mb_sns:
                        if mb_sn not in mb_sn_scores or r.get("score", 0.0) > mb_sn_scores[mb_sn]:
                            mb_sn_scores[mb_sn] = r.get("score", 0.0)

                sorted_mb_sns = sorted(mb_sn_scores.items(), key=lambda x: x[1], reverse=True)
                
                # 다음 단계를 위한 후보 수 결정
                # ⚠️ Pinecone 제한: top_k는 최대 10000, 노트북과 동일하게 최소 10000개 보장
                MAX_TOP_K = 10000  # Pinecone 최대 제한
                
                if final_count is None:
                    # 명수 미명시 → 전체 유지
                    next_candidate_count = len(sorted_mb_sns)
                else:
                    # 명수 명시 → 여유있게, 노트북과 동일하게 최소 10000개 보장
                    next_candidate_count = max(final_count * 3, MAX_TOP_K)
                
                candidate_mb_sns = [mb_sn for mb_sn, score in sorted_mb_sns[:next_candidate_count]]
                logger.info(f"   -> [필터 없음] {len(candidate_mb_sns)}개 후보 선별")

        # ⭐ 최종 결과 반환 (mb_sn과 score 함께 반환)
        # 모든 카테고리 점수의 평균을 사용 (더 합리적인 방식)
        final_mb_sn_scores = {}  # {mb_sn: [점수1, 점수2, ...]}
        final_mb_sn_avg_scores = {}  # {mb_sn: 평균점수}
        
        # 첫 번째 카테고리 결과에서 점수 수집
        for r in first_results:
            mb_sn = r.get("mb_sn", "")
            if mb_sn in candidate_mb_sns:
                score = r.get("score", 0.0)
                if mb_sn not in final_mb_sn_scores:
                    final_mb_sn_scores[mb_sn] = []
                final_mb_sn_scores[mb_sn].append(score)
        
        # 나머지 카테고리 결과에서도 점수 수집
        for i, category in enumerate(category_order[1:], start=2):
            embedding = embeddings.get(category)
            if embedding is None:
                continue
            
            category_filter = (topic_filters or {}).get(category, {})
            has_category_filter = bool(category_filter)
            
            if len(candidate_mb_sns) == 0:
                break
            
            MAX_TOP_K = 10000
            if final_count is None and has_category_filter:
                search_count = min(len(candidate_mb_sns) * 3, MAX_TOP_K)
            else:
                search_count = min(len(candidate_mb_sns) * 2, MAX_TOP_K)
            search_count = max(search_count, 1)
            
            results = self.searcher.search_by_category(
                query_embedding=embedding,
                category=category,
                top_k=search_count,
                filter_mb_sns=candidate_mb_sns,
                metadata_filter=category_filter if has_category_filter else None
            )
            
            # 점수 수집 (모든 카테고리 점수 누적)
            for r in results:
                mb_sn = r.get("mb_sn", "")
                if mb_sn in candidate_mb_sns:
                    score = r.get("score", 0.0)
                    if mb_sn not in final_mb_sn_scores:
                        final_mb_sn_scores[mb_sn] = []
                    final_mb_sn_scores[mb_sn].append(score)
        
        # 각 mb_sn의 평균 점수 계산
        for mb_sn, scores in final_mb_sn_scores.items():
            if scores:
                avg_score = sum(scores) / len(scores)
                final_mb_sn_avg_scores[mb_sn] = avg_score
            else:
                final_mb_sn_avg_scores[mb_sn] = 0.0
        
        # ⭐ 평균 점수 기준으로 정렬 (유사도 높은 순서대로)
        sorted_results = sorted(
            [(mb_sn, final_mb_sn_avg_scores.get(mb_sn, 0.0)) for mb_sn in candidate_mb_sns],
            key=lambda x: x[1],
            reverse=True  # 내림차순 (높은 점수부터)
        )
        
        # 디버그: 상위 5개 점수 로깅 (인원수 지정된 경우)
        if final_count is not None and sorted_results:
            top_scores = [score for _, score in sorted_results[:min(5, len(sorted_results))]]
            top_mb_sns = [mb_sn for mb_sn, _ in sorted_results[:min(5, len(sorted_results))]]
            logger.info(f"   [정렬 확인] 상위 5개 평균 유사도 점수: {top_scores}")
            # 각 mb_sn의 카테고리별 점수도 로깅
            for mb_sn in top_mb_sns[:3]:  # 상위 3개만 상세 로깅
                scores = final_mb_sn_scores.get(mb_sn, [])
                logger.info(f"      - {mb_sn}: 카테고리별 점수 {scores} → 평균 {final_mb_sn_avg_scores.get(mb_sn, 0.0):.4f}")
        
        if final_count is None:
            # 명수 미명시 - 모든 후보 반환 (벡터 유사도로 정렬됨)
            final_results = [{"mb_sn": mb_sn, "score": score} for mb_sn, score in sorted_results]
            logger.info(f"\n✅ 최종 {len(final_results)}개 패널 선별 완료 (조건 만족하는 전체 반환, 유사도 순 정렬)")
        else:
            # 명수 명시 - 지정된 개수만 반환 (상위 유사도 패널만)
            final_results = [{"mb_sn": mb_sn, "score": score} for mb_sn, score in sorted_results[:final_count]]
            logger.info(f"\n✅ 최종 {len(final_results)}개 패널 선별 완료 ({final_count}명 요청, 상위 유사도 순)")
        
        total_time = time.time() - filter_start
        logger.info(f"[Pinecone 필터링 완료] 총 소요 시간: {total_time:.2f}초")
        logger.info("=" * 80)

        return final_results

