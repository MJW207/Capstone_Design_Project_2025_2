/**
 * Summary 영역 데이터 타입 정의
 */

export type SummaryData = {
  total: number; // 총 결과 수
  qCount: number; // Quick 응답 수
  wOnlyCount: number; // W-only 수
  femaleRate?: number; // 0~1 (여성 비율)
  avgAge?: number; // 평균/중앙 나이
  regionsTop: Array<{ name: string; count: number; rate: number }>; // 내림차순 Top N
  tagsTop: string[]; // 관심사 Top N
  ageDistribution?: Array<{ label: string; count: number; rate: number }>; // 연령대 분포
  latestDate?: string; // 'YYYY-MM-DD'
  medianDate?: string; // 'YYYY-MM-DD'
  previousTotal?: number; // 이전 검색 대비 비교용 (optional)
  
  // 소득 관련 (신규)
  avgPersonalIncome?: number; // 평균 개인소득 (만원)
  avgHouseholdIncome?: number; // 평균 가구소득 (만원)
  incomeDistribution?: Array<{ label: string; count: number; rate: number }>; // 소득 구간 분포
  
  // 직업/학력 관련 (신규)
  occupationTop?: Array<{ name: string; count: number; rate: number }>; // 직업 Top N
  educationDistribution?: Array<{ label: string; count: number; rate: number }>; // 학력 분포
  
  // 가족 구성 관련 (신규)
  marriedRate?: number; // 0~1 (기혼 비율)
  avgChildrenCount?: number; // 평균 자녀 수
  householdSizeDistribution?: Array<{ label: string; count: number; rate: number }>; // 가구원 수 분포
  
  // 클러스터 관련 (신규)
  clusterDistribution?: Array<{ clusterId: number; clusterName: string; count: number; rate: number }>; // 클러스터 분포
  topClusters?: Array<{ clusterId: number; clusterName: string; count: number; rate: number }>; // Top 클러스터
  
  // 검색 품질 지표 (신규)
  bookmarkedRate?: number; // 0~1 (북마크된 패널 비율)
  avgSimilarity?: number; // 평균 유사도 점수
  metadataCompleteness?: number; // 0~1 (메타데이터 완성도)
};

/**
 * HHI (Herfindahl-Hirschman Index) 계산 유틸
 * @param regionsTop 지역 데이터 배열 (rate 포함)
 * @returns HHI 값 (0~1)
 */
export function computeHHI(
  regionsTop: Array<{ name: string; rate: number }>
): number {
  if (!regionsTop || regionsTop.length === 0) return 0;
  const rates = regionsTop.map((r) => r.rate / 100); // rate는 퍼센트
  return rates.reduce((sum, rate) => sum + rate * rate, 0);
}

/**
 * HHI를 기반으로 다양성 레벨 반환
 * @param hhi HHI 값 (0~1)
 * @returns 'high' | 'medium' | 'low'
 */
export function getDiversityLevel(hhi: number): 'high' | 'medium' | 'low' {
  if (hhi < 0.15) return 'high'; // 분산이 높음 (다양함)
  if (hhi < 0.3) return 'medium'; // 중간
  return 'low'; // 집중 (다양성 낮음)
}

/**
 * 날짜 차이 계산 (일 단위)
 */
export function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Freshness 색상 톤 결정
 */
export function getFreshnessTone(days: number): 'zero' | 'low' | 'mid' | 'high' {
  if (days <= 7) return 'zero'; // green
  if (days <= 30) return 'low'; // amber
  if (days <= 90) return 'mid'; // orange
  return 'high'; // red
}


