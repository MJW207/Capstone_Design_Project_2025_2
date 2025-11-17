/**
 * Cluster Comparison Types
 * 클러스터 비교 분석 타입 정의
 */

export interface ClusterGroup {
  id: number;
  count: number;
  percentage: number;
  label?: string; // 동적 클러스터 이름 (예: "고소득 군집")
}

export interface ContinuousComparison {
  feature: string;
  type: 'continuous';
  group_a_mean: number;
  group_b_mean: number;
  difference: number;
  lift_pct: number;
  p_value: number;
  significant: boolean;
  cohens_d?: number;  // 효과 크기 (Cohen's d)
  feature_name_kr?: string;  // 한글 피처 이름
  original_group_a_mean?: number;  // 원본 값 (정규화되지 않은)
  original_group_b_mean?: number;
  original_difference?: number;
  warning_flags?: string[];  // 경고 플래그 (low_sample 등)
}

export interface BinaryComparison {
  feature: string;
  type: 'binary';
  group_a_ratio: number;
  group_b_ratio: number;
  difference: number;
  lift_pct: number;
  p_value: number;
  significant: boolean;
  abs_diff_pct?: number;  // 절대 퍼센트포인트 차이 (0~100 기준)
  index_a?: number;  // 클러스터 A의 index (전체 대비)
  index_b?: number;  // 클러스터 B의 index (전체 대비)
  feature_name_kr?: string;  // 한글 피처 이름
  warning_flags?: string[];  // 경고 플래그 (low_sample, rare_event 등)
}

export interface CategoricalComparison {
  feature: string;
  type: 'categorical';
  group_a_distribution: Record<string, number>;
  group_b_distribution: Record<string, number>;
}

export type ComparisonItem = ContinuousComparison | BinaryComparison | CategoricalComparison;

export interface OpportunityItem {
  title: string;
  intentionLabel: string;
  actionLabel: string;
  gapPct: number;
  direction: 'positive' | 'negative';
  description: string;
}

export interface ClusterComparisonData {
  group_a: ClusterGroup;
  group_b: ClusterGroup;
  comparison: ComparisonItem[];
  highlights: {
    num_top: ContinuousComparison[];
    bin_cat_top: (BinaryComparison | CategoricalComparison)[];
  };
  opportunities?: OpportunityItem[];
}

export type ChartType = 'side-by-side' | 'diverging' | 'radar' | 'box' | 'heatmap' | 'stacked' | 'index' | 'ridgeline';