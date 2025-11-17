/**
 * Profiling UI Kit Types
 */

export interface ProfilingData {
  count: number;
  age_mean?: number;
  age_std?: number;
  age_min?: number;
  age_max?: number;
  gender_distribution?: { [key: string]: number };
  region_lvl1_distribution?: { [key: string]: number };
  region_lvl2_distribution?: { [key: string]: number };
  Q1_label_distribution?: { [key: string]: number };
  Q4_label_distribution?: { [key: string]: number };
  Q6_category_distribution?: { [key: string]: number };
  Q10_label_distribution?: { [key: string]: number };
  Q12_distribution?: { [key: string]: number };
  drinking_distribution?: { [key: string]: number };
  age_group_distribution?: { [key: string]: number };
  categorical_distributions?: { [key: string]: { [key: string]: number } };
  [key: string]: any;
}

export interface DistributionItem {
  label: string;
  value: number;
}

export interface StatItem {
  label: string;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
}


