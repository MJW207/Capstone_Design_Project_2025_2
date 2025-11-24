/**
 * SummaryBar 그래프용 통계 계산 유틸리티
 */

// Panel 타입 정의 (순환 import 방지)
export interface Panel {
  id: string;
  name: string;
  age: number;
  gender: string;
  region: string;
  responses?: any;
  created_at: string;
  embedding?: number[];
  coverage?: 'qw' | 'w' | string;
  income?: string;
  aiSummary?: string;
  metadata?: {
    [key: string]: any;
  };
}

// 지역 분포 데이터
export interface RegionData {
  name: string;
  count: number;
  rate: number;
  color: string;
}

// 차량 브랜드 데이터
export interface CarData {
  name: string;
  count: number;
  rate: number;
  color: string;
}

// 스마트폰 브랜드 데이터
export interface PhoneData {
  name: string;
  count: number;
  rate: number;
  color: string;
}

// 직업 데이터
export interface OccupationData {
  name: string;
  count: number;
  rate: number;
  color: string;
}

// 소득 분포 데이터
export interface IncomeData {
  name: string;
  count: number;
  rate: number;
  color: string;
}

/**
 * 지역별 분포 계산 (Top 10)
 */
export function calculateRegionDistribution(panels: Panel[]): RegionData[] {
  if (!panels || panels.length === 0) return [];

  // 지역별 카운트
  const regionCount: Record<string, number> = {};
  let totalCount = 0;

  panels.forEach((panel) => {
    const region = panel.region || panel.metadata?.location || '';
    // ⭐ 문자열로 변환하고 유효성 검사
    const regionStr = region ? String(region).trim() : '';
    if (regionStr && regionStr !== '') {
      // 지역명 정규화 (공백 제거, 대소문자 통일)
      const normalizedRegion = regionStr;
      regionCount[normalizedRegion] = (regionCount[normalizedRegion] || 0) + 1;
      totalCount++;
    }
  });

  if (totalCount === 0) return [];

  // Top 10 정렬
  const sorted = Object.entries(regionCount)
    .map(([name, count]) => ({
      name,
      count,
      rate: Math.round((count / totalCount) * 100 * 10) / 10, // 소수점 1자리
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 색상 할당 (그라데이션)
  const colors = [
    '#3b82f6', // blue-500
    '#2563eb', // blue-600
    '#1d4ed8', // blue-700
    '#1e40af', // blue-800
    '#6366f1', // indigo-500
    '#4f46e5', // indigo-600
    '#4338ca', // indigo-700
    '#3730a3', // indigo-800
    '#8b5cf6', // violet-500
    '#7c3aed', // violet-600
  ];

  return sorted.map((item, index) => ({
    ...item,
    color: colors[index] || '#9ca3af', // gray-400 (fallback)
  }));
}

/**
 * 차량 브랜드별 분포 계산 (Top 10)
 */
export function calculateCarOwnership(panels: Panel[]): CarData[] {
  if (!panels || panels.length === 0) return [];

  const brandCount: Record<string, number> = {};
  let totalCount = 0;

  panels.forEach((panel) => {
    // 차량 보유 여부 확인
    const hasCar = panel.metadata?.['보유차량여부'];
    if (!hasCar) return;
    
    const lower = String(hasCar).toLowerCase();
    if (!lower.includes('있다') && lower !== '있음' && lower !== 'yes' && lower !== 'true') {
      return; // 차량이 없으면 제외
    }

    // 차량 브랜드 가져오기
    const brand = panel.metadata?.['자동차 제조사'] || panel.metadata?.['자동차제조사'];
    if (!brand || brand === '무응답' || String(brand).trim() === '') {
      return;
    }

    const normalizedBrand = String(brand).trim();
    brandCount[normalizedBrand] = (brandCount[normalizedBrand] || 0) + 1;
    totalCount++;
  });

  if (totalCount === 0) return [];

  // Top 10 정렬
  const sorted = Object.entries(brandCount)
    .map(([name, count]) => ({
      name,
      count,
      rate: Math.round((count / totalCount) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 브랜드별 색상 매핑
  const brandColors: Record<string, string> = {
    '현대': '#0066cc',
    'Hyundai': '#0066cc',
    '기아': '#05141f',
    'Kia': '#05141f',
    '쉐보레': '#ffc72c',
    'Chevrolet': '#ffc72c',
    'GM': '#ffc72c',
    '르노': '#ffd700',
    'Renault': '#ffd700',
    '르노삼성': '#ffd700',
    'BMW': '#1c69d4',
    '벤츠': '#00adef',
    'Mercedes-Benz': '#00adef',
    '아우디': '#bb0a30',
    'Audi': '#bb0a30',
    '폭스바겐': '#003d7a',
    'Volkswagen': '#003d7a',
    'VW': '#003d7a',
    '도요타': '#eb0a1e',
    'Toyota': '#eb0a1e',
    '렉서스': '#000000',
    'Lexus': '#000000',
    '혼다': '#c8102e',
    'Honda': '#c8102e',
    '닛산': '#c3002f',
    'Nissan': '#c3002f',
  };

  // 색상 그라데이션 (기본값)
  const defaultColors = [
    '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af',
    '#6366f1', '#4f46e5', '#4338ca', '#3730a3',
    '#8b5cf6', '#7c3aed',
  ];

  return sorted.map((item, index) => ({
    ...item,
    color: brandColors[item.name] || defaultColors[index] || '#9ca3af',
  }));
}

/**
 * 스마트폰 브랜드 분포 계산 (Top 5)
 */
export function calculatePhoneBrandDistribution(panels: Panel[]): PhoneData[] {
  if (!panels || panels.length === 0) return [];

  const brandCount: Record<string, number> = {};
  let totalCount = 0;

  panels.forEach((panel) => {
    const brand = panel.metadata?.['보유 휴대폰 단말기 브랜드'];
    if (!brand || brand === '무응답' || String(brand).trim() === '') return;

    const normalizedBrand = String(brand).trim();
    brandCount[normalizedBrand] = (brandCount[normalizedBrand] || 0) + 1;
    totalCount++;
  });

  if (totalCount === 0) return [];

  // Top 5 정렬
  const sorted = Object.entries(brandCount)
    .map(([name, count]) => ({
      name,
      count,
      rate: Math.round((count / totalCount) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 브랜드별 색상 매핑
  const brandColors: Record<string, string> = {
    '애플': '#334155', // slate-700
    'Apple': '#334155',
    '아이폰': '#334155',
    '삼성': '#2563eb', // blue-600
    'Samsung': '#2563eb',
    '갤럭시': '#2563eb',
  };

  return sorted.map((item) => ({
    ...item,
    color: brandColors[item.name] || '#9ca3af', // gray-400 (기타)
  }));
}

/**
 * 직업별 분포 계산 (Top 10)
 */
export function calculateOccupationDistribution(panels: Panel[]): OccupationData[] {
  if (!panels || panels.length === 0) return [];

  const occupationCount: Record<string, number> = {};
  let totalCount = 0;

  panels.forEach((panel) => {
    const occupation = panel.metadata?.['직업'];
    if (!occupation || occupation === '무응답' || String(occupation).trim() === '') return;

    const normalizedOccupation = String(occupation).trim();
    occupationCount[normalizedOccupation] = (occupationCount[normalizedOccupation] || 0) + 1;
    totalCount++;
  });

  if (totalCount === 0) return [];

  // Top 10 정렬
  const sorted = Object.entries(occupationCount)
    .map(([name, count]) => ({
      name,
      count,
      rate: Math.round((count / totalCount) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 직업별 색상 매핑
  const occupationColors: Record<string, string> = {
    '서비스직': '#8b5cf6', // violet-500
    '전문직': '#3b82f6', // blue-500
    '사무직': '#10b981', // emerald-500
    '판매직': '#f59e0b', // amber-500
    '생산직': '#ef4444', // red-500
    '기능직': '#6366f1', // indigo-500
    '관리직': '#ec4899', // pink-500
    '자영업': '#14b8a6', // teal-500
    '학생': '#06b6d4', // cyan-500
    '주부': '#a855f7', // purple-500
  };

  // 색상 그라데이션 (기본값)
  const defaultColors = [
    '#8b5cf6', '#6366f1', '#3b82f6', '#2563eb',
    '#10b981', '#059669', '#f59e0b', '#d97706',
    '#ef4444', '#dc2626',
  ];

  return sorted.map((item, index) => ({
    ...item,
    color: occupationColors[item.name] || defaultColors[index] || '#9ca3af',
  }));
}

/**
 * 소득 분포 계산 (개인소득 기준)
 */
export function calculateIncomeDistribution(panels: Panel[]): IncomeData[] {
  if (!panels || panels.length === 0) return [];

  // 소득 구간별 카운트
  const incomeRanges: Record<string, number> = {};
  let totalCount = 0;

  panels.forEach((panel) => {
    // 개인소득 우선, 없으면 가구소득
    const incomeStr = panel.metadata?.['월평균 개인소득'] || 
                     panel.metadata?.['월평균 가구소득'] || 
                     panel.income || '';
    
    if (!incomeStr || String(incomeStr).trim() === '') return;

    // 소득 문자열 파싱 (예: "월 200~299만원", "200~299만원", "300만원 이상" 등)
    const income = String(incomeStr).trim();
    
    // 소득 구간 추출 및 정규화
    let range = '';
    if (income.includes('~')) {
      // 범위 형식: "200~299만원"
      const match = income.match(/(\d+)~(\d+)/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        range = `${min}~${max}만원`;
      }
    } else if (income.includes('미만')) {
      // "100만원 미만"
      const match = income.match(/(\d+)/);
      if (match) {
        range = `${match[1]}만원 미만`;
      }
    } else if (income.includes('이상')) {
      // "1000만원 이상"
      const match = income.match(/(\d+)/);
      if (match) {
        range = `${match[1]}만원 이상`;
      }
    } else {
      // 단일 값 또는 기타 형식
      const match = income.match(/(\d+)/);
      if (match) {
        const value = parseInt(match[1]);
        if (value < 100) {
          range = `${value}만원 미만`;
        } else if (value < 200) {
          range = '100~199만원';
        } else if (value < 300) {
          range = '200~299만원';
        } else if (value < 400) {
          range = '300~399만원';
        } else if (value < 500) {
          range = '400~499만원';
        } else if (value < 600) {
          range = '500~599만원';
        } else if (value < 700) {
          range = '600~699만원';
        } else if (value < 800) {
          range = '700~799만원';
        } else if (value < 900) {
          range = '800~899만원';
        } else if (value < 1000) {
          range = '900~999만원';
        } else {
          range = '1000만원 이상';
        }
      } else {
        // 파싱 실패 시 원본 사용
        range = income;
      }
    }

    if (range) {
      incomeRanges[range] = (incomeRanges[range] || 0) + 1;
      totalCount++;
    }
  });

  if (totalCount === 0) return [];

  // 소득 구간 순서 정의
  const incomeOrder = [
    '100만원 미만',
    '100~199만원',
    '200~299만원',
    '300~399만원',
    '400~499만원',
    '500~599만원',
    '600~699만원',
    '700~799만원',
    '800~899만원',
    '900~999만원',
    '1000만원 이상',
  ];

  // 정렬 (정의된 순서대로)
  const sorted = Object.entries(incomeRanges)
    .map(([name, count]) => ({
      name,
      count,
      rate: Math.round((count / totalCount) * 100 * 10) / 10,
      order: incomeOrder.indexOf(name) !== -1 ? incomeOrder.indexOf(name) : 999, // 정의된 순서가 아니면 맨 뒤
    }))
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return b.count - a.count; // 같은 순서면 카운트 내림차순
    });

  // 색상 그라데이션 (낮은 소득부터 높은 소득까지)
  const colors = [
    '#fef3c7', // amber-100 (낮은 소득)
    '#fde68a', // amber-200
    '#fcd34d', // amber-300
    '#fbbf24', // amber-400
    '#f59e0b', // amber-500
    '#d97706', // amber-600
    '#b45309', // amber-700
    '#92400e', // amber-800
    '#78350f', // amber-900
    '#451a03', // amber-950
    '#7c2d12', // red-900 (높은 소득)
  ];

  return sorted.map((item, index) => ({
    name: item.name,
    count: item.count,
    rate: item.rate,
    color: colors[Math.min(index, colors.length - 1)] || '#9ca3af',
  }));
}
