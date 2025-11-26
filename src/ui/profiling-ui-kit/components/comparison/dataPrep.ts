/**
 * 차트별 데이터 준비 함수
 * 각 차트 유형에 맞게 데이터를 필터링하고 정렬
 */

import { 
  RADAR_CHART_FEATURES, 
  BINARY_HEATMAP_FEATURES,
  STACKED_BAR_FEATURES,
  INDEX_DOT_ALL_FEATURES
} from './featureSets';
import type { ContinuousComparison, BinaryComparison, CategoricalComparison } from './types';

export type ComparisonResult = ContinuousComparison | BinaryComparison | CategoricalComparison;

/**
 * 라다 차트용 데이터 준비
 */
export function prepareRadarData(
  allResults: ComparisonResult[],
  maxFeatures: number = 8,
  showOnlyMeaningful: boolean = true
): (ContinuousComparison | BinaryComparison)[] {
  // 1. 모든 연속형/이진형 변수 필터링
  const numericResults = allResults.filter(r => 
    r.type === 'continuous' || r.type === 'binary'
  ) as (ContinuousComparison | BinaryComparison)[];
  
  // 2. 의미있는 차이만 필터링 (선택적)
  let filtered = numericResults;
  if (showOnlyMeaningful) {
    filtered = numericResults.filter(r => {
      if (r.type === 'continuous') {
        return Math.abs(r.cohens_d || 0) >= 0.3 || Math.abs(r.difference) > 0;
      } else {
        return Math.abs(r.abs_diff_pct || 0) >= 5 || Math.abs(r.lift_pct || 0) >= 20;
      }
    });
  }
  
  // 3. 정의된 변수가 있으면 우선 사용 (순서 유지)
  const definedFeatures = filtered.filter(r => 
    RADAR_CHART_FEATURES.includes(r.feature as any)
  );
  
  if (definedFeatures.length > 0) {
    // 정의된 변수 순서대로 정렬
    const ordered = RADAR_CHART_FEATURES.map(featureName =>
      definedFeatures.find(r => r.feature === featureName)
    ).filter((r): r is ContinuousComparison | BinaryComparison => r !== undefined);
    
    // 정의된 변수가 maxFeatures 미만이면 나머지를 중요도 기준으로 추가
    if (ordered.length < maxFeatures) {
      const remaining = filtered
        .filter(r => !RADAR_CHART_FEATURES.includes(r.feature as any))
        .sort((a, b) => {
          if (a.type === 'continuous' && b.type === 'continuous') {
            return Math.abs(b.cohens_d || 0) - Math.abs(a.cohens_d || 0);
          } else if (a.type === 'binary' && b.type === 'binary') {
            return Math.abs(b.abs_diff_pct || 0) - Math.abs(a.abs_diff_pct || 0);
          } else if (a.type === 'continuous') {
            return -1;
          } else {
            return 1;
          }
        })
        .slice(0, maxFeatures - ordered.length);
      
      return [...ordered, ...remaining];
    }
    
    return ordered.slice(0, maxFeatures);
  }
  
  // 4. 정의된 변수가 없으면 중요도 기준으로 상위 maxFeatures개 반환
  const sorted = filtered.sort((a, b) => {
    if (a.type === 'continuous' && b.type === 'continuous') {
      return Math.abs(b.cohens_d || 0) - Math.abs(a.cohens_d || 0);
    } else if (a.type === 'binary' && b.type === 'binary') {
      return Math.abs(b.abs_diff_pct || 0) - Math.abs(a.abs_diff_pct || 0);
    } else if (a.type === 'continuous') {
      return -1; // 연속형 우선
    } else {
      return 1;
    }
  });
  
  return sorted.slice(0, maxFeatures);
}

/**
 * 막대그래프용 데이터 준비 (하위 호환성 - prepareRadarData 사용)
 */
export function prepareSideBySideData(
  allResults: ComparisonResult[]
): (ContinuousComparison | BinaryComparison)[] {
  return prepareRadarData(allResults, 7, true);
}

/**
 * 히트맵용 데이터 준비
 */
export function prepareBinaryHeatmapData(
  allResults: ComparisonResult[]
): BinaryComparison[] {
  // 1. 모든 이진형 변수 필터링
  const binaryResults = allResults.filter(r => 
    r.type === 'binary'
  ) as BinaryComparison[];
  
  // 2. 정의된 변수가 있으면 우선 사용 (순서 유지)
  const definedFeatures = binaryResults.filter(r => 
    BINARY_HEATMAP_FEATURES.includes(r.feature as any)
  );
  
  if (definedFeatures.length > 0) {
    // 정의된 변수 순서대로 정렬
    const ordered = BINARY_HEATMAP_FEATURES.map(featureName =>
      definedFeatures.find(r => r.feature === featureName)
    ).filter((r): r is BinaryComparison => r !== undefined);
    
    // 정의된 변수가 12개 미만이면 나머지를 중요도 기준으로 추가
    if (ordered.length < 12) {
      const remaining = binaryResults
        .filter(r => !BINARY_HEATMAP_FEATURES.includes(r.feature as any))
        .sort((a, b) => Math.abs(b.abs_diff_pct || 0) - Math.abs(a.abs_diff_pct || 0))
        .slice(0, 12 - ordered.length);
      
      return [...ordered, ...remaining];
    }
    
    return ordered.slice(0, 12);
  }
  
  // 3. 정의된 변수가 없으면 중요도 기준으로 상위 12개 반환
  const sorted = binaryResults.sort((a, b) => 
    Math.abs(b.abs_diff_pct || 0) - Math.abs(a.abs_diff_pct || 0)
  );
  
  return sorted.slice(0, 12);
}

/**
 * 스택바용 데이터 준비
 */
export function prepareStackedBarData(
  allResults: ComparisonResult[]
): CategoricalComparison[] {
  // 1. 모든 범주형 변수 필터링
  const categoricalResults = allResults.filter(r => 
    r.type === 'categorical'
  ) as CategoricalComparison[];
  
  // 2. 정의된 변수가 있으면 우선 사용 (순서 유지)
  const definedFeatures = categoricalResults.filter(r => 
    STACKED_BAR_FEATURES.includes(r.feature as any)
  );
  
  if (definedFeatures.length > 0) {
    // 정의된 변수 순서대로 정렬
    const ordered = STACKED_BAR_FEATURES.map(featureName =>
      definedFeatures.find(r => r.feature === featureName)
    ).filter((r): r is CategoricalComparison => r !== undefined);
    
    // 정의된 변수가 없으면 나머지 범주형 변수 추가
    if (ordered.length < 4) {
      const remaining = categoricalResults
        .filter(r => !STACKED_BAR_FEATURES.includes(r.feature as any))
        .slice(0, 4 - ordered.length);
      
      return [...ordered, ...remaining];
    }
    
    return ordered.slice(0, 4);
  }
  
  // 3. 정의된 변수가 없으면 모든 범주형 변수 반환 (최대 4개)
  return categoricalResults.slice(0, 4);
}

/**
 * 인덱스 도트용 데이터 준비
 */
export function prepareIndexDotData(
  allResults: ComparisonResult[]
): (BinaryComparison | ContinuousComparison)[] {
  // 1. 정의된 변수만 필터링
  const filtered = allResults.filter(r => 
    INDEX_DOT_ALL_FEATURES.includes(r.feature as any) &&
    (r.type === 'binary' || r.type === 'continuous')
  ) as (BinaryComparison | ContinuousComparison)[];
  
  // 2. 의미있는 차이만 (abs_diff_pct >= 5 또는 lift_pct >= 30)
  const significant = filtered.filter(r => {
    if (r.type === 'binary') {
      const absDiff = Math.abs(r.abs_diff_pct || 0);
      const liftPct = Math.abs(r.lift_pct || 0);
      return absDiff >= 5 || liftPct >= 30;
    }
    // 연속형도 포함 (cohens_d >= 0.3)
    if (r.type === 'continuous') {
      return Math.abs(r.cohens_d || 0) >= 0.3;
    }
    return false;
  });
  
  // 3. abs_diff_pct 또는 cohens_d 내림차순 정렬
  const sorted = [...significant].sort((a, b) => {
    if (a.type === 'binary' && b.type === 'binary') {
      return Math.abs(b.abs_diff_pct || 0) - Math.abs(a.abs_diff_pct || 0);
    }
    if (a.type === 'continuous' && b.type === 'continuous') {
      return Math.abs(b.cohens_d || 0) - Math.abs(a.cohens_d || 0);
    }
    return 0;
  });
  
  return sorted;
}

