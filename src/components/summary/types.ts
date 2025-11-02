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
  latestDate?: string; // 'YYYY-MM-DD'
  medianDate?: string; // 'YYYY-MM-DD'
  previousTotal?: number; // 이전 검색 대비 비교용 (optional)
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

