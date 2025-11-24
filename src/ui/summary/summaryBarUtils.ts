import type { SummaryData } from './types';
import type { SummaryBarProps, SummaryProfileChip } from './SummaryBarNew';

/**
 * SummaryData를 새로운 SummaryBarProps로 변환
 */
export function convertSummaryDataToBarProps(
  data: SummaryData,
  query?: string,
  filters?: any,
  costKb?: number,
  latencyText?: string
): SummaryBarProps {
  // 쿼리/필터 요약 문장 생성
  const queryLabel = buildQueryLabel(query, filters);

  // 평균 연령 포맷
  const avgAge = data.avgAge ? `${data.avgAge}세` : undefined;

  // 성비 계산 및 포맷
  const genderText = data.femaleRate !== undefined
    ? `${Math.round((1 - data.femaleRate) * 100)} : ${Math.round(data.femaleRate * 100)}`
    : undefined;
  const genderSubText = data.femaleRate !== undefined
    ? `남 ${Math.round((1 - data.femaleRate) * 100)}%, 여 ${Math.round(data.femaleRate * 100)}%`
    : undefined;

  // 프로필 칩 생성
  const profileChips: SummaryProfileChip[] = [];

  // 평균 연령
  if (data.avgAge) {
    profileChips.push({
      key: 'age',
      label: '평균 연령',
      value: `${data.avgAge}세`,
      color: 'indigo',
    });
  }

  // 주요 지역 (TOP 1)
  if (data.regionsTop && data.regionsTop.length > 0) {
    const topRegion = data.regionsTop[0];
    profileChips.push({
      key: 'region',
      label: '주요 지역',
      value: `${topRegion.name} ${topRegion.rate}%`,
      color: 'blue',
    });
  }

  // 주요 직업 (TOP 1)
  if (data.occupationTop && data.occupationTop.length > 0) {
    const topOccupation = data.occupationTop[0];
    profileChips.push({
      key: 'job',
      label: '주요 직업',
      value: `${topOccupation.name} ${topOccupation.rate}%`,
      color: 'violet',
    });
  }

  // 기혼/미혼 비율
  if (data.marriedRate !== undefined) {
    const marriedPercent = Math.round(data.marriedRate * 100);
    const singlePercent = 100 - marriedPercent;
    profileChips.push({
      key: 'marriage',
      label: '결혼 여부',
      value: `기혼 ${marriedPercent}%, 미혼 ${singlePercent}%`,
      color: 'amber',
    });
  }

  // 평균 월수입
  if (data.avgPersonalIncome !== undefined) {
    profileChips.push({
      key: 'income',
      label: '평균 월수입',
      value: `${data.avgPersonalIncome}만원`,
      color: 'emerald',
    });
  } else if (data.avgHouseholdIncome !== undefined) {
    profileChips.push({
      key: 'income',
      label: '평균 월수입',
      value: `${data.avgHouseholdIncome}만원`,
      color: 'emerald',
    });
  }

  // 차량 보유율
  if (data.carOwnershipRate !== undefined) {
    profileChips.push({
      key: 'car',
      label: '차량 보유',
      value: `${Math.round(data.carOwnershipRate * 100)}%`,
      color: 'slate',
    });
  }

  // 주요 스마트폰 브랜드
  if (data.topPhoneBrand) {
    profileChips.push({
      key: 'phone',
      label: '주요 스마트폰',
      value: `${data.topPhoneBrand.name} ${data.topPhoneBrand.rate}%`,
      color: 'indigo',
    });
  }


  return {
    foundCount: data.total,
    queryLabel,
    costKb,
    latencyText,
    avgAge,
    genderText,
    genderSubText,
    profileChips,
  };
}

/**
 * 쿼리와 필터를 기반으로 요약 문장 생성
 */
function buildQueryLabel(query?: string, filters?: any): string | undefined {
  const parts: string[] = [];

  if (query && query.trim()) {
    parts.push(`"${query.trim()}"`);
  }

  if (filters) {
    const filterParts: string[] = [];

    // 지역 필터
    if (filters.selectedRegions && filters.selectedRegions.length > 0) {
      if (filters.selectedRegions.length === 1) {
        filterParts.push(filters.selectedRegions[0]);
      } else {
        filterParts.push(`${filters.selectedRegions.length}개 지역`);
      }
    }

    // 연령대 필터
    if (filters.ageRange && Array.isArray(filters.ageRange) && filters.ageRange.length === 2) {
      const [min, max] = filters.ageRange;
      if (min > 15 || max < 80) {
        filterParts.push(`${min}~${max}세`);
      }
    }

    // 성별 필터
    if (filters.selectedGenders && filters.selectedGenders.length > 0) {
      if (filters.selectedGenders.length === 1) {
        filterParts.push(filters.selectedGenders[0] === 'M' ? '남성' : '여성');
      }
    }

    // 직업 필터
    if (filters.selectedOccupations && filters.selectedOccupations.length > 0) {
      if (filters.selectedOccupations.length === 1) {
        filterParts.push(filters.selectedOccupations[0]);
      } else {
        filterParts.push(`${filters.selectedOccupations.length}개 직업`);
      }
    }

    // 소득 필터
    if (filters.selectedIncomes && filters.selectedIncomes.length > 0) {
      if (filters.selectedIncomes.length === 1) {
        filterParts.push(filters.selectedIncomes[0]);
      } else {
        filterParts.push(`${filters.selectedIncomes.length}개 소득 구간`);
      }
    }

    if (filterParts.length > 0) {
      parts.push(filterParts.join(', '));
    }
  }

  if (parts.length === 0) {
    return undefined;
  }

  return parts.join(' • ');
}

