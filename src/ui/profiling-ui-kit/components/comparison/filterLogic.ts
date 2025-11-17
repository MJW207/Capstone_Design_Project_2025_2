/**
 * 비교 분석 필터링 로직
 * "의미 있는 차이만 보기" 필터 및 차트별 제한
 */

import type { ContinuousComparison, BinaryComparison, CategoricalComparison } from './types';

export type ComparisonResult = ContinuousComparison | BinaryComparison | CategoricalComparison;

/**
 * "의미 있는 차이만 보기" 필터
 */
export function filterSignificantDifferences(
  results: ComparisonResult[],
  chartType: 'continuous' | 'binary'
): ComparisonResult[] {
  return results.filter(result => {
    if (chartType === 'continuous') {
      // 연속형: Cohen's d >= 0.3
      const continuous = result as ContinuousComparison;
      return Math.abs(continuous.cohens_d || 0) >= 0.3;
    } else {
      // 이진형: abs_diff_pct >= 3 또는 lift_pct >= 20
      const binary = result as BinaryComparison;
      const absDiff = Math.abs(binary.abs_diff_pct || 0);
      const liftPct = Math.abs(binary.lift_pct || 0);
      return absDiff >= 3 || liftPct >= 20;
    }
  });
}

/**
 * 차트별 최대 표시 개수 제한
 */
export function limitByChart(
  results: ComparisonResult[],
  chartType: 'side-by-side' | 'heatmap' | 'stacked-bar' | 'index-dot'
): ComparisonResult[] {
  const limits = {
    'side-by-side': 7,
    'heatmap': 12,
    'stacked-bar': Infinity,  // 제한 없음
    'index-dot': Infinity     // 제한 없음
  };
  
  const limit = limits[chartType];
  if (limit === Infinity) {
    return results;
  }
  return results.slice(0, limit);
}

/**
 * 정렬 기준
 */
export function sortByImportance(
  results: ComparisonResult[],
  chartType: 'continuous' | 'binary'
): ComparisonResult[] {
  return [...results].sort((a, b) => {
    if (chartType === 'continuous') {
      // 연속형: Cohen's d 절댓값 내림차순
      const aContinuous = a as ContinuousComparison;
      const bContinuous = b as ContinuousComparison;
      return Math.abs(bContinuous.cohens_d || 0) - Math.abs(aContinuous.cohens_d || 0);
    } else {
      // 이진형: abs_diff_pct 내림차순
      const aBinary = a as BinaryComparison;
      const bBinary = b as BinaryComparison;
      return Math.abs(bBinary.abs_diff_pct || 0) - Math.abs(aBinary.abs_diff_pct || 0);
    }
  });
}


