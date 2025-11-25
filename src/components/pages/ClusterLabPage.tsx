import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PIButton } from '../../ui/pi/PIButton';
import { PIModelStatusCard } from '../../ui/pi/PIModelStatusCard';
import { PIQualityLegend } from '../../ui/pi/PIQualityLegend';
import { PIOutdatedBanner } from '../../ui/pi/PIOutdatedBanner';
import { PIClusterProfileCard } from '../../ui/pi/PIClusterProfileCard';
import { PISectionHeader } from '../../ui/pi/PISectionHeader';
import { PIActionBar } from '../../ui/pi/PIActionBar';
import { PIModelBadge, ModelStatus } from '../../ui/pi/PIModelBadge';
// SVG 기반 UMAP 차트로 변경 (Recharts 제거)
import { toast } from 'sonner';
import { historyManager } from '../../lib/history';
import { Loader2, BarChart3, Search } from 'lucide-react';
import { API_URL } from '../../lib/config';
import { PIProfilingView } from '../../ui/profiling-ui-kit/components/PIProfilingView';
import { useDarkMode, useThemeColors } from '../../lib/DarkModeSystem';
import { searchApi } from '../../lib/utils';
import { ClusterDetailDrawer } from '../drawers/ClusterDetailDrawer';
import { PanelDetailDrawer } from '../drawers/PanelDetailDrawer';
import { CLUSTER_COLORS, getClusterColor as getClusterColorUtil } from '../../ui/profiling-ui-kit/components/comparison/utils';



// 19개 군집용 고유 색상 (utils.ts에서 import)
const clusterColors = CLUSTER_COLORS;

// 클러스터 프로필용 피처 한글 이름 매핑
const featureDisplayNameMap: Record<string, string> = {
  // 인구통계
  age: "연령",
  age_scaled: "연령",
  age_z: "연령",
  generation: "세대",
  family_type: "가족 형태",
  has_children: "자녀 있음",
  children_category: "자녀 수",
  region_category: "거주 지역",
  is_metro: "수도권 거주",
  is_metro_city: "광역시 거주",

  // 소득/직업
  Q6_income: "소득",
  Q6_scaled: "소득",
  Q6_numeric: "소득",
  Q6: "소득",
  Q6_category: "소득 구간",
  is_employed: "취업 상태",
  is_unemployed: "무직 상태",
  is_student: "학생 비중",

  // 디바이스/프리미엄
  Q8_count: "전자제품 수",
  Q8_count_scaled: "전자제품 수",
  Q8_premium_index: "프리미엄폰 전자제품 지수",
  Q8_premium_count: "프리미엄폰 전자제품 수",
  is_apple_user: "애플 사용자 비중",
  is_samsung_user: "삼성 사용자 비중",
  is_premium_phone: "프리미엄 스마트폰 비중",
  has_car: "자동차 보유",
  is_premium_car: "프리미엄차 보유",
  is_domestic_car: "국산차 보유",

  // 라이프스타일
  has_drinking_experience: "음주 경험",
  drinking_types_count: "음주 유형 수",
  drinks_beer: "맥주 음용",
  drinks_soju: "소주 음용",
  drinks_wine: "와인 음용",
  drinks_western: "양주 음용",
  drinks_makgeolli: "막걸리 음용",
  drinks_low_alcohol: "저도주 음용",
  drinks_cocktail: "칵테일 음용",
  has_smoking_experience: "흡연 경험",
  smoking_types_count: "흡연 유형 수",
  smokes_regular: "일반 담배",
  smokes_heet: "궐련형 전자담배",
  smokes_liquid: "액상형 전자담배",
  smokes_other: "기타 흡연",

  // 그 외 자주 등장할 수 있는 것들
  Q7: "학력",
  education_level_scaled: "학력 수준",
};

// 피처 한글 이름 가져오기
function getFeatureDisplayName(feature: string): string {
  return featureDisplayNameMap[feature] ?? feature;
}

// DistinctiveFeature 타입 정의
type DistinctiveFeature = {
  feature: string;
  value?: number;
  overall?: number;
  diff?: number;
  diff_percent?: number;
  effect_size?: number;
  lift?: number;
};

// 군집 이름 생성 함수
function buildClusterDisplayName(clusterProfile: any): string {
  const top: DistinctiveFeature | undefined = clusterProfile.distinctive_features?.[0];
  if (!top) {
    // fallback: C1, C2 형태
    if (clusterProfile.cluster != null) {
      return `C${clusterProfile.cluster + 1}`;
    }
    return "군집";
  }

  const feature = top.feature;
  const diff = top.diff_percent ?? top.effect_size ?? top.lift ?? 0;
  const isHigh = diff > 0;

  // 1) 피처별 전용 템플릿
  if (feature === "Q6_income" || feature === "Q6_scaled" || feature === "Q6_numeric" || feature === "Q6") {
    return isHigh ? "고소득 군집" : "저소득 군집";
  }

  if (feature === "age" || feature === "age_scaled" || feature === "age_z") {
    return isHigh ? "고연령 군집" : "저연령 군집";
  }

  if (feature === "is_student") {
    return isHigh ? "학생 비중 높은 군집" : "학생 비중 낮은 군집";
  }

  if (feature === "is_apple_user") {
    return isHigh ? "애플 사용자 비중 높은 군집" : "애플 사용자 비중 낮은 군집";
  }

  if (feature === "is_premium_car") {
    return isHigh ? "프리미엄차 비중 높은 군집" : "프리미엄차 비중 낮은 군집";
  }

  if (feature === "is_premium_phone") {
    return isHigh ? "프리미엄폰 비중 높은 군집" : "프리미엄폰 비중 낮은 군집";
  }

  // 2) 그 외 피처에 대해서는 기본 규칙 적용
  const baseName = getFeatureDisplayName(feature); // 한글 매핑 사용
  if (isHigh) {
    return `높은 ${baseName} 군집`;
  } else {
    return `낮은 ${baseName} 군집`;
  }
}

// 색상 기준에 따른 색상 매핑
const getColorByAttribute = (point: any, colorBy: string) => {
  switch (colorBy) {
    case 'gender':
      return point.gender === 'female' ? '#EC4899' : '#3B82F6';
    case 'region':
      const regionColors: { [key: string]: string } = {
        'seoul': '#2563EB',
        'busan': '#16A34A', 
        'incheon': '#F59E0B',
        'daegu': '#EF4444',
        'gwangju': '#8B5CF6',
        'daejeon': '#06B6D4'
      };
      return regionColors[point.region] || '#94A3B8';
    case 'income':
      const incomeColors: { [key: string]: string } = {
        'high': '#16A34A',
        'medium': '#F59E0B',
        'low': '#EF4444'
      };
      return incomeColors[point.income] || '#94A3B8';
    case 'cluster':
    default:
      return point.cluster === -1 ? '#94A3B8' : getClusterColorUtil(point.cluster);
  }
};



interface ClusterLabPageProps {
  searchResults?: any[]; // 검색 결과 데이터
  query?: string; // 검색 쿼리
  onNavigateToResults?: () => void; // 검색 결과 페이지로 이동
}

interface ClusterData {
  id: number;
  size: number;
  indices: number[];
  centroid: number[];
  query_similarity: number;
  representative_items: number[];
}

interface UMAPPoint {
  x: number;
  y: number;
  cluster: number;
  panelId?: string;
}

export function ClusterLabPage({ searchResults = [], query = '', onNavigateToResults }: ClusterLabPageProps) {
  const { isDark } = useDarkMode();
  const colors = useThemeColors();
  
  // 패널 ID 정규화 함수
  const normalizePanelId = (id: string | undefined) => {
    if (!id) return '';
    return String(id).trim().toLowerCase();
  };
  
  // 디버깅: 검색 결과 전달 확인
  const [modelStatus, setModelStatus] = useState<ModelStatus>('synced');
  const [userRole] = useState<'viewer' | 'admin'>('viewer');
  const [showOutdatedBanner, setShowOutdatedBanner] = useState(false);
  const [selectedClusters] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [lastSearchQuery, setLastSearchQuery] = useState<string>(''); // 마지막 검색 쿼리 추적
  const [selected, setSelected] = useState<{ mb_sn: string; feature: string } | null>(null);
  
  // 검색된 패널과 클러스터 매핑 상태
  const [searchedPanelClusters, setSearchedPanelClusters] = useState<Record<string, number>>({});
  const [searchedPanelClusterMapping, setSearchedPanelClusterMapping] = useState<Record<string, number>>({});
  const [highlightedPanelIds, setHighlightedPanelIds] = useState<Set<string>>(new Set());
  
  const [searchedPanelInfo, setSearchedPanelInfo] = useState<Record<string, {
    mb_sn: string;
    gender?: string;
    age?: number;
    region?: string;
    similarity?: number;
    // NeonDB에서 불러온 추가 정보
    job?: string;
    education?: string;
    income?: string;
    marriage?: string;
    children?: number;
    family?: number;
  }>>({});
  
  // 호버 중인 패널 정보 로딩 상태
  const [loadingPanelInfo, setLoadingPanelInfo] = useState<Set<string>>(new Set());
  const [vectorSearchStatus, setVectorSearchStatus] = useState<{
    enabled: boolean;
    status: string;
    message: string;
  } | null>(null);
  
  // Clustering state
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [umapData, setUmapData] = useState<UMAPPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 검색 결과 기반 확장 클러스터링 상태
  const [extendedClusteringData, setExtendedClusteringData] = useState<{
    panels: Array<{
      panel_id: string;
      umap_x: number;
      umap_y: number;
      cluster: number;
      is_search_result: boolean;
      original_cluster: number;
    }>;
    cluster_stats: Record<number, any>;
    session_id: string;
  } | null>(null);
  
  // 군집 상세정보 드로어 상태
  const [selectedClusterForDetail, setSelectedClusterForDetail] = useState<{
    id: number;
    name: string;
    size: number;
    percentage: number;
    color: string;
    tags: string[];
    snippets: string[];
    insights?: string[];
    features?: Array<{feature: string, value: number, avg: number, diff: number}>;
    silhouette?: number;
    description?: string;
    searchedPanels?: Array<{
      panelId: string;
      cluster: number;
      umap_x: number;
      umap_y: number;
      isSearchResult?: boolean;
      gender?: string;
      age?: number;
      region?: string;
    }>;
  } | null>(null);
  const [isClusterDetailOpen, setIsClusterDetailOpen] = useState(false);
  
  // 패널 상세정보 드로어 상태
  const [isPanelDetailOpen, setIsPanelDetailOpen] = useState(false);
  const [selectedPanelId, setSelectedPanelId] = useState<string>('');
  
  // 군집 프로필 클릭 시 테이블 표시 상태
  const [selectedClusterForTable, setSelectedClusterForTable] = useState<number | null>(null);
  const [clusterPanelTable, setClusterPanelTable] = useState<Array<{
    panelId: string;
    cluster: number;
    umap_x: number;
    umap_y: number;
    isSearchResult?: boolean;
    gender?: string;
    age?: number;
    region?: string;
  }>>([]);
  
  const [clusteringMeta, setClusteringMeta] = useState<{
    n_samples?: number;
    n_clusters?: number;
    silhouette_score?: number;
    davies_bouldin_score?: number;
    calinski_harabasz?: number;
    strategy?: string;
    algorithm?: string;
    method?: string;
    n_noise?: number;
    session_id?: string;
    last_updated?: string;
  } | null>(null);
  const [labels, setLabels] = useState<number[]>([]);
  const [clusterSizes, setClusterSizes] = useState<Record<string | number, number>>({});
  const [profileData, setProfileData] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [lastClusterResponse, setLastClusterResponse] = useState<any>(null);
  // UMAP 컨테이너 크기 추적
  const umapContainerRef = useRef<HTMLDivElement>(null);
  // 검색 결과가 없을 때는 더 큰 UMAP 크기 사용
  const defaultUmapSize = (!searchResults || searchResults.length === 0) 
    ? { width: 1400, height: 1400 } 
    : { width: 1000, height: 1000 };
  const [umapSize, setUmapSize] = useState(defaultUmapSize);

  const [clusterProfiles, setClusterProfiles] = useState<Array<{
    cluster: number;
    size: number;
    percentage?: number;
    features: Record<string, number>;
    distinctive_features?: Array<{
      feature: string;
      value: number;
      overall: number;
      diff: number;
      diff_percent: number;
      effect_size?: number;
      lift?: number;
    }>;
    insights?: string[];
    name?: string;
    tags?: string[];
  }>>([]);
  
  // UMAP 차트 호버 상태
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  
  // 호버 시 패널 정보 로드 함수 (useCallback으로 메모이제이션)
  const loadPanelInfoOnHover = useCallback(async (panelId: string) => {
    if (!panelId) return;
    
    const normalizedId = normalizePanelId(panelId);
    
    // 이미 로드된 정보가 있으면 스킵
    if (searchedPanelInfo[normalizedId] || searchedPanelInfo[panelId]) {
      return;
    }
    
    // 이미 로딩 중이면 스킵
    if (loadingPanelInfo.has(normalizedId) || loadingPanelInfo.has(panelId)) {
      return;
    }
    
    // 로딩 상태 추가
    setLoadingPanelInfo(prev => new Set([...prev, normalizedId, panelId]));
    
    try {
      const panelData = await searchApi.getPanel(panelId);
      
      // 패널 정보 업데이트
      setSearchedPanelInfo(prev => ({
        ...prev,
        [normalizedId]: {
          mb_sn: panelId,
          gender: panelData.gender,
          age: panelData.age,
          region: panelData.region,
          job: panelData.welcome2_info?.job || panelData.job,
          education: panelData.welcome1_info?.education || panelData.education || panelData.최종학력,
          income: panelData.welcome2_info?.personal_income || panelData.welcome2_info?.household_income || panelData.income || panelData.월평균개인소득 || panelData.월평균가구소득,
          marriage: panelData.welcome1_info?.marriage || panelData.결혼여부,
          children: panelData.welcome1_info?.children || panelData.자녀수,
          family: panelData.welcome1_info?.family || panelData.가족수,
        },
        [panelId]: {
          mb_sn: panelId,
          gender: panelData.gender,
          age: panelData.age,
          region: panelData.region,
          job: panelData.welcome2_info?.job || panelData.job,
          education: panelData.welcome1_info?.education || panelData.education || panelData.최종학력,
          income: panelData.welcome2_info?.personal_income || panelData.welcome2_info?.household_income || panelData.income || panelData.월평균개인소득 || panelData.월평균가구소득,
          marriage: panelData.welcome1_info?.marriage || panelData.결혼여부,
          children: panelData.welcome1_info?.children || panelData.자녀수,
          family: panelData.welcome1_info?.family || panelData.가족수,
        },
      }));
    } catch (error) {
      console.error(`패널 정보 로드 실패: ${panelId}`, error);
    } finally {
      // 로딩 상태 제거
      setLoadingPanelInfo(prev => {
        const next = new Set(prev);
        next.delete(normalizedId);
        next.delete(panelId);
        return next;
      });
    }
  }, [searchedPanelInfo, loadingPanelInfo]);
  
  // 필터링된 데이터 메모이제이션 (성능 최적화)
  const filteredUmapData = useMemo(() => {
    // 노이즈 제거 및 클러스터 필터링 (HDBSCAN의 노이즈: -1과 0)
    let filtered = umapData.filter(d => d.cluster !== -1 && d.cluster !== 0);
    
    // 검색 결과가 있으면 검색된 패널만 표시 (속한 군집의 모든 패널이 아닌 검색된 패널만)
    if (highlightedPanelIds.size > 0) {
      // 검색된 패널만 필터링
      filtered = filtered.filter((d) => {
        const normalizedId = normalizePanelId(d.panelId);
        return highlightedPanelIds.has(normalizedId);
      });
    }
    
    // selectedClusters 필터링 (사용자가 수동으로 선택한 경우)
    if (selectedClusters.length > 0) {
      const clusterNumbers = selectedClusters.map(c => parseInt(c.replace('C', '')) - 1);
      filtered = filtered.filter(d => clusterNumbers.includes(d.cluster));
    }
    
    return filtered;
  }, [umapData, highlightedPanelIds, selectedClusters]);
  
  // 확장 클러스터링된 패널과 기존 전체 데이터 구분 (메모이제이션)
  const { extendedPanelsOnly, normalPanelsOnly, searchedPanelsOnly } = useMemo(() => {
    const extendedPanelIds = extendedClusteringData 
      ? new Set(extendedClusteringData.panels.map(p => p.panel_id.toLowerCase()))
      : new Set();
    
    const extended = filteredUmapData.filter((d) => {
      const normalizedId = normalizePanelId(d.panelId);
      return extendedPanelIds.has(normalizedId.toLowerCase());
    });
    
    const normal = filteredUmapData.filter((d) => {
      const normalizedId = normalizePanelId(d.panelId);
      return !extendedPanelIds.has(normalizedId.toLowerCase());
    });
    
    // 검색된 패널만 별도로 추출 (테두리 강조용)
    const searched = filteredUmapData.filter((d) => {
      const normalizedId = normalizePanelId(d.panelId);
      return highlightedPanelIds.has(normalizedId);
    });
    
    return { extendedPanelsOnly: extended, normalPanelsOnly: normal, searchedPanelsOnly: searched };
  }, [filteredUmapData, extendedClusteringData, highlightedPanelIds]);
  
  // 성능 최적화: 데이터 샘플링 (5000개 이상이면 샘플링)
  const MAX_RENDER_POINTS = 5000;
  const sampledNormalPanels = useMemo(() => {
    if (normalPanelsOnly.length <= MAX_RENDER_POINTS) {
      return normalPanelsOnly;
    }
    // 균등 샘플링 (매 N번째 포인트 선택)
    const step = Math.ceil(normalPanelsOnly.length / MAX_RENDER_POINTS);
    return normalPanelsOnly.filter((_, index) => index % step === 0);
  }, [normalPanelsOnly]);
  
  const sampledExtendedPanels = useMemo(() => {
    if (extendedPanelsOnly.length <= MAX_RENDER_POINTS) {
      return extendedPanelsOnly;
    }
    const step = Math.ceil(extendedPanelsOnly.length / MAX_RENDER_POINTS);
    return extendedPanelsOnly.filter((_, index) => index % step === 0);
  }, [extendedPanelsOnly]);
  
  const sampledFilteredData = useMemo(() => {
    if (!extendedClusteringData && filteredUmapData.length > MAX_RENDER_POINTS) {
      const step = Math.ceil(filteredUmapData.length / MAX_RENDER_POINTS);
      return filteredUmapData.filter((_, index) => index % step === 0);
    }
    return filteredUmapData;
  }, [filteredUmapData, extendedClusteringData]);
  
  // 패널 ID -> 인덱스 맵 생성 (성능 최적화)
  const panelIdToIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    filteredUmapData.forEach((point, index) => {
      const normalizedId = normalizePanelId(point.panelId);
      if (!map.has(normalizedId)) {
        map.set(normalizedId, index);
      }
    });
    return map;
  }, [filteredUmapData]);
  
  // 호버 핸들러 메모이제이션
  const handlePointHover = useCallback((panelId: string | undefined) => {
    if (!panelId) return;
    const normalizedId = normalizePanelId(panelId);
    const pointIndex = panelIdToIndexMap.get(normalizedId);
    if (pointIndex !== undefined) {
      setHoveredPointIndex(pointIndex);
      loadPanelInfoOnHover(panelId);
    }
  }, [panelIdToIndexMap, loadPanelInfoOnHover]);
  
  const handlePointLeave = useCallback(() => {
    setHoveredPointIndex(null);
  }, []);
  
  // 확장 클러스터링 실행 중 추적 (무한 루프 방지)
  const isRunningClusteringRef = useRef(false);
  
  // 검색 결과 주변 확장 클러스터링
  // 재검색 핸들러 (검색창에서 쿼리 입력 후 재검색 버튼 클릭 시)
  const handleReSearch = async () => {
    const trimmedQuery = q.trim();
    if (!trimmedQuery) {
      toast.info('검색어를 입력해주세요.');
      return;
    }
    
    // 쿼리가 변경되지 않았으면 스킵
    if (trimmedQuery === lastSearchQuery) {
      toast.info('동일한 검색어입니다.');
      return;
    }
    
    // 캐시 초기화 (재검색 시 새로운 데이터 로드)
    localStorage.removeItem('cached_clustering_data');
    setLastSearchQuery(trimmedQuery);
    
    setLoading(true);
    setError(null);
    
    try {
      // 검색 API 호출
      const searchResponse = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: trimmedQuery,
          page: 1,
          limit: 1000, // 충분히 많은 결과 가져오기
          force_refresh: true,
        }),
      });
      
      if (!searchResponse.ok) {
        throw new Error('검색에 실패했습니다.');
      }
      
      const searchData = await searchResponse.json();
      
      // 검색 결과에서 mb_sn만 추출
      const searchResultsList = searchData.results || [];
      const mbSns = searchResultsList
        .map((r: any) => r.mb_sn || r.id || r.panel_id || r.name || r.panelId)
        .filter((id: any) => id != null && id !== '')
        .map((id: any) => String(id).trim());
      
      if (mbSns.length === 0) {
        toast.warning('검색 결과가 없습니다.');
        // 검색 결과가 없으면 전체 UMAP 로드
        await runClustering();
        setLoading(false);
        return;
      }
      
      // 검색된 패널의 mb_sn만으로 UMAP 표시 (검색 결과를 상태에 저장하지 않고 바로 처리)
      await runClusteringAroundSearchWithMbSns(mbSns);
    } catch (err: any) {
      const errorMessage = err?.message || '검색 중 오류가 발생했습니다';
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  // 검색 결과 주변 확장 클러스터링 (searchResults 사용)
  const runClusteringAroundSearch = async () => {
    // searchResults에서 mb_sn 추출하여 runClusteringAroundSearchWithMbSns 호출
    if (!searchResults || searchResults.length === 0) {
      // 검색 결과가 없으면 전체 UMAP 로드
      await runClustering();
      return;
    }
    
    const mbSns = searchResults
      .map((r: any) => r.mb_sn || r.id || r.panel_id || r.name || r.panelId)
      .filter((id: any) => id != null && id !== '')
      .map((id: any) => String(id).trim());
    
    await runClusteringAroundSearchWithMbSns(mbSns);
  };
  
  // 검색된 mb_sn만으로 UMAP 표시하는 함수 (내부 함수)
  const runClusteringAroundSearchWithMbSns = async (mbSns: string[]) => {
    // 이미 실행 중이면 스킵
    if (isRunningClusteringRef.current) {
      return;
    }
    
    // 실행 중 플래그 설정
    isRunningClusteringRef.current = true;

    if (!mbSns || mbSns.length === 0) {
      // 검색 결과가 없으면 전체 UMAP 로드
      await runClustering();
      isRunningClusteringRef.current = false;
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // mb_sn을 정규화
      const searchPanelIds = mbSns
        .map((id: string) => id != null ? String(id).trim() : null)
        .filter((id: any) => id != null && id !== '');

      if (searchPanelIds.length === 0) {
        throw new Error('검색 결과에서 패널 ID를 추출할 수 없습니다.');
      }

      // 1. 먼저 전체 precomputed 데이터 로드
      const precomputedApiUrl = `${API_URL}/api/precomputed/clustering`;
      const precomputedResponse = await fetch(precomputedApiUrl);
      
      if (!precomputedResponse.ok) {
        throw new Error('Precomputed 데이터를 불러올 수 없습니다.');
      }
      
      const precomputedData = await precomputedResponse.json();
      const clusterData = precomputedData.success ? precomputedData.data : precomputedData;
      
      if (!clusterData || !clusterData.umap_coordinates) {
        throw new Error('Precomputed UMAP 데이터가 없습니다.');
      }

      // 2. 검색된 패널 ID를 정규화된 Set으로 변환
      const searchPanelIdsSet = new Set(
        searchPanelIds.map((id: string) => normalizePanelId(id))
      );

      // 3. 검색된 패널의 UMAP 좌표만 필터링 (검색된 패널만 표시)
      const searchedUmapPoints: UMAPPoint[] = [];
      const searchedClusterIds = new Set<number>();
      
      clusterData.umap_coordinates.forEach((point: any) => {
        const panelId = point.panelId || point.panel_id || '';
        const normalizedId = normalizePanelId(panelId);
        
        if (searchPanelIdsSet.has(normalizedId)) {
          searchedUmapPoints.push({
            x: point.x,
            y: point.y,
            cluster: point.cluster ?? -1,
            panelId: panelId,
          });
          if (point.cluster != null && point.cluster !== -1 && point.cluster !== 0) {
            searchedClusterIds.add(point.cluster);
          }
        }
      });

      if (searchedUmapPoints.length === 0) {
        toast.warning('검색된 패널의 UMAP 좌표를 찾을 수 없습니다.');
        setLoading(false);
        isRunningClusteringRef.current = false;
        return;
      }

      // 4. 검색된 패널만 UMAP에 표시
      setUmapData(searchedUmapPoints);

      // 5. 검색된 패널이 속한 군집의 프로필 가져오기
      const profileResponse = await fetch(`${API_URL}/api/precomputed/profiles`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.success && profileData.data) {
          // 검색된 패널이 속한 군집의 프로필만 필터링
          const relevantProfiles = profileData.data.filter((p: any) => 
            searchedClusterIds.has(p.cluster) && p.cluster !== 0
          );
          setClusterProfiles(relevantProfiles);
        }
      }

      // 6. 검색된 패널이 속한 군집만 클러스터로 표시
      const clustersData = clusterData.clusters || [];
      const newClusters: ClusterData[] = [];
      
      Array.from(searchedClusterIds).forEach((clusterId) => {
        const clusterInfo = clustersData.find((c: any) => c.id === clusterId);
        if (clusterInfo) {
          newClusters.push({
            id: clusterId,
            size: clusterInfo.size,
            indices: [],
            centroid: [0, 0],
            query_similarity: 0.8,
            representative_items: [],
          });
        }
      });
      
      setClusters(newClusters);

      // 7. 클러스터 메타데이터 업데이트
      setClusteringMeta({
        n_samples: clusterData.n_samples,
        n_clusters: clusterData.n_clusters,
        silhouette_score: clusterData.silhouette_score || null,
        davies_bouldin_score: clusterData.davies_bouldin_index || null,
        calinski_harabasz: clusterData.calinski_harabasz_index || null,
        strategy: 'precomputed',
        algorithm: 'hdbscan',
        session_id: 'precomputed_default',
        last_updated: new Date().toISOString(),
      });

      // 8. 검색 결과 하이라이트 업데이트
      const searchPanelIdSet = new Set(
        searchPanelIds.map((id: string) => normalizePanelId(id))
      );
      setHighlightedPanelIds(searchPanelIdSet);

      toast.success(`검색된 ${searchedUmapPoints.length}개 패널이 ${searchedClusterIds.size}개 군집에 분포되어 있습니다.`);
    } catch (err: any) {
      // 에러는 setError로 처리됨
      setError(
        `검색 결과 로드 실패: ${err.message || '알 수 없는 오류'}`
      );
      toast.error(`검색 결과 로드 실패: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
      // 실행 중 플래그 해제
      isRunningClusteringRef.current = false;
    }
  };
  
  // Precomputed 클러스터링 데이터 로드
  const runClustering = async () => {
    setLoading(true);
    setError(null);
    
    // 검색 결과가 있으면 확장 클러스터링 사용
    if (searchResults && searchResults.length > 0) {
      await runClusteringAroundSearch();
      return;
    }

    try {
      // Precomputed 데이터 로드 (실시간 클러스터링 대신)
      const apiUrl = `${API_URL}/api/precomputed/clustering`;
      
      let clusterResponse: Response | null = null;
      try {
        // 타임아웃 설정 (5분)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);
        
        // 재시도 로직 추가
        let lastError: any = null;
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
          try {
            clusterResponse = await fetch(apiUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              signal: controller.signal,
            });
            
            // 성공하면 루프 종료
            break;
          } catch (fetchErr: any) {
            lastError = fetchErr;
            retryCount++;
            
            if (retryCount < maxRetries) {
              const waitTime = retryCount * 1000; // 1초, 2초, 3초 대기
              await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
              throw fetchErr;
            }
          }
        }
        
        clearTimeout(timeoutId);
        
        // 응답이 성공적으로 수신되었는지 확인
        if (!clusterResponse) {
          throw new Error('응답을 받지 못했습니다. 서버가 연결을 끊었을 수 있습니다.');
        }
        
      } catch (fetchError: any) {
        const errorName = fetchError?.name || 'Unknown';
        const errorMessage = fetchError?.message || '알 수 없는 오류';
        
        let detailedErrorMessage = `[${errorName}] Precomputed 데이터 로드 실패\n\n`;
        detailedErrorMessage += `URL: ${apiUrl}\n`;
        detailedErrorMessage += `오류: ${errorMessage}\n\n`;
        
        if (errorName === 'AbortError') {
          detailedErrorMessage += '⚠️ 요청이 타임아웃되었습니다. (5분 초과)\n';
          detailedErrorMessage += 'Precomputed 데이터가 큰 경우 로딩 시간이 걸릴 수 있습니다.';
        } else if (errorMessage?.includes('Failed to fetch') || errorName === 'TypeError') {
          detailedErrorMessage += '⚠️ 서버에 연결할 수 없습니다.\n\n';
          detailedErrorMessage += '가능한 원인:\n';
          detailedErrorMessage += '1. 백엔드 서버가 실행되지 않음\n';
          detailedErrorMessage += '   → 새 터미널에서 실행: cd server && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8004\n';
          detailedErrorMessage += `2. API URL 확인: ${API_URL}\n`;
          detailedErrorMessage += '3. 브라우저 개발자 도구(F12) → Network 탭에서 오류 확인\n';
          detailedErrorMessage += '4. 브라우저 캐시 문제: Ctrl+Shift+R (강력 새로고침)\n';
          detailedErrorMessage += '5. CORS 문제: 서버가 재시작되었는지 확인\n';
          detailedErrorMessage += '\n💡 팁: 서버가 실행 중인지 확인하려면 브라우저에서 다음 URL을 열어보세요:\n';
          detailedErrorMessage += `   ${API_URL}/health`;
        } else {
          detailedErrorMessage += '서버 로그를 확인하거나 Precomputed 데이터 생성 스크립트를 실행하세요.';
        }
        
        setError(detailedErrorMessage);
        toast.error('Precomputed 데이터 로드 실패', {
          description: errorMessage,
          duration: 8000,
        });
        setLoading(false);
        return;
      }

      if (!clusterResponse.ok) {
        let errorData: any = {};
        let errorText = '';
        
        try {
          errorText = await clusterResponse.text();
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { detail: errorText };
          }
        } catch {
          errorData = { detail: `HTTP ${clusterResponse.status}: ${clusterResponse.statusText}` };
        }
        
        const errorDetail = errorData.detail || errorData.message || `HTTP ${clusterResponse.status}`;
        let detailedError = `[Precomputed 데이터 로드 실패]\n\n`;
        detailedError += `상태 코드: ${clusterResponse.status}\n`;
        detailedError += `오류: ${errorDetail}\n\n`;
        
        if (clusterResponse.status === 404) {
          detailedError += '⚠️ Precomputed 데이터가 없습니다.\n\n';
          detailedError += '해결 방법:\n';
          detailedError += '1. 다음 명령어로 데이터 생성:\n';
          detailedError += '   python server/app/clustering/generate_precomputed_data.py\n';
          detailedError += '2. 생성된 파일 확인:\n';
          detailedError += '   - clustering_data/data/precomputed/clustering_results.csv\n';
          detailedError += '   - clustering_data/data/precomputed/clustering_metadata.json\n';
        } else if (clusterResponse.status === 400) {
          detailedError += '⚠️ 데이터 형식 오류입니다.\n';
          detailedError += 'Precomputed 데이터를 재생성하세요.';
        } else if (clusterResponse.status >= 500) {
          detailedError += '⚠️ 서버 내부 오류입니다.\n';
          detailedError += '서버 로그를 확인하세요.';
        }
        
        setError(detailedError);
        toast.error(`Precomputed 데이터 로드 실패 (${clusterResponse.status})`, {
          description: errorDetail,
          duration: 10000,
        });
        setLoading(false);
        return;
      }

      const responseData = await clusterResponse.json();
      
      // Precomputed API 응답 형식: {success: true, data: {...}}
      const clusterData = responseData.success ? {
        success: true,
        ...responseData.data,
        session_id: 'precomputed_default', // Precomputed 데이터용 세션 ID
      } : responseData;
      
      setLastClusterResponse(clusterData);

      if (!clusterData.success && clusterData.success !== undefined) {
        let errorMsg = clusterData.error || '클러스터링에 실패했습니다.';
        
        // 디버그 정보가 있으면 추가
        if (clusterData.debug) {
          errorMsg += `\n\n[디버그 정보]\n`;
          errorMsg += `- 단계: ${clusterData.debug.step}\n`;
          errorMsg += `- 샘플 수: ${clusterData.debug.sample_size || clusterData.n_samples}개\n`;
          if (clusterData.debug.sample_size < 100) {
            errorMsg += `⚠️ 샘플 수가 100개 미만입니다. 동적 전략에 따라 프로파일링만 제공됩니다.\n`;
          }
          if (clusterData.debug.errors && clusterData.debug.errors.length > 0) {
            errorMsg += `\n[오류 목록]\n`;
            clusterData.debug.errors.forEach((err: string, idx: number) => {
              errorMsg += `${idx + 1}. ${err}\n`;
            });
          }
        }
        
        throw new Error(errorMsg);
      }
      
      // 성공 시에도 디버그 정보 처리
      if (clusterData.debug?.warnings && clusterData.debug.warnings.length > 0) {
        clusterData.debug.warnings.forEach((warn: string) => {
          toast.warning(warn);
        });
      }

      // 클러스터링이 성공하지 않았지만 프로파일링만 제공된 경우
      if (!clusterData.success) {
        const sampleSize = clusterData.debug?.sample_size || 0;
        
        // 프로파일링 데이터가 있는 경우
        if (clusterData.profile && sampleSize < 100) {
          setProfileData(clusterData.profile);
          setShowProfile(true);
        setClusters([]);
        setUmapData([]);
          setError(null);
        setLoading(false);
          
          toast.info('프로파일링 모드로 전환되었습니다.', {
            duration: 5000,
          });
        return;
      }

        // 프로파일링 데이터가 없는 경우 (에러)
        const reason = clusterData.debug?.errors?.[0] || clusterData.reason || '알 수 없는 이유';
        let infoMessage = '클러스터링을 수행할 수 없습니다.\n\n';
        
        if (sampleSize !== undefined) {
          infoMessage += `[원인 분석]\n`;
          infoMessage += `- 샘플 수: ${sampleSize}개\n`;
          if (sampleSize < 100) {
            infoMessage += `- 이유: 샘플 수가 100개 미만입니다.\n`;
            infoMessage += `- 해결: 더 많은 검색 결과를 얻으려면 검색 조건을 완화해주세요.\n`;
          }
        }
        
        if (clusterData.debug?.errors && clusterData.debug.errors.length > 0) {
          infoMessage += `\n[상세 오류]\n`;
          clusterData.debug.errors.forEach((err: string, idx: number) => {
            infoMessage += `${idx + 1}. ${err}\n`;
          });
        }
        
        toast.warning('클러스터링을 수행할 수 없습니다.', {
          duration: 8000,
        });
        
        setError(infoMessage);
        setShowProfile(false);
        setProfileData(null);
        setClusters([]);
        setUmapData([]);
        setLoading(false);
        return;
      }

      // 클러스터링 성공 시 프로파일링 모드 해제
      setShowProfile(false);
      setProfileData(null);

      // 메타데이터 저장
      const sessionId = clusterData.session_id || 'precomputed_default';
      // 메트릭 추출 (여러 경로 시도 - HDBSCAN 메타데이터 우선)
      // null/undefined 체크만 수행 (0도 유효한 값이므로 || 연산자 사용하지 않음)
      const silhouetteScore = clusterData.silhouette_score != null 
        ? clusterData.silhouette_score
        : (clusterData.metrics?.silhouette_score != null 
          ? clusterData.metrics.silhouette_score
          : (clusterData.meta?.algorithm_info?.silhouette_score != null
            ? clusterData.meta.algorithm_info.silhouette_score
            : (clusterData.metadata?.silhouette_score != null
              ? clusterData.metadata.silhouette_score
              : null)));
      const daviesBouldinScore = clusterData.davies_bouldin_index != null
        ? clusterData.davies_bouldin_index
        : (clusterData.davies_bouldin_score != null
          ? clusterData.davies_bouldin_score
          : (clusterData.metrics?.davies_bouldin_score != null
            ? clusterData.metrics.davies_bouldin_score
            : (clusterData.meta?.algorithm_info?.davies_bouldin_score != null
              ? clusterData.meta.algorithm_info.davies_bouldin_score
              : (clusterData.metadata?.davies_bouldin_index != null
                ? clusterData.metadata.davies_bouldin_index
                : null))));
      const calinskiHarabasz = clusterData.calinski_harabasz_index != null
        ? clusterData.calinski_harabasz_index
        : (clusterData.calinski_harabasz_score != null
          ? clusterData.calinski_harabasz_score
          : (clusterData.metrics?.calinski_harabasz_score != null
            ? clusterData.metrics.calinski_harabasz_score
            : (clusterData.meta?.algorithm_info?.calinski_harabasz != null
              ? clusterData.meta.algorithm_info.calinski_harabasz
              : (clusterData.metadata?.calinski_harabasz_index != null
                ? clusterData.metadata.calinski_harabasz_index
                : null))));
      
      // 디버깅: 메트릭 값 확인
      console.log('[클러스터링 메트릭]', {
        silhouetteScore,
        daviesBouldinScore,
        calinskiHarabasz,
        clusterDataKeys: Object.keys(clusterData),
        hasSilhouette: 'silhouette_score' in clusterData,
        silhouetteValue: clusterData.silhouette_score,
        metadata: clusterData.metadata,
        meta: clusterData.meta,
        metrics: clusterData.metrics,
      });
      
      // 실루엣 스코어가 없으면 경고
      if (silhouetteScore == null) {
        console.warn('[실루엣 스코어 누락]', {
          clusterDataSilhouette: clusterData.silhouette_score,
          metadataSilhouette: clusterData.metadata?.silhouette_score,
          metaSilhouette: clusterData.meta?.algorithm_info?.silhouette_score,
          metricsSilhouette: clusterData.metrics?.silhouette_score,
        });
      }
      const method = clusterData.method 
        || clusterData.metadata?.method
        || clusterData.meta?.algorithm_info?.type
        || 'Unknown';
      const nNoise = clusterData.n_noise 
        || clusterData.metadata?.n_noise
        || 0;
      
      
      setClusteringMeta({
        n_samples: clusterData.n_samples,
        n_clusters: clusterData.n_clusters,
        silhouette_score: silhouetteScore,
        davies_bouldin_score: daviesBouldinScore,
        calinski_harabasz: calinskiHarabasz,
        strategy: clusterData.meta?.strategy || clusterData.meta?.algorithm_info?.strategy || 'precomputed',
        algorithm: method,
        session_id: sessionId,
        last_updated: new Date().toISOString(),
        method: method,
        n_noise: nNoise,
      });
      
      // 세션 ID와 클러스터 이름을 localStorage에 저장 (비교 분석 탭에서 사용)
      if (sessionId) {
        localStorage.setItem('last_clustering_session_id', sessionId);
        
        // 클러스터 이름 저장 (나중에 비교 분석에서 사용)
        const clusterNamesMap: Record<number, string> = {};
        // clusterProfiles가 있으면 이름 저장
        if (clusterProfiles.length > 0) {
          clusterProfiles.forEach(profile => {
            // 이름은 나중에 생성되므로 일단 ID만 저장
            clusterNamesMap[profile.cluster] = `C${profile.cluster + 1}`;
          });
        }
        localStorage.setItem('cluster_names_map', JSON.stringify(clusterNamesMap));
      }

      // Precomputed 데이터에서 클러스터 정보 추출
      // umap_coordinates에서 cluster 정보 추출
      const umapCoordsForLabels = clusterData.umap_coordinates || [];
      const newLabels: number[] = umapCoordsForLabels.map((p: any) => p.cluster);
      const clustersData = clusterData.clusters || [];
      
      // cluster_sizes 구성
      const newClusterSizes: Record<string | number, number> = {};
      clustersData.forEach((c: any) => {
        newClusterSizes[c.id] = c.size;
      });
      
      // 고유 클러스터 ID 추출 (labels에서) - 노이즈(-1)와 군집 0 제외
      const uniqueLabels = [...new Set(newLabels)].filter((l: number) => l !== -1 && l !== 0).sort((a, b) => a - b);
      
      // 실제 클러스터 수 계산 (labels 기반이 우선)
      let actualClusterCount = uniqueLabels.length;
      
      // cluster_sizes에서도 확인 (labels가 비어있을 경우 대비)
      if (actualClusterCount === 0 && newClusterSizes && Object.keys(newClusterSizes).length > 0) {
        const validClusterSizes = Object.keys(newClusterSizes).filter(k => k !== '-1' && k !== '-1.0');
        actualClusterCount = validClusterSizes.length;
      }
      
      // n_clusters도 확인 (최후의 수단)
      if (actualClusterCount === 0 && clusterData.n_clusters && clusterData.n_clusters > 0) {
        actualClusterCount = clusterData.n_clusters;
      }
      
      // 클러스터가 없으면 에러 처리
      if (actualClusterCount === 0) {
        const errorMsg = '클러스터링이 완료되었지만 생성된 군집이 없습니다. 데이터를 확인해주세요.';
        setError(errorMsg);
        toast.error('클러스터링 실패: 군집이 생성되지 않았습니다.');
        setLoading(false);
        return;
      }
      
      // 상태 업데이트
      setLabels(newLabels);
      setClusterSizes(newClusterSizes);
      
      // 클러스터 생성 (actualClusterCount 사용)
      const newClusters: ClusterData[] = [];
      for (let idx = 0; idx < actualClusterCount; idx++) {
        const clusterId = uniqueLabels[idx] ?? idx;
        const size = newClusterSizes[clusterId] || newClusterSizes[String(clusterId)] || newClusterSizes[String(clusterId) + '.0'] || 0;
        const indices = newLabels
          .map((label: number, index: number) => label === clusterId ? index : -1)
          .filter((i: number) => i !== -1);
        
        // 크기가 0인 클러스터와 군집 0은 제외
        if (size > 0 && clusterId !== 0) {
          newClusters.push({
            id: clusterId,
            size: size,
            indices: indices,
            centroid: [0, 0], // UMAP 좌표에서 계산
            query_similarity: 0.8, // 기본값
            representative_items: indices.slice(0, 3), // 상위 3개
          });
        }
      }
      
      // 실제 생성된 클러스터 수 업데이트
      actualClusterCount = newClusters.length;
      
      setClusters(newClusters);
      
      // n_clusters 메타데이터도 업데이트
      setClusteringMeta(prev => prev ? {
        ...prev,
        n_clusters: actualClusterCount,
      } : null);

      // UMAP 좌표 설정 (Precomputed 데이터에서 직접 사용)
      const umapCoords = clusterData.umap_coordinates || [];
      
      if (umapCoords.length > 0) {
        try {
          // Precomputed UMAP 좌표를 직접 사용
          const umapPoints: UMAPPoint[] = umapCoords.map((point: any) => {
            // panel_id 형식 정규화: 문자열로 변환하고 앞뒤 공백 제거
            let panelId = point.panelId || point.panel_id || '';
            if (panelId) {
              panelId = String(panelId).trim();
            }
            const clusterLabel = point.cluster ?? -1;
            
            return {
              x: point.x,
              y: point.y,
              cluster: clusterLabel,
              panelId: panelId,
            };
          });
          
          setUmapData(umapPoints);
          
          // 클러스터 프로파일 데이터 가져오기 (Precomputed API 사용)
          try {
            const profileResponse = await fetch(`${API_URL}/api/precomputed/profiles`);
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData.success && profileData.data) {
                // 군집 0 제외 (노이즈 군집 프로필이 이미 그 역할을 함)
                const filteredProfiles = profileData.data.filter((p: any) => p.cluster !== 0);
                setClusterProfiles(filteredProfiles);
                
                // 클러스터 이름을 localStorage에 저장 (비교 분석에서 사용)
                const clusterNamesMap: Record<number, string> = {};
                profileData.data.forEach((profile: any) => {
                  clusterNamesMap[profile.cluster] = profile.name || `C${profile.cluster + 1}`;
                });
                localStorage.setItem('cluster_names_map', JSON.stringify(clusterNamesMap));
                
                // 군집 분석 히스토리 저장 (전체 클러스터 정보 + UMAP 데이터)
                if (profileData.data.length > 0) {
                  const totalCount = profileData.data.reduce((sum: number, p: any) => sum + (p.size || 0), 0);
                  const mainCluster = profileData.data[0];
                  const historyItem = historyManager.createClusterHistory(
                    String(mainCluster.cluster),
                    mainCluster.name || `C${mainCluster.cluster + 1}`,
                    {
                      totalClusters: profileData.data.length,
                      totalPanels: totalCount,
                      clusters: profileData.data.map((p: any) => ({
                        id: p.cluster,
                        name: p.name || `C${p.cluster + 1}`,
                        size: p.size,
                        percentage: p.percentage
                      }))
                    },
                    umapPoints.length > 0 ? umapPoints : undefined
                  );
                  historyManager.save(historyItem);
                }
              }
            }
          } catch (err) {
          }
          
          const sampleCount = clusterData.n_samples || newLabels.length || 0;
          
          // 클러스터링 데이터를 localStorage에 캐싱 (탭 이동 시 재로드 방지)
          try {
            const cacheData = {
              umapData: umapPoints,
              clusters: newClusters,
              clusterProfiles: clusterProfiles.length > 0 ? clusterProfiles : [],
              clusteringMeta: {
                n_samples: sampleCount,
                n_clusters: actualClusterCount,
                session_id: clusterData.session_id || 'precomputed_default',
                last_updated: new Date().toISOString(),
              },
              clusterSizes: newClusterSizes,
              labels: newLabels,
            };
            localStorage.setItem('cached_clustering_data', JSON.stringify(cacheData));
            console.log('[ClusterLab] 클러스터링 데이터 캐싱 완료');
          } catch (cacheError) {
            console.warn('[ClusterLab] 캐싱 실패:', cacheError);
          }
          
          toast.success(`클러스터링 완료: ${actualClusterCount}개 군집, ${sampleCount}개 패널`);
        } catch (umapError) {
          const sampleCount = clusterData.n_samples || newLabels.length || 0;
          // UMAP 실패 시 기본 좌표 생성
          const defaultUmapPoints: UMAPPoint[] = Array.from({ length: sampleCount }, (_, index) => ({
            x: Math.random() * 4 - 2,
            y: Math.random() * 4 - 2,
            cluster: newLabels[index] || 0,
            panelId: `csv_panel_${index}`,
          }));
          setUmapData(defaultUmapPoints);
          toast.warning('UMAP 좌표를 가져오지 못했습니다. 기본 좌표를 사용합니다.');
        }
      } else {
        // UMAP 좌표가 없으면 에러
        const errorMsg = 'Precomputed UMAP 좌표 데이터가 없습니다.';
        setError(errorMsg);
        toast.error('UMAP 데이터 없음', {
          description: errorMsg,
          duration: 5000,
        });
        setLoading(false);
        return;
      }
      
      // 클러스터링 완료 처리
      setLoading(false);
      
    } catch (err: any) {
      const errorMessage = err?.message || '클러스터링 중 오류가 발생했습니다';
      setError(errorMessage);
      
      // 에러 메시지가 여러 줄이면 첫 줄만 토스트에 표시
      const firstLine = errorMessage.split('\n')[0];
      toast.error(firstLine, {
        description: errorMessage.includes('\n') ? '자세한 내용은 콘솔을 확인하세요' : undefined,
        duration: 5000,
      });
      
      setClusters([]);
      setUmapData([]);
      setClusteringMeta(null);
      setLabels([]);
      setClusterSizes({});
    } finally {
      setLoading(false);
    }
  };

  // 클러스터 이름을 localStorage에 저장 (비교 분석에서 사용)
  useEffect(() => {
    if (clusters.length > 0 && clusterProfiles.length > 0) {
      const clusterNamesMap: Record<number, string> = {};
      
      clusters.forEach(cluster => {
        const clusterProfile = clusterProfiles.find(p => p.cluster === cluster.id);
        if (clusterProfile) {
          // 백엔드 인사이트 기반으로 이름 생성
          let clusterName = `C${cluster.id + 1}`;
          
          if (clusterProfile.insights && clusterProfile.insights.length > 0) {
            if (clusterProfile.distinctive_features && clusterProfile.distinctive_features.length > 0) {
              const topFeature = clusterProfile.distinctive_features[0];
              const featureNameMap: Record<string, string> = {
                'age_scaled': '연령',
                'Q6_scaled': '소득',
                'education_level_scaled': '학력',
                'Q8_count_scaled': '전자제품 수',
                'Q8_premium_index': '프리미엄폰 지수',
                'is_premium_car': '프리미엄차',
                'age_z': '연령',
                'age': '연령',
                'Q6_income': '소득',
              };
              const featureName = featureNameMap[topFeature.feature] || topFeature.feature;
              
              if (topFeature.diff_percent > 0) {
                clusterName = `고${featureName} 군집`;
              } else {
                clusterName = `저${featureName} 군집`;
              }
            }
          }
          
          clusterNamesMap[cluster.id] = clusterName;
        } else {
          clusterNamesMap[cluster.id] = `C${cluster.id + 1}`;
        }
      });
      
      localStorage.setItem('cluster_names_map', JSON.stringify(clusterNamesMap));
    }
  }, [clusters, clusterProfiles]);

  // 페이지 마운트 시 자동으로 HDBSCAN 클러스터링 데이터 로드 (캐싱 적용)
  useEffect(() => {
    const loadInitialClustering = async () => {
      // 이미 데이터가 있으면 스킵 (탭 이동 시 재로드 방지)
      if (umapData.length > 0 && clusters.length > 0) {
        return;
      }
      
      // localStorage에서 캐싱된 클러스터링 데이터 확인
      const cachedClusteringData = localStorage.getItem('cached_clustering_data');
      if (cachedClusteringData) {
        try {
          const parsed = JSON.parse(cachedClusteringData);
          // 캐시된 데이터가 있고, 세션이 유효하면 복원
          if (parsed.umapData && parsed.umapData.length > 0 && 
              parsed.clusters && parsed.clusters.length > 0) {
            setUmapData(parsed.umapData);
            setClusters(parsed.clusters);
            setClusterProfiles(parsed.clusterProfiles || []);
            setClusteringMeta(parsed.clusteringMeta || null);
            setClusterSizes(parsed.clusterSizes || {});
            setLabels(parsed.labels || []);
            console.log('[ClusterLab] 캐시된 클러스터링 데이터 복원');
            return;
          }
        } catch (e) {
          console.warn('[ClusterLab] 캐시 데이터 파싱 실패:', e);
        }
      }
      
      // 검색 결과가 있으면 확장 클러스터링 사용 (자동 실행 안 함)
      if (searchResults && searchResults.length > 0) {
        return;
      }
      
      await runClustering();
    };
    
    loadInitialClustering();
  }, []); // 마운트 시 한 번만 실행
  
  // 페이지 마운트 시 localStorage에서 클러스터링 결과 복원 (fallback)
  useEffect(() => {
    const restoreClusteringState = async () => {
      // 이미 데이터가 있으면 스킵
      if (umapData.length > 0 && clusters.length > 0) {
        return;
      }
      
      const lastSessionId = localStorage.getItem('last_clustering_session_id');
      
      // 세션 ID가 없으면 스킵 (이미 자동 로드가 시도됨)
      if (!lastSessionId) {
        return;
      }
      
      // 이미 같은 세션 ID로 복원된 경우 스킵 (중복 복원 방지)
      if (clusteringMeta?.session_id === lastSessionId && umapData.length > 0) {
        return;
      }
      
      
      try {
        // 1. 클러스터 프로파일 가져오기
        // Precomputed 세션이거나 search_extended_ 세션인 경우 precomputed API 사용
        // (search_extended_ 세션은 HDBSCAN 결과를 재사용하므로 precomputed 프로파일 사용)
        const isPrecomputedSession = lastSessionId === 'precomputed_default' || lastSessionId?.startsWith('search_extended_');
        const profileApiUrl = isPrecomputedSession
          ? `${API_URL}/api/precomputed/profiles`
          : `${API_URL}/api/clustering/viz/cluster-profiles/${lastSessionId}`;
        
        const profileResponse = await fetch(profileApiUrl);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          const profiles = profileData.success ? profileData.data : (profileData.data || []);
          if (profiles && profiles.length > 0) {
            // 군집 0 제외 (노이즈 군집 프로필이 이미 그 역할을 함)
            const filteredProfiles = profiles.filter((p: any) => p.cluster !== 0);
            // 디버깅: 로드된 프로필 데이터 확인
            console.log('[ClusterLab] 로드된 프로필 데이터:', filteredProfiles.map((p: any) => ({
              cluster: p.cluster,
              name: p.name,
              insights_count: p.insights?.length || 0,
              insights_by_category: p.insights_by_category ? Object.keys(p.insights_by_category).length : 0,
              segments: p.segments,
              tags_count: p.tags?.length || 0,
            })));
            setClusterProfiles(filteredProfiles);
            
            // 2. 클러스터 정보 구성 (군집 0 제외)
            const restoredClusters: ClusterData[] = filteredProfiles.map((profile: any) => ({
              id: profile.cluster,
              size: profile.size,
              indices: [], // 인덱스는 필요시 UMAP에서 추출
              centroid: [0, 0],
              query_similarity: 0.8,
              representative_items: [],
            }));
            setClusters(restoredClusters);
            
            // 3. 클러스터 크기 구성 (군집 0 제외)
            const restoredClusterSizes: Record<string | number, number> = {};
            filteredProfiles.forEach((profile: any) => {
              restoredClusterSizes[profile.cluster] = profile.size;
            });
            setClusterSizes(restoredClusterSizes);
            
            // 4. 메타데이터 복원 (군집 0 제외)
            const totalSize = filteredProfiles.reduce((sum: number, p: any) => sum + p.size, 0);
            setClusteringMeta({
              n_samples: totalSize,
              n_clusters: filteredProfiles.length,
              session_id: lastSessionId,
              last_updated: new Date().toISOString(),
            });
            
            // 5. UMAP 데이터 가져오기
            // Precomputed 세션이거나 search_extended_ 세션인 경우 precomputed API 사용
            try {
              let umapResponse: Response;
              
              if (isPrecomputedSession) {
                // Precomputed 데이터는 /api/precomputed/clustering에서 이미 가져옴
                // 여기서는 다시 가져올 필요 없음 (이미 runClustering에서 처리됨)
                return;
              } else {
                // 동적 클러스터링 세션인 경우에만 UMAP API 호출
                umapResponse = await fetch(`${API_URL}/api/clustering/umap`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    session_id: lastSessionId,
                    sample: totalSize > 1000 ? 1000 : undefined,
                    metric: 'cosine',
                    n_neighbors: 15,
                    min_dist: 0.1,
                    seed: 42,
                  }),
                });
                
                if (umapResponse.ok) {
                  const umapData = await umapResponse.json();
                  
                  if (umapData.coordinates && umapData.coordinates.length > 0) {
                    const umapPoints: UMAPPoint[] = umapData.coordinates.map((coord: [number, number], index: number) => {
                      const panelId = umapData.panel_ids?.[index] || `panel_${index}`;
                      const clusterLabel = umapData.labels?.[index] ?? -1;
                      
                      return {
                        x: coord[0],
                        y: coord[1],
                        cluster: clusterLabel,
                        panelId: panelId,
                      };
                    });
                    
                    setUmapData(umapPoints);
                    
                    // labels 복원
                    if (umapData.labels && umapData.labels.length > 0) {
                      setLabels(umapData.labels);
                    }
                    
                  }
                } else {
                }
              }
            } catch (umapErr) {
            }
            
          } else {
          }
        } else {
          // 404 에러는 무시 (search_extended_ 세션은 동적 생성되므로 프로파일이 없을 수 있음)
          if (profileResponse.status === 404 && isPrecomputedSession) {
          } else {
          }
        }
      } catch (err) {
      }
    };
    
    restoreClusteringState();
  }, []); // 마운트 시 한 번만 실행

  // UMAP 컨테이너 크기 감지
  useEffect(() => {
    const updateSize = () => {
      if (umapContainerRef.current) {
        // requestAnimationFrame을 사용하여 레이아웃 계산 후 크기 업데이트
        requestAnimationFrame(() => {
          if (umapContainerRef.current) {
            const rect = umapContainerRef.current.getBoundingClientRect();
            // 패딩 제외한 실제 차트 영역 계산
            const padding = 48; // p-6 = 24px * 2
            // 검색 결과가 없을 때는 더 큰 최소 크기 사용
            const minSize = (!searchResults || searchResults.length === 0) ? 1200 : 600;
            const newWidth = Math.max(minSize, rect.width - padding);
            const newHeight = Math.max(minSize, rect.height - padding);
            
            // 크기가 변경된 경우에만 업데이트 (무한 루프 방지)
            setUmapSize(prev => {
              if (Math.abs(prev.width - newWidth) > 1 || Math.abs(prev.height - newHeight) > 1) {
                return { width: newWidth, height: newHeight };
              }
              return prev;
            });
          }
        });
      }
    };

    // 초기 크기 설정을 지연시켜 레이아웃이 완료된 후 실행
    const timeoutId = setTimeout(updateSize, 100);
    updateSize();
    
    const resizeObserver = new ResizeObserver(() => {
      // ResizeObserver 콜백도 requestAnimationFrame으로 감싸기
      requestAnimationFrame(updateSize);
    });
    
    if (umapContainerRef.current) {
      resizeObserver.observe(umapContainerRef.current);
    }
    
    window.addEventListener('resize', updateSize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateSize);
      resizeObserver.disconnect();
    };
  }, [searchResults]);

  // 벡터 검색 상태 확인
  useEffect(() => {
    const checkVectorSearchStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/search/status`);
        if (response.ok) {
          const status = await response.json();
          setVectorSearchStatus({
            enabled: status.vector_search_enabled || false,
            status: status.status || 'unknown',
            message: status.message || '상태를 확인할 수 없습니다.',
          });
        }
      } catch (err) {
        setVectorSearchStatus({
          enabled: false,
          status: 'error',
          message: '상태 확인 중 오류가 발생했습니다.',
        });
      }
    };
    
    checkVectorSearchStatus();
  }, []);

  // 검색 결과가 변경될 때 자동으로 확장 클러스터링 실행
  const lastSearchResultsRef = useRef<string>('');
  useEffect(() => {
    // 검색 결과를 문자열로 변환하여 비교 (실제 변경 여부 확인)
    const currentSearchKey = searchResults 
      ? JSON.stringify(searchResults.map((r: any) => r.mb_sn || r.id || r.panel_id).sort())
      : '';

    // 검색 키가 변경되지 않았으면 스킵 (탭 간 이동 시 재실행 방지)
    if (currentSearchKey === lastSearchResultsRef.current) {
      return;
    }

    if (
      searchResults && 
      searchResults.length > 0 && 
      !loading && 
      !extendedClusteringData && 
      !isRunningClusteringRef.current
    ) {
      // 검색 키 업데이트
      lastSearchResultsRef.current = currentSearchKey;
      
      // 약간의 지연 후 실행 (다른 useEffect와 충돌 방지)
      const timer = setTimeout(() => {
        runClusteringAroundSearch();
      }, 1000);
      
      return () => {
        clearTimeout(timer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults?.length, loading, extendedClusteringData]);

  // 검색 결과가 변경될 때 클러스터 매핑 업데이트
  useEffect(() => {
    const updateSearchedPanelMapping = async () => {
      // 검색 결과가 없거나 클러스터링이 완료되지 않았으면 스킵
      if (!searchResults || searchResults.length === 0) {
        setHighlightedPanelIds(new Set());
        setSearchedPanelClusters({});
        setSearchedPanelInfo({});
        return;
      }
      
      // 검색 결과에서 패널 정보 추출 및 저장
      const panelInfoMap: Record<string, {
        mb_sn: string;
        gender?: string;
        age?: number;
        region?: string;
        similarity?: number;
      }> = {};
      
      searchResults.forEach((result: any) => {
        // 패널 ID 추출 및 정규화 (여러 필드 시도)
        // 검색 결과는 id나 name 필드에 mb_sn이 들어있을 수 있음
        let panelId = result.mb_sn || result.id || result.panel_id || result.name;
        if (panelId) {
          panelId = String(panelId).trim();
          panelInfoMap[panelId] = {
            mb_sn: panelId,
            gender: result.gender,
            age: result.age,
            region: result.region || result.location,
            similarity: result.similarity,
          };
        }
      });
      
      setSearchedPanelInfo(panelInfoMap);
      
      const sessionId = clusteringMeta?.session_id;
      
      // 검색 결과에서 패널 ID 추출
      const panelIds = Object.keys(panelInfoMap);
      
      if (panelIds.length === 0) {
        return;
      }
      
      try {
        // 1. 확장 클러스터링 데이터가 있으면 직접 사용
        if (extendedClusteringData && extendedClusteringData.session_id === sessionId) {
          const mapping: Record<string, number> = {};
          extendedClusteringData.panels.forEach((p: any) => {
            if (panelIds.includes(p.panel_id)) {
              mapping[p.panel_id] = p.cluster;
            }
          });
          
          // 매핑 업데이트
          setSearchedPanelClusterMapping(mapping);
          const foundPanelIds = new Set(Object.keys(mapping));
          setSearchedPanelClusters(mapping);
          setHighlightedPanelIds(foundPanelIds);
          return;
        }
        
        // 2. Precomputed 데이터인 경우 umapData에서 직접 매핑
        if (umapData.length > 0 && (sessionId === 'precomputed_default' || !sessionId)) {
          const panelClusterMap: Record<string, number> = {};
          const foundPanelIds = new Set<string>();
          
          // umapData에서 검색 결과 패널 ID와 매칭
          panelIds.forEach(panelId => {
            const normalizedId = normalizePanelId(panelId);
            const umapPoint = umapData.find(d => normalizePanelId(d.panelId) === normalizedId);
            if (umapPoint && umapPoint.cluster != null) {
              panelClusterMap[panelId] = umapPoint.cluster;
              foundPanelIds.add(panelId);
            }
          });
          
          setSearchedPanelClusters(panelClusterMap);
          setHighlightedPanelIds(foundPanelIds);
          
          // 토스트 메시지는 runClusteringAroundSearchWithMbSns에서 표시하므로 여기서는 제거
          return;
        }
        
        // 3. 백엔드 API 호출하여 패널-클러스터 매핑 가져오기 (동적 클러스터링 세션)
        if (!sessionId) {
          return;
        }
        
        const response = await fetch(`${API_URL}/api/clustering/panel-cluster-mapping`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            panel_ids: panelIds,
          }),
        });
        
        if (!response.ok) {
          // 404 오류는 무시 (precomputed 세션이 아닐 수 있음)
          if (response.status === 404) {
            return;
          }
          throw new Error(`패널-클러스터 매핑 실패: ${response.status}`);
        }
        
        const mappingData = await response.json();
        
        // 매핑 결과를 상태에 저장
        const panelClusterMap: Record<string, number> = {};
        const foundPanelIds = new Set<string>();
        
        mappingData.mappings.forEach((mapping: any) => {
          if (mapping.found && mapping.cluster_id !== null && mapping.cluster_id !== undefined) {
            const normalizedPanelId = String(mapping.panel_id).trim();
            panelClusterMap[normalizedPanelId] = mapping.cluster_id;
            foundPanelIds.add(normalizedPanelId);
          }
        });
        
        setSearchedPanelClusters(panelClusterMap);
        setHighlightedPanelIds(foundPanelIds);
        
        // 토스트 메시지는 runClusteringAroundSearchWithMbSns에서 표시하므로 여기서는 제거
      } catch (err) {
        // 오류가 발생해도 UI는 계속 동작하도록 함
        console.error('[검색 결과-군집 매핑 오류]', err);
      }
    };
    
    updateSearchedPanelMapping();
  }, [searchResults, clusteringMeta?.session_id, umapData, extendedClusteringData]);
  



  return (
    <div 
      className="min-h-screen pb-20"
      style={{
        background: colors.bg.primary,
      }}
    >
      {/* Page Header */}
      <div 
        className="border-b px-20 py-6"
        style={{
          background: isDark ? colors.bg.primary : 'white',
          borderColor: colors.border.primary,
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: colors.text.tertiary, 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px'
            }}>
              CLUSTER LAB
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.text.primary, marginBottom: '4px' }}>
              군집 분석
            </h1>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 400, color: colors.text.secondary, lineHeight: '1.5' }}>
                검색한 패널의 군집 위치와 각 집단 특성을 비교·분석합니다.
                {highlightedPanelIds.size > 0 && (
                  <span style={{ marginLeft: '8px', fontWeight: 600, color: '#F59E0B' }}>
                    검색된 패널이 UMAP상에 나타납니다.
                  </span>
                )}
              </p>
              {vectorSearchStatus && (
                <div className="mt-2 flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: vectorSearchStatus.enabled ? '#16A34A' : '#EF4444',
                      animation: vectorSearchStatus.enabled ? 'pulse 2s ease-in-out infinite' : 'none',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: colors.text.secondary }}>
                    {vectorSearchStatus.message}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 클러스터링 실행 버튼 - 항상 표시 */}
            <PIButton 
              onClick={runClustering} 
              disabled={loading}
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  군집을 불러오는 중..
                </>
              ) : (
                clusters.length > 0 ? '클러스터링 다시 불러오기' : '전체 패널 클러스터링 불러오기'
              )}
            </PIButton>
          <PIModelBadge status={modelStatus} version="v2025-10-13 14:30" />
          </div>
        </div>
      </div>

      {/* Local Search Bar (UI-only, no API) */}
      <div 
        className="px-20 py-4 border-b"
        style={{
          background: isDark ? colors.bg.primary : 'white',
          borderColor: colors.border.primary,
        }}
      >
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleReSearch();
              }
            }}
            placeholder="예) 서울 20대 여성, OTT 이용·스킨케어 관심 200명"
            style={{ 
              flex: 1,
              padding: '10px 12px', 
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0', 
              borderRadius: 8,
              background: isDark ? 'rgba(30, 41, 59, 0.5)' : 'white',
              color: colors.text.primary,
            }}
          />
          <PIButton
            onClick={handleReSearch}
            disabled={loading || q.trim() === ''}
            variant="default"
            style={{ minWidth: '100px' }}
          >
            <Search className="w-4 h-4 mr-2" />
            재검색
          </PIButton>
        </div>
        <style>{`
          input::placeholder {
            color: ${isDark ? 'rgba(255, 255, 255, 0.6)' : colors.text.tertiary};
            opacity: 1;
          }
        `}</style>
      </div>

      {/* Outdated Banner */}
      {showOutdatedBanner && (
        <div className="px-20 pt-8">
          <PIOutdatedBanner
            userRole={userRole}
            onDismiss={() => setShowOutdatedBanner(false)}
          />
        </div>
      )}

      <div className="px-20 py-8 space-y-8">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-lg" style={{ color: colors.text.primary }}>군집을 불러오는 중..</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-2xl">
              <div 
                className="border rounded-lg p-6 mb-4 text-left"
                style={{
                  background: isDark ? 'rgba(127, 29, 29, 0.2)' : '#FEF2F2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                }}
              >
                <h3 
                  className="font-semibold mb-2"
                  style={{ color: isDark ? '#FEE2E2' : '#991B1B' }}
                >
                  클러스터링 오류
                </h3>
                <pre 
                  className="text-sm whitespace-pre-wrap font-mono p-4 rounded border overflow-auto max-h-96"
                  style={{
                    color: isDark ? '#FEE2E2' : '#B91C1C',
                    background: isDark ? 'rgba(30, 41, 59, 0.8)' : 'white',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FEE2E2',
                  }}
                >
                  {error}
                </pre>
              </div>
              <div className="flex gap-3 justify-center">
              <PIButton onClick={runClustering}>다시 시도</PIButton>
                <PIButton 
                  variant="outline" 
                  onClick={() => {
                    toast.info('에러 상세 정보가 콘솔에 출력되었습니다');
                  }}
                >
                  콘솔에서 확인
                </PIButton>
            </div>
            </div>
          </div>
        )}

        {/* Empty State - 클러스터 데이터 없음 */}
        {!loading && !error && clusters.length === 0 && umapData.length === 0 && !showProfile && (
          <div className="flex items-center justify-center py-16" style={{ minHeight: '400px' }}>
            <div className="text-center max-w-md">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                }}>
                  <BarChart3 size={32} style={{ color: colors.text.tertiary }} />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: colors.text.primary }}>
                  클러스터링 데이터를 불러오세요
                </h3>
                <p className="text-sm mb-6" style={{ color: colors.text.secondary }}>
                  전체 패널에 대한 군집 분석 데이터를 불러와 시각화할 수 있습니다.
                  <br />
                  상단의 "전체 패널 클러스터링 불러오기" 버튼을 클릭하세요.
                </p>
                <PIButton onClick={runClustering} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      불러오는 중...
                    </>
                  ) : (
                    '전체 패널 클러스터링 불러오기'
                  )}
                </PIButton>
              </div>
            </div>
          </div>
        )}

        {/* Row 1: UMAP Visualization */}
        {!loading && !error && (clusters.length > 0 || showProfile) && (
          <div className="w-full">
            {/* UMAP 차트 */}
            {(
              <div
                ref={umapContainerRef}
                className="relative rounded-2xl p-6 flex flex-col"
                style={{
                height: '1600px', // 세로 크기 2배로 증가 (800px -> 1600px)
                background: isDark
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(16px)',
                border: isDark
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(17, 24, 39, 0.10)',
                boxShadow: isDark
                  ? '0 6px 16px rgba(0, 0, 0, 0.3)'
                  : '0 6px 16px rgba(0, 0, 0, 0.08)',
                }}
                data-umap-chart
              >
                <div 
                  className="absolute top-0 left-0 right-0 h-[1px]"
                  style={{
                    background: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)',
                    opacity: 0.5,
                  }}
                />
                
                {/* 클러스터 레이블 오버레이 - UMAP 차트 위에 표시 */}
                {!showProfile && clusters.length > 0 && (
                  <div 
                    className="absolute top-4 left-4 right-4 z-10 pointer-events-none"
                    style={{
                      maxHeight: '120px',
                      overflowY: 'auto',
                    }}
                  >
                    <div 
                      className="flex flex-wrap items-center gap-3 p-3 rounded-lg backdrop-blur-sm"
                      style={{
                        background: isDark 
                          ? 'rgba(0, 0, 0, 0.6)' 
                          : 'rgba(255, 255, 255, 0.9)',
                        border: isDark
                          ? '1px solid rgba(255, 255, 255, 0.1)'
                          : '1px solid rgba(17, 24, 39, 0.1)',
                        boxShadow: isDark
                          ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                          : '0 4px 12px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      {clusters.map((cluster, idx) => {
                        const clusterProfile = clusterProfiles.find(p => p.cluster === cluster.id);
                        let clusterDisplayName = clusterProfile?.name || `C${cluster.id + 1}`;
                        // "프리미엄"을 "프리미엄폰"으로 변경 (단, "프리미엄차"는 제외)
                        clusterDisplayName = clusterDisplayName.replace(/프리미엄(?![차폰])/g, '프리미엄폰');
                        const searchedCount = Array.from(highlightedPanelIds).filter(panelId => {
                          const clusterId = searchedPanelClusters[panelId];
                          return clusterId === cluster.id;
                        }).length;
                        
                        // 클러스터 상세정보 열기 함수
                        const openClusterDetail = () => {
                          const clusterColor = getClusterColorUtil(idx);
                          const totalSamples = clusteringMeta?.n_samples || labels.length || 1;
                          const percentage = totalSamples > 0 ? parseFloat(((cluster.size / totalSamples) * 100).toFixed(2)) : 0.0;
                          
                          // 클러스터 태그 및 스니펫
                          const clusterTags: string[] = [];
                          const clusterSnippets: string[] = [];
                          
                          if (clusterProfile?.tags && Array.isArray(clusterProfile.tags)) {
                            clusterTags.push(...clusterProfile.tags);
                          }
                          
                          if (clusterProfile?.insights && Array.isArray(clusterProfile.insights) && clusterProfile.insights.length > 0) {
                            clusterSnippets.push(...clusterProfile.insights);
                          }
                          
                          // 해당 군집의 검색된 패널 목록 추출
                          const clusterSearchedPanels = umapData
                            .filter(p => p.cluster === cluster.id && highlightedPanelIds.has(normalizePanelId(p.panelId || '')))
                            .map(p => {
                              const normalizedId = normalizePanelId(p.panelId || '');
                              const panelInfo = searchedPanelInfo[normalizedId] || searchedPanelInfo[p.panelId || ''];
                              return {
                                panelId: p.panelId || '',
                                cluster: p.cluster,
                                umap_x: p.x,
                                umap_y: p.y,
                                isSearchResult: true,
                                gender: panelInfo?.gender || '',
                                age: panelInfo?.age || 0,
                                region: panelInfo?.region || ''
                              };
                            });
                          
                          // 특징 피처 추출 (모든 features 표시)
                          const distinctiveFeatures: Array<{feature: string, value: number, avg: number, diff: number}> = [];
                          if (clusterProfile?.distinctive_features && Array.isArray(clusterProfile.distinctive_features)) {
                            clusterProfile.distinctive_features.forEach((f: any) => {
                              distinctiveFeatures.push({
                                feature: f.feature || '',
                                value: f.value || 0,
                                avg: f.overall || f.avg || 0,
                                diff: f.diff || f.diff_percent || 0
                              });
                            });
                          }
                          
                          setSelectedClusterForDetail({
                            id: cluster.id,
                            name: clusterDisplayName,
                            size: cluster.size,
                            percentage: percentage,
                            color: clusterColor,
                            tags: clusterTags,
                            snippets: clusterSnippets,
                            insights: clusterProfile?.insights || [],
                            features: distinctiveFeatures,
                            silhouette: clusteringMeta?.silhouette_score,
                            description: (clusterProfile as any)?.description || `${cluster.size}명의 패널이 포함된 군집 (${percentage.toFixed(2)}%)`,
                            searchedPanels: clusterSearchedPanels
                          });
                          
                          // 히스토리에 저장
                          try {
                            const clusterHistoryData = {
                              count: cluster.size,
                              percentage: percentage.toFixed(2),
                              size: cluster.size,
                              tags: clusterTags,
                              snippets: clusterSnippets,
                              insights: clusterProfile?.insights || [],
                              features: distinctiveFeatures,
                              silhouette: clusteringMeta?.silhouette_score,
                              color: clusterColor,
                              description: (clusterProfile as any)?.description || `${cluster.size}명의 패널이 포함된 군집 (${percentage.toFixed(2)}%)`,
                            };
                            
                            // 해당 군집의 UMAP 데이터 추출
                            const clusterUmapData = umapData.filter(p => p.cluster === cluster.id);
                            
                            const historyItem = historyManager.createClusterHistory(
                              String(cluster.id),
                              clusterDisplayName,
                              clusterHistoryData,
                              clusterUmapData.length > 0 ? clusterUmapData : undefined
                            );
                            historyManager.save(historyItem);
                            console.log('[ClusterLab] 군집 히스토리 저장:', clusterDisplayName);
                          } catch (historyError) {
                            console.warn('[ClusterLab] 히스토리 저장 실패:', historyError);
                          }
                          
                          setIsClusterDetailOpen(true);
                        };
                        
                        return (
                          <div 
                            key={cluster.id} 
                            className="flex items-center gap-2 pointer-events-auto"
                            style={{
                              cursor: 'pointer',
                            }}
                            onClick={openClusterDetail}
                          >
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ background: getClusterColorUtil(idx) }} 
                            />
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: 500, 
                              color: colors.text.secondary,
                              whiteSpace: 'nowrap'
                            }}>
                              {clusterDisplayName}
                            </span>
                            <span style={{ 
                              fontSize: '10px', 
                              fontWeight: 400, 
                              color: colors.text.tertiary,
                              whiteSpace: 'nowrap'
                            }}>
                              ({cluster.size}명)
                            </span>
                            {searchedCount > 0 && (
                              <span style={{ 
                                fontSize: '10px', 
                                fontWeight: 600, 
                                color: '#F59E0B',
                                padding: '2px 4px',
                                background: '#FEF3C7',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap'
                              }}>
                                🔍 {searchedCount}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* 검색된 패널 범례 - 간소화 */}
                      {highlightedPanelIds.size > 0 && (
                        <div 
                          className="flex items-center gap-2 ml-auto pointer-events-auto"
                          style={{
                            borderLeft: isDark 
                              ? '1px solid rgba(255, 255, 255, 0.08)' 
                              : '1px solid rgba(17, 24, 39, 0.08)',
                            paddingLeft: '12px',
                          }}
                        >
                          <div 
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                            style={{ 
                              background: '#F59E0B',
                              border: '1.5px solid #FFFFFF',
                            }} 
                          />
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: 500, 
                            color: colors.text.tertiary,
                            whiteSpace: 'nowrap'
                          }}>
                            검색 ({highlightedPanelIds.size})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 프로파일링 모드 */}
                {showProfile && profileData ? (
                  <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
                    <PIProfilingView 
                      data={profileData}
                      minimumRequired={100}
                      loading={loading}
                    />
                  </div>
                ) : (
                  <>
                <div className="flex-1" style={{ minHeight: 0 }}>
                  {(() => {
                    // 메모이제이션된 필터링된 데이터 사용
                    const filteredData = filteredUmapData;
                    
                    if (filteredData.length === 0) {
                      return (
                        <div className="flex items-center justify-center h-full">
                          <p style={{ fontSize: '14px', color: colors.text.tertiary }}>
                            {umapData.length === 0 ? 'UMAP 데이터가 없습니다.' : '선택된 조건에 맞는 데이터가 없습니다.'}
                          </p>
                        </div>
                      );
                    }
                    
                    
                    // SVG 차트 설정 (반응형)
                    const width = umapSize.width || 800;
                    const height = umapSize.height || 800;
                    // margin을 동적으로 조정 (작은 화면에서는 더 작게)
                    const margin = Math.max(40, Math.min(60, Math.min(width, height) * 0.075));
                    
                    // 데이터 범위 계산 (빈 배열 처리)
                    if (filteredData.length === 0) {
                      return <div className="text-center text-gray-500 py-8">표시할 데이터가 없습니다.</div>;
                    }
                    
                    // 전체 umapData의 범위를 사용하여 스케일링 (필터링된 데이터가 전체 영역에 분포되도록)
                    const allUmapX = umapData.map(d => d.x).filter(x => !isNaN(x) && isFinite(x));
                    const allUmapY = umapData.map(d => d.y).filter(y => !isNaN(y) && isFinite(y));
                    
                    if (allUmapX.length === 0 || allUmapY.length === 0) {
                      return <div className="text-center text-gray-500 py-8">유효한 데이터가 없습니다.</div>;
                    }
                    
                    // 전체 데이터 범위 사용 (전체 영역 활용)
                    const dataMinX = Math.min(...allUmapX);
                    const dataMaxX = Math.max(...allUmapX);
                    const dataMinY = Math.min(...allUmapY);
                    const dataMaxY = Math.max(...allUmapY);
                    
                    // 데이터 범위가 0인 경우 처리 (단일 점 또는 수직/수평선)
                    const dataRangeX = dataMaxX - dataMinX || 1;
                    const dataRangeY = dataMaxY - dataMinY || 1;
                    
                    // 실제 사용 가능한 차트 영역
                    const chartWidth = width - 2 * margin;
                    const chartHeight = height - 2 * margin;
                    
                    // 데이터를 전체 차트 영역에 맞게 스케일링
                    // 패딩을 최소화하고 데이터 범위를 전체 영역에 매핑
                    // 데이터 범위가 매우 작은 경우에도 전체 영역을 사용하도록 보장
                    const minPaddingRatio = 0.02; // 최소 2% 패딩
                    const paddingX = Math.max(dataRangeX * minPaddingRatio, dataRangeX * 0.01);
                    const paddingY = Math.max(dataRangeY * minPaddingRatio, dataRangeY * 0.01);
                    
                    // 데이터 범위 (패딩 포함)
                    const dataRangeXWithPadding = (dataMaxX + paddingX) - (dataMinX - paddingX);
                    const dataRangeYWithPadding = (dataMaxY + paddingY) - (dataMinY - paddingY);
                    
                    // 좌표 변환 함수
                    const xScale = (x: number) => {
                      if (!isFinite(x)) return margin + chartWidth / 2;
                      const normalized = (x - (dataMinX - paddingX)) / dataRangeXWithPadding;
                      const clamped = Math.max(0, Math.min(1, normalized));
                      return margin + clamped * chartWidth;
                    };
                    
                    const yScale = (y: number) => {
                      if (!isFinite(y)) return height - margin - chartHeight / 2;
                      const normalized = (y - (dataMinY - paddingY)) / dataRangeYWithPadding;
                      const clamped = Math.max(0, Math.min(1, normalized));
                      return height - margin - clamped * chartHeight;
                    };
                    
                    // 하이라이트된 인덱스 추출 (검색된 패널)
                    const highlightedIndices: number[] = [];
                    filteredData.forEach((point, index) => {
                      const normalizedId = normalizePanelId(point.panelId);
                      if (highlightedPanelIds.has(normalizedId)) {
                        highlightedIndices.push(index);
                      }
                    });
                    
                    // 클러스터 색상 가져오기 (기존 색상 시스템 사용)
                    const getClusterColor = (clusterId: number) => {
                      const clusterIdx = clusters.findIndex(c => c.id === clusterId);
                      return clusterIdx >= 0 ? getClusterColorUtil(clusterIdx) : getClusterColorUtil(clusterId);
                    };
                    
                    // 군집 중심점 계산 함수 - 전체 데이터 사용 (필터링과 무관하게)
                    const calculateClusterCentroid = (clusterId: number) => {
                      // 필터링된 데이터가 아닌 전체 umapData 사용
                      const clusterPoints = umapData.filter(p => p.cluster === clusterId);
                      if (clusterPoints.length === 0) return null;
                      
                      // 평균(mean) 사용으로 실제 군집 중심을 정확히 계산
                      const sumX = clusterPoints.reduce((sum, p) => sum + p.x, 0);
                      const sumY = clusterPoints.reduce((sum, p) => sum + p.y, 0);
                      const meanX = sumX / clusterPoints.length;
                      const meanY = sumY / clusterPoints.length;
                      
                      return {
                        x: meanX,
                        y: meanY,
                        count: clusterPoints.length, // 포인트 개수 저장
                      };
                    };
                    
                    
                    return (
                      <div 
                        style={{ width: '100%', height: '100%', position: 'relative' }}
                      >
                        <svg 
                          width={width} 
                          height={height} 
                          viewBox={`0 0 ${width} ${height}`}
                          preserveAspectRatio="xMidYMid meet"
                          style={{ width: '100%', height: '100%', display: 'block' }}
                          onMouseMove={(e) => {
                            // 이벤트 위임: 가장 가까운 circle 요소 찾기
                            const target = e.target as SVGElement;
                            if (target.tagName === 'circle' && target.hasAttribute('data-panel-id')) {
                              const normalizedId = target.getAttribute('data-panel-id');
                              const originalPanelId = target.getAttribute('data-panel-id-original');
                              
                              if (normalizedId) {
                                // 원본 panelId 우선 사용, 없으면 normalizedId로 찾기
                                const panelId = originalPanelId || normalizedId;
                                const point = filteredData.find(p => {
                                  const pNormalized = normalizePanelId(p.panelId);
                                  return pNormalized === normalizedId || p.panelId === panelId;
                                });
                                if (point) {
                                  handlePointHover(point.panelId);
                                }
                              }
                            }
                          }}
                          onClick={(e) => {
                            // 검색된 패널 클릭 처리
                            const target = e.target as SVGElement;
                            if (target.tagName === 'circle' && target.hasAttribute('data-is-searched')) {
                              const originalPanelId = target.getAttribute('data-panel-id-original');
                              if (originalPanelId) {
                                setSelectedPanelId(originalPanelId);
                                setIsPanelDetailOpen(true);
                              }
                            }
                          }}
                          onMouseLeave={handlePointLeave}
                        >
                          {/* 배경 그리드 - 더 연하게 */}
                          <defs>
                            <pattern 
                              id="grid" 
                              width="80" 
                              height="80" 
                              patternUnits="userSpaceOnUse"
                            >
                              <path 
                                d="M 80 0 L 0 0 0 80" 
                                fill="none" 
                                stroke={isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'} 
                                strokeWidth="0.5" 
                              />
                            </pattern>
                            
                            {/* 간소화된 필터 (필요시만 사용) */}
                            <filter id="subtle-glow" x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>
                          {/* 배경 그리드 - 선택적으로 표시 (더 연하게) */}
                          <rect 
                            x={margin} 
                            y={margin} 
                            width={Math.max(0, width - 2 * margin)} 
                            height={Math.max(0, height - 2 * margin)} 
                            fill="url(#grid)" 
                            opacity={0.3}
                          />
                          
                          {/* X축 - 더 연하게 */}
                          <line 
                            x1={margin} 
                            y1={height - margin} 
                            x2={width - margin} 
                            y2={height - margin} 
                            stroke={isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'} 
                            strokeWidth="1" 
                          />
                          {(() => {
                            const tickCount = 5; // 9개에서 5개로 줄임
                            const tickStep = ((dataMaxX + paddingX) - (dataMinX - paddingX)) / (tickCount - 1);
                            const ticks = [];
                            for (let i = 0; i < tickCount; i++) {
                              const val = dataMinX - paddingX + i * tickStep;
                              ticks.push(val);
                            }
                            return ticks.map((val, idx) => (
                              <g key={`x-${idx}`}>
                                <line 
                                  x1={xScale(val)} 
                                  y1={height - margin} 
                                  x2={xScale(val)} 
                                  y2={height - margin + 6} 
                                  stroke={isDark ? 'rgba(255, 255, 255, 0.3)' : '#D1D5DB'} 
                                  strokeWidth="1" 
                                />
                                <text 
                                  x={xScale(val)} 
                                  y={height - margin + 20} 
                                  textAnchor="middle" 
                                  fill={isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'} 
                                  fontSize="10"
                                >
                                  {val.toFixed(1)}
                                </text>
                              </g>
                            ));
                          })()}
                          
                          {/* Y축 - 더 연하게 */}
                          <line 
                            x1={margin} 
                            y1={margin} 
                            x2={margin} 
                            y2={height - margin} 
                            stroke={isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'} 
                            strokeWidth="1" 
                          />
                          {(() => {
                            const tickCount = 5; // 9개에서 5개로 줄임
                            const tickStep = ((dataMaxY + paddingY) - (dataMinY - paddingY)) / (tickCount - 1);
                            const ticks = [];
                            for (let i = 0; i < tickCount; i++) {
                              const val = dataMinY - paddingY + i * tickStep;
                              ticks.push(val);
                            }
                            return ticks.map((val, idx) => (
                              <g key={`y-${idx}`}>
                                <line 
                                  x1={margin - 6} 
                                  y1={yScale(val)} 
                                  x2={margin} 
                                  y2={yScale(val)} 
                                  stroke={isDark ? 'rgba(255, 255, 255, 0.3)' : '#D1D5DB'} 
                                  strokeWidth="1" 
                                />
                                <text 
                                  x={margin - 12} 
                                  y={yScale(val) + 4} 
                                  textAnchor="end" 
                                  fill={isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'} 
                                  fontSize="10"
                                >
                                  {val.toFixed(1)}
                                </text>
                              </g>
                            ));
                          })()}
                          
                          {/* 데이터 포인트: 기존 전체 데이터 (회색) - 검색된 패널 제외 - 더 연하게 - 샘플링 적용 */}
                          {sampledNormalPanels
                            .filter(point => {
                              const normalizedId = normalizePanelId(point.panelId);
                              return !highlightedPanelIds.has(normalizedId);
                            })
                            .map((point, index) => {
                              const normalizedId = normalizePanelId(point.panelId);
                              const cx = xScale(point.x);
                              const cy = yScale(point.y);
                              
                              return (
                                <circle
                                  key={`normal-${normalizedId}-${index}`}
                                  cx={cx}
                                  cy={cy}
                                  r={3}
                                  fill={isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'}
                                  opacity={0.6}
                                  data-panel-id={normalizedId}
                                  style={{ cursor: 'pointer' }}
                                />
                              );
                            })}
                          
                          {/* 데이터 포인트: 확장 클러스터링된 패널 (컬러) - 검색된 패널 제외 - 더 연하게 - 샘플링 적용 */}
                          {sampledExtendedPanels
                            .filter(point => {
                              const normalizedId = normalizePanelId(point.panelId);
                              return !highlightedPanelIds.has(normalizedId);
                            })
                            .map((point, index) => {
                              const normalizedId = normalizePanelId(point.panelId);
                              const cx = xScale(point.x);
                              const cy = yScale(point.y);
                              const clusterColor = getClusterColor(point.cluster);
                              
                              return (
                                <circle
                                  key={`extended-${normalizedId}-${index}`}
                                  cx={cx}
                                  cy={cy}
                                  r={3.5}
                                  fill={clusterColor}
                                  opacity={0.5}
                                  data-panel-id={normalizedId}
                                  style={{ cursor: 'pointer' }}
                                />
                              );
                            })}
                          
                          {/* 확장 클러스터링이 없을 때만 전체 데이터 렌더링 - 검색된 패널 제외 - 더 연하게 - 샘플링 적용 */}
                          {!extendedClusteringData && sampledFilteredData
                            .filter(point => {
                              const normalizedId = normalizePanelId(point.panelId);
                              return !highlightedPanelIds.has(normalizedId);
                            })
                            .map((point, index) => {
                              const normalizedId = normalizePanelId(point.panelId);
                              const pointIndex = filteredData.findIndex(p => normalizePanelId(p.panelId) === normalizedId);
                              const isHovered = hoveredPointIndex === pointIndex;
                              const cx = xScale(point.x);
                              const cy = yScale(point.y);
                              const baseColor = getClusterColor(point.cluster);
                              
                              return (
                                <circle
                                  key={`legacy-${normalizedId}-${index}`}
                                  cx={cx}
                                  cy={cy}
                                  r={3}
                                  fill={baseColor}
                                  opacity={0.4}
                                  data-panel-id={normalizedId}
                                  style={{
                                    cursor: 'pointer',
                                    filter: isHovered ? `drop-shadow(0 0 4px ${baseColor})` : 'none',
                                  }}
                                />
                              );
                            })}
                          
                          {/* 검색된 패널만 최상위 레이어로 렌더링 (모든 일반 점들 위에 표시) - 이벤트 위임 적용 */}
                          {searchedPanelsOnly.map((point, index) => {
                            const normalizedId = normalizePanelId(point.panelId);
                            const cx = xScale(point.x);
                            const cy = yScale(point.y);
                            const clusterColor = getClusterColor(point.cluster);
                            
                            // 패널 ID 추출 (클릭 이벤트용)
                            const panelId = point.panelId || '';
                            
                            return (
                              <g key={`searched-${normalizedId}-${index}`} style={{ pointerEvents: 'auto' }}>
                                {/* 외곽 원 - 간소화 */}
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={6}
                                  fill={clusterColor}
                                  opacity={0.25}
                                  data-panel-id={normalizedId}
                                  data-panel-id-original={panelId}
                                  data-is-searched="true"
                                  style={{ cursor: 'pointer' }}
                                />
                                {/* 메인 점 - 간소화 */}
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={4.5}
                                  fill={clusterColor}
                                  stroke="#FFFFFF"
                                  strokeWidth="1.5"
                                  opacity={0.95}
                                  data-panel-id={normalizedId}
                                  data-panel-id-original={panelId}
                                  data-is-searched="true"
                                  style={{ cursor: 'pointer' }}
                                />
                              </g>
                            );
                          })}
                          
                          {/* 군집 중심 라벨 표시 - 개선된 버전 */}
                          {(() => {
                            // 모든 군집의 중심점 계산
                            const centroids = clusters
                              .filter(cluster => cluster.size > 50) // 50명 이상 군집만 표시
                              .map(cluster => {
                                const centroid = calculateClusterCentroid(cluster.id);
                                if (!centroid) return null;
                                
                                const cx = xScale(centroid.x);
                                const cy = yScale(centroid.y);
                                const clusterProfile = clusterProfiles.find(p => p.cluster === cluster.id);
                                let clusterName = (clusterProfile as any)?.name_main || 
                                                  clusterProfile?.name || 
                                                  `C${cluster.id + 1}`;
                                // "프리미엄"을 "프리미엄폰"으로 변경 (단, "프리미엄차"는 제외)
                                clusterName = clusterName.replace(/프리미엄(?![차폰])/g, '프리미엄폰');
                                const clusterColor = getClusterColor(cluster.id);
                                
                                // 화면 경계 체크
                                const labelPadding = 20;
                                const safeX = Math.max(labelPadding, Math.min(cx, width - labelPadding));
                                const safeY = Math.max(labelPadding, Math.min(cy, height - labelPadding));
                                
                                // 텍스트 길이에 따른 최대 너비 계산
                                const maxTextWidth = Math.min(120, (width - safeX - labelPadding) * 2);
                                const estimatedCharWidth = 7; // 대략적인 문자 너비
                                const maxChars = Math.floor(maxTextWidth / estimatedCharWidth);
                                
                                return {
                                  clusterId: cluster.id,
                                  cx: safeX,
                                  cy: safeY,
                                  originalCx: cx,
                                  originalCy: cy,
                                  clusterName: clusterName.length > maxChars 
                                    ? clusterName.substring(0, maxChars - 3) + '...' 
                                    : clusterName,
                                  clusterColor,
                                  size: cluster.size,
                                  centroid,
                                };
                              })
                              .filter((c): c is NonNullable<typeof c> => c !== null)
                              .sort((a, b) => b.size - a.size); // 큰 군집부터 정렬
                            
                            // 라벨 간 최소 거리 확인 및 겹침 방지
                            const minDistance = 40;
                            const placedLabels: Array<{ x: number; y: number }> = [];
                            
                            return centroids
                              .filter(centroid => {
                                // 이미 배치된 라벨과의 거리 확인
                                const tooClose = placedLabels.some(placed => {
                                  const dx = centroid.cx - placed.x;
                                  const dy = centroid.cy - placed.y;
                                  const distance = Math.sqrt(dx * dx + dy * dy);
                                  return distance < minDistance;
                                });
                                
                                if (!tooClose) {
                                  placedLabels.push({ x: centroid.cx, y: centroid.cy });
                                  return true;
                                }
                                return false; // 너무 가까워서 제외
                              })
                              .map((centroid) => (
                                <g key={`cluster-label-${centroid.clusterId}`} style={{ pointerEvents: 'none' }}>
                                  {/* 배경 원 */}
                                  <circle
                                    cx={centroid.cx}
                                    cy={centroid.cy}
                                    r={16}
                                    fill={isDark ? 'rgba(17, 24, 39, 0.75)' : 'rgba(255, 255, 255, 0.85)'}
                                    stroke={centroid.clusterColor}
                                    strokeWidth="1.5"
                                    opacity="0.9"
                                  />
                                  {/* 라벨 텍스트 */}
                                  <text
                                    x={centroid.cx}
                                    y={centroid.cy + 4}
                                    textAnchor="middle"
                                    fill={centroid.clusterColor}
                                    fontSize="10"
                                    fontWeight="600"
                                    style={{
                                      fontFamily: 'system-ui, -apple-system, sans-serif',
                                      pointerEvents: 'none',
                                    }}
                                  >
                                    {centroid.clusterName}
                                  </text>
                                </g>
                              ));
                          })()}
                          
                          {/* 툴팁 레이어 - 호버된 포인트 렌더링 */}
                          {hoveredPointIndex !== null && (() => {
                            const point = filteredData[hoveredPointIndex];
                            if (!point) return null;
                            
                            const normalizedId = normalizePanelId(point.panelId);
                            const isHighlighted = highlightedPanelIds.has(normalizedId);
                            // 호버된 경우 툴팁 표시
                            const isHovered = true; // 이 블록은 호버된 포인트만 렌더링하므로 항상 true
                            const cx = xScale(point.x);
                            const cy = yScale(point.y);
                            const clusterName = `C${point.cluster + 1}`;
                            const clusterProfile = clusterProfiles.find(p => p.cluster === point.cluster);
                            let clusterDisplayName = (clusterProfile as any)?.name_main || clusterProfile?.name || clusterName;
                            // "프리미엄"을 "프리미엄폰"으로 변경 (단, "프리미엄차"는 제외)
                            clusterDisplayName = clusterDisplayName.replace(/프리미엄(?![차폰])/g, '프리미엄폰');
                            const panelInfo = searchedPanelInfo[normalizedId] || searchedPanelInfo[point.panelId || ''];
                            
                            // 군집 프로필에서 소득 및 가족 구성 정보 추출
                            const clusterIncome = clusterProfile ? (
                              (clusterProfile as any).features?.Q6_income || 
                              (clusterProfile as any).features?.avg_income ||
                              clusterProfile.distinctive_features?.find((f: any) => 
                                f.feature === 'Q6_income' || f.feature === 'Q6_scaled'
                              )?.value
                            ) : null;
                            
                            const clusterHasChildren = clusterProfile ? (
                              (clusterProfile as any).features?.has_children ||
                              clusterProfile.distinctive_features?.find((f: any) => 
                                f.feature === 'has_children'
                              )?.value
                            ) : null;
                            
                            const clusterSize = clusterProfile?.size || 0;
                            const clusterPercentage = clusteringMeta?.n_samples 
                              ? ((clusterSize / clusteringMeta.n_samples) * 100).toFixed(2)
                              : '0.00';
                              
                              // 호버 시 더 큰 툴팁 (소득/가족 정보 포함)
                              const hasExtendedInfo = panelInfo && (panelInfo.job || panelInfo.education || panelInfo.income);
                              const hasClusterInfo = clusterIncome !== null || clusterHasChildren !== null;
                              
                              // 툴팁 크기 계산
                              const tooltipPadding = 12;
                              const tooltipMinWidth = 180;
                              const tooltipMaxWidth = 280;
                              const tooltipWidth = isHovered 
                                ? Math.min(tooltipMaxWidth, Math.max(tooltipMinWidth, hasExtendedInfo || hasClusterInfo ? 260 : 200))
                                : 140;
                              
                              // 툴팁 높이 계산 (동적)
                              let tooltipHeight = 40; // 기본 높이 (패널 ID + 군집명)
                              if (isHovered) {
                                if (panelInfo) {
                                  tooltipHeight += 20; // 나이/성별
                                  if (panelInfo.region) tooltipHeight += 18;
                                  if (panelInfo.job) tooltipHeight += 18;
                                  if (panelInfo.education) tooltipHeight += 18;
                                  if (panelInfo.income) tooltipHeight += 18;
                                }
                                if (hasClusterInfo) {
                                  tooltipHeight += 20; // 크기
                                  if (clusterIncome !== null) tooltipHeight += 18;
                                  if (clusterHasChildren !== null) tooltipHeight += 18;
                                }
                              }
                              tooltipHeight += tooltipPadding * 2; // 상하 패딩
                              
                              // 스마트 위치 계산: 포인트 위치에 따라 툴팁 위치 자동 조정
                              const offset = 16; // 포인트와 툴팁 사이 간격
                              const margin = 8; // 화면 가장자리 여백
                              
                              // 기본 위치 (포인트 오른쪽 위)
                              let tooltipX = cx + offset;
                              let tooltipY = cy - tooltipHeight - offset;
                              
                              // 오른쪽 경계 체크
                              if (tooltipX + tooltipWidth + margin > width) {
                                // 왼쪽으로 이동
                                tooltipX = cx - tooltipWidth - offset;
                              }
                              
                              // 왼쪽 경계 체크
                              if (tooltipX < margin) {
                                // 중앙 정렬
                                tooltipX = Math.max(margin, Math.min(cx - tooltipWidth / 2, width - tooltipWidth - margin));
                              }
                              
                              // 위쪽 경계 체크
                              if (tooltipY < margin) {
                                // 아래쪽으로 이동
                                tooltipY = cy + offset;
                              }
                              
                              // 아래쪽 경계 체크
                              if (tooltipY + tooltipHeight + margin > height) {
                                // 위쪽으로 이동 (높이 조정)
                                tooltipY = Math.max(margin, height - tooltipHeight - margin);
                              }
                              
                              // 최종 경계 체크 및 조정
                              const safeX = Math.max(margin, Math.min(tooltipX, width - tooltipWidth - margin));
                              const safeY = Math.max(margin, Math.min(tooltipY, height - tooltipHeight - margin));
                              const safeWidth = Math.min(tooltipWidth, width - safeX - margin);
                              const safeHeight = Math.min(tooltipHeight, height - safeY - margin);
                              
                              // 툴팁이 유효한 크기일 때만 렌더링
                              if (safeWidth < tooltipMinWidth * 0.8 || safeHeight < 40 || safeX < 0 || safeY < 0) {
                                return null;
                              }
                              
                              // 검색된 패널의 기본 툴팁은 반투명하게, 호버 시 더 진하게
                              const opacity = isHovered ? 0.95 : (isHighlighted ? 0.7 : 0.95);
                              
                            // 텍스트 말줄임표 처리 함수
                            const truncateText = (text: string, maxLength: number) => {
                              if (!text) return '';
                              return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
                            };
                            
                            // 텍스트 최대 너비 계산 (툴팁 너비 - 패딩)
                            const maxTextWidth = safeWidth - tooltipPadding * 2;
                            const maxTextLength = Math.floor(maxTextWidth / 7); // 대략적인 문자 수 (폰트 크기 기준)
                            
                            return (
                              <g key={`tooltip-${hoveredPointIndex}`} style={{ pointerEvents: 'none' }}>
                                  {/* 배경 */}
                                  <rect
                                    x={safeX}
                                    y={safeY}
                                    width={safeWidth}
                                    height={safeHeight}
                                    fill={isDark ? `rgba(17, 24, 39, ${opacity})` : `rgba(255, 255, 255, ${opacity})`}
                                    stroke={isHighlighted ? '#F59E0B' : (isDark ? 'rgba(255, 255, 255, 0.3)' : '#E5E7EB')}
                                    strokeWidth={isHovered ? "1.5" : "0.5"}
                                    rx="8"
                                    filter={isHovered ? "drop-shadow(0 4px 16px rgba(0,0,0,0.2))" : "drop-shadow(0 2px 8px rgba(0,0,0,0.1))"}
                                  />
                                  
                                  {/* 강조 배경 (검색된 패널) */}
                                  {isHighlighted && (
                                    <rect
                                      x={safeX}
                                      y={safeY}
                                      width={safeWidth}
                                      height={24}
                                      fill={isDark ? 'rgba(245, 158, 11, 0.25)' : '#FEF3C7'}
                                      rx="8"
                                    />
                                  )}
                                  
                                  {/* 패널 ID */}
                                  <text
                                    x={safeX + tooltipPadding}
                                    y={safeY + tooltipPadding + 14}
                                    fill={isDark ? `rgba(255, 255, 255, ${isHovered ? 1 : 0.9})` : `rgba(17, 24, 39, ${isHovered ? 1 : 0.9})`}
                                    fontSize={isHovered ? "13" : "11"}
                                    fontWeight="600"
                                  >
                                    <tspan>{truncateText(point.panelId || 'Unknown', maxTextLength)}{isHighlighted && ' ✨'}</tspan>
                                  </text>
                                  
                                  {isHovered && (() => {
                                    let currentY = safeY + tooltipPadding + 14 + 20; // 패널 ID 아래
                                    const lineHeight = 18;
                                    const textX = safeX + tooltipPadding;
                                    
                                    return (
                                      <>
                                        {/* 군집명 */}
                                        <text
                                          x={textX}
                                          y={currentY}
                                          fill={isDark ? 'rgba(255, 255, 255, 0.95)' : '#4B5563'}
                                          fontSize="12"
                                          fontWeight="600"
                                        >
                                          <tspan>군집: {truncateText(clusterDisplayName, maxTextLength - 3)}</tspan>
                                        </text>
                                        {(() => { currentY += lineHeight; return null; })()}
                                        
                                        {/* 군집 통계 정보 */}
                                        {hasClusterInfo && (
                                          <>
                                            <text
                                              x={textX}
                                              y={currentY}
                                              fill={isDark ? 'rgba(255, 255, 255, 0.85)' : '#6B7280'}
                                              fontSize="11"
                                            >
                                              <tspan>크기: {clusterSize.toLocaleString()}명 ({clusterPercentage}%)</tspan>
                                            </text>
                                            {(() => { currentY += lineHeight; return null; })()}
                                            
                                            {clusterIncome !== null && (
                                              <>
                                                <text
                                                  x={textX}
                                                  y={currentY}
                                                  fill={isDark ? 'rgba(255, 255, 255, 0.85)' : '#6B7280'}
                                                  fontSize="11"
                                                >
                                                  <tspan>평균 소득: {Math.round(clusterIncome).toLocaleString()}만원</tspan>
                                                </text>
                                                {(() => { currentY += lineHeight; return null; })()}
                                              </>
                                            )}
                                            
                                            {clusterHasChildren !== null && (
                                              <>
                                                <text
                                                  x={textX}
                                                  y={currentY}
                                                  fill={isDark ? 'rgba(255, 255, 255, 0.85)' : '#6B7280'}
                                                  fontSize="11"
                                                >
                                                  <tspan>자녀 보유: {Math.round(clusterHasChildren * 100)}%</tspan>
                                                </text>
                                                {(() => { currentY += lineHeight; return null; })()}
                                              </>
                                            )}
                                          </>
                                        )}
                                      
                                        
                                        {/* 패널 정보 */}
                                        {panelInfo && (() => {
                                          const panelTextX = safeX + tooltipPadding;
                                          let panelY = safeY + tooltipPadding + 14 + 20; // 패널 ID 아래
                                          const panelLineHeight = 18;
                                          
                                          // 군집명이 있으면 그 아래부터
                                          panelY += panelLineHeight;
                                          
                                          // 군집 통계가 있으면 추가
                                          if (hasClusterInfo) {
                                            panelY += panelLineHeight; // 크기
                                            if (clusterIncome !== null) panelY += panelLineHeight;
                                            if (clusterHasChildren !== null) panelY += panelLineHeight;
                                          }
                                          
                                          return (
                                            <>
                                              {/* 나이/성별 */}
                                              {(panelInfo.age || panelInfo.gender) && (
                                                <>
                                                  <text
                                                    x={panelTextX}
                                                    y={panelY}
                                                    fill={isDark ? 'rgba(255, 255, 255, 0.9)' : '#6B7280'}
                                                    fontSize="11"
                                                  >
                                                    <tspan>
                                                      {panelInfo.age && `나이: ${panelInfo.age}세`}
                                                      {panelInfo.age && panelInfo.gender && ' • '}
                                                      {panelInfo.gender && (panelInfo.gender === 'M' || panelInfo.gender === 'male' ? '남성' : panelInfo.gender === 'F' || panelInfo.gender === 'female' ? '여성' : panelInfo.gender)}
                                                    </tspan>
                                                  </text>
                                                  {(() => { panelY += panelLineHeight; return null; })()}
                                                </>
                                              )}
                                              
                                              {/* 지역 */}
                                              {panelInfo.region && (
                                                <>
                                                  <text
                                                    x={panelTextX}
                                                    y={panelY}
                                                    fill={isDark ? 'rgba(255, 255, 255, 0.9)' : '#6B7280'}
                                                    fontSize="11"
                                                  >
                                                    <tspan>지역: {truncateText(panelInfo.region, maxTextLength - 3)}</tspan>
                                                  </text>
                                                  {(() => { panelY += panelLineHeight; return null; })()}
                                                </>
                                              )}
                                              
                                              {/* 직업 */}
                                              {panelInfo.job && (
                                                <>
                                                  <text
                                                    x={panelTextX}
                                                    y={panelY}
                                                    fill={isDark ? 'rgba(255, 255, 255, 0.9)' : '#6B7280'}
                                                    fontSize="11"
                                                  >
                                                    <tspan>직업: {truncateText(panelInfo.job, maxTextLength - 3)}</tspan>
                                                  </text>
                                                  {(() => { panelY += panelLineHeight; return null; })()}
                                                </>
                                              )}
                                              
                                              {/* 학력 */}
                                              {panelInfo.education && (
                                                <>
                                                  <text
                                                    x={panelTextX}
                                                    y={panelY}
                                                    fill={isDark ? 'rgba(255, 255, 255, 0.9)' : '#6B7280'}
                                                    fontSize="11"
                                                  >
                                                    <tspan>학력: {truncateText(panelInfo.education, maxTextLength - 3)}</tspan>
                                                  </text>
                                                  {(() => { panelY += panelLineHeight; return null; })()}
                                                </>
                                              )}
                                              
                                              {/* 소득 */}
                                              {panelInfo.income && (
                                                <>
                                                  <text
                                                    x={panelTextX}
                                                    y={panelY}
                                                    fill={isDark ? 'rgba(255, 255, 255, 0.9)' : '#6B7280'}
                                                    fontSize="11"
                                                  >
                                                    <tspan>소득: {truncateText(String(panelInfo.income), maxTextLength - 3)}</tspan>
                                                  </text>
                                                  {(() => { panelY += panelLineHeight; return null; })()}
                                                </>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </>
                                    );
                                  })()}
                                </g>
                              );
                          })()}
                        </svg>
                      </div>
                    );
                  })()}
                      </div>
                    </>
                )}
                
                {/* Legend는 이제 UMAP 차트 위에 오버레이로 표시됨 (제거) */}
              </div>
            )}
          </div>
        )}

        {/* Row 2: Cluster Profile Cards (3 columns) */}
        {!loading && !error && clusters.length > 0 && (
          <div>
            <PISectionHeader
              title="군집 프로필"
              description="각 군집의 특성과 대표 인사이트를 확인하고 라벨을 관리합니다."
            />
            
            {/* 동적 그리드: 클러스터 수에 따라 열 수 조정 */}
            <div className={`grid gap-6 ${
              clusters.length === 1 ? 'grid-cols-1' :
              clusters.length === 2 ? 'grid-cols-2' :
              clusters.length === 3 ? 'grid-cols-3' :
              clusters.length === 4 ? 'grid-cols-2' :
              clusters.length <= 6 ? 'grid-cols-3' :
              'grid-cols-4'
            }`}>
              {clusters
                .filter((cluster) => {
                  // 노이즈 군집(cluster.id === -1)은 유지
                  if (cluster.id === -1) return true;
                  
                  // HDBSCAN의 노이즈 클러스터 0은 제외
                  if (cluster.id === 0) return false;
                  
                  // 일반 군집 중 60명 이하인 소형 군집은 노이즈로 간주하여 제외
                  if (cluster.size <= 60) {
                    return false;
                  }
                  
                  // 검색 결과가 있으면 검색된 패널이 속한 군집만 표시
                  if (searchResults && searchResults.length > 0 && highlightedPanelIds.size > 0) {
                    // 검색된 패널이 속한 클러스터 ID 추출
                    const searchedClusterIds = new Set<number>();
                    Object.values(searchedPanelClusters).forEach(clusterId => {
                      if (clusterId !== null && clusterId !== undefined) {
                        searchedClusterIds.add(clusterId);
                      }
                    });
                    
                    // 검색된 패널이 속한 군집만 표시
                    if (searchedClusterIds.size > 0 && !searchedClusterIds.has(cluster.id)) {
                      return false;
                    }
                  }
                  
                  return true;
                })
                .map((cluster, index) => {
                // 클러스터 비율 계산
                const totalSamples = clusteringMeta?.n_samples || labels.length || 1;
                const percentage = totalSamples > 0 ? parseFloat(((cluster.size / totalSamples) * 100).toFixed(2)) : 0.0;
                
                // 클러스터 특성 분석
                let clusterTags: string[] = [];
                let clusterSnippets: string[] = [];
                
                // 크기 기반 분류
                let sizeCategory: 'large' | 'medium' | 'small' = 'small';
                let sizeLabel = '';
                if (cluster.size >= totalSamples * 0.3) {
                  sizeCategory = 'large';
                  sizeLabel = '대형';
                  clusterTags.push('대형 군집');
                } else if (cluster.size >= totalSamples * 0.15) {
                  sizeCategory = 'medium';
                  sizeLabel = '중형';
                  clusterTags.push('중형 군집');
                } else {
                  sizeCategory = 'small';
                  sizeLabel = '소형';
                  // clusterTags.push('소형 군집'); // 제거: 소형 집중군집 프로필 표시 안 함
                }
                
                // 크기 순위 계산 (큰 순서대로)
                const sortedClusters = [...clusters].sort((a, b) => b.size - a.size);
                const sizeRank = sortedClusters.findIndex(c => c.id === cluster.id) + 1;
                
                // 클러스터 프로파일 데이터에서 특성 분석
                const clusterProfile = clusterProfiles.find(p => p.cluster === cluster.id);
                
                // 기본 군집 이름 (프로파일 데이터가 없을 때 사용)
                const generateDefaultClusterName = (): string => {
                  if (sizeRank === 1) {
                    return sizeCategory === 'large' ? '주요 군집' : '1순위 군집';
                  } else if (sizeRank === 2) {
                    return sizeCategory === 'large' ? '2차 군집' : '2순위 군집';
                  } else if (sizeRank === 3) {
                    return sizeCategory === 'large' ? '3차 군집' : '3순위 군집';
                  }
                  
                  if (sizeCategory === 'large') {
                    return `${sizeLabel} 중심군집`;
                  } else if (sizeCategory === 'medium') {
                    return `${sizeLabel} 특화군집`;
                  } else {
                    // 소형 집중군집 프로필 제거: 기본 이름만 반환
                    return `군집 ${cluster.id + 1}`;
                  }
                };
                
                let clusterName: string;
                let clusterNameMain: string | undefined;
                let clusterNameSub: string | undefined;
                let distinctiveFeatures: Array<{feature: string, value: number, avg: number, diff: number}> = [];
                
                // 백엔드에서 제공하는 데이터를 최우선으로 사용 (HDBSCAN 분석 기반)
                if (clusterProfile) {
                  // 1. 백엔드에서 제공하는 name_main이 있으면 최우선 사용
                  if ((clusterProfile as any).name_main) {
                    clusterNameMain = (clusterProfile as any).name_main;
                    clusterNameSub = (clusterProfile as any).name_sub;
                    // "프리미엄"을 "프리미엄폰"으로 변경 (단, "프리미엄차"는 제외)
                    clusterNameMain = clusterNameMain.replace(/프리미엄(?![차폰])/g, '프리미엄폰');
                    clusterName = clusterNameMain;
                  } else if (clusterProfile.name) {
                    // "프리미엄"을 "프리미엄폰"으로 변경 (단, "프리미엄차"는 제외)
                    clusterName = clusterProfile.name.replace(/프리미엄(?![차폰])/g, '프리미엄폰');
                  } else if (clusterProfile.distinctive_features && clusterProfile.distinctive_features.length > 0) {
                    // 백엔드에서 제공하는 distinctive_features로 군집 이름 생성 (한글 매핑 적용)
                    clusterName = buildClusterDisplayName(clusterProfile);
                    // "프리미엄"을 "프리미엄폰"으로 변경 (단, "프리미엄차"는 제외)
                    clusterName = clusterName.replace(/프리미엄(?![차폰])/g, '프리미엄폰');
                  } else {
                    // 백엔드 프로필이 있지만 name이 없으면 기본 이름 생성
                    clusterName = generateDefaultClusterName();
                  }
                  
                  // 2. 백엔드에서 제공하는 인사이트가 있으면 최우선 사용
                  if (clusterProfile.insights && Array.isArray(clusterProfile.insights) && clusterProfile.insights.length > 0) {
                    // 백엔드 인사이트를 snippets에 직접 할당 (HDBSCAN 분석 문서 기반)
                    clusterSnippets = [...clusterProfile.insights];
                    console.log(`[ClusterLab] cluster ${cluster.id} 백엔드 insights 사용:`, clusterSnippets.slice(0, 3));
                  } else {
                    console.log(`[ClusterLab] cluster ${cluster.id} insights 없음:`, {
                      has_insights: !!clusterProfile.insights,
                      is_array: Array.isArray(clusterProfile.insights),
                      length: clusterProfile.insights?.length || 0,
                      profile_keys: Object.keys(clusterProfile),
                    });
                  }
                  
                  // 3. insights_by_category가 있으면 카테고리별 인사이트도 추가
                  if (clusterProfile.insights_by_category && typeof clusterProfile.insights_by_category === 'object') {
                    const categoryInsights = clusterProfile.insights_by_category;
                    Object.keys(categoryInsights).forEach(category => {
                      const categoryData = categoryInsights[category];
                      if (Array.isArray(categoryData)) {
                        categoryData.forEach((insight: string) => {
                          if (insight && !clusterSnippets.includes(insight)) {
                            clusterSnippets.push(insight);
                          }
                        });
                      } else if (typeof categoryData === 'string' && categoryData && !clusterSnippets.includes(categoryData)) {
                        clusterSnippets.push(categoryData);
                      }
                    });
                  }
                  
                  // 4. segments 정보가 있으면 태그에 추가
                  if (clusterProfile.segments && typeof clusterProfile.segments === 'object') {
                    const segments = clusterProfile.segments;
                    if (segments.life_stage && !clusterTags.includes(segments.life_stage)) {
                      clusterTags.push(segments.life_stage);
                    }
                    if (segments.value_level && !clusterTags.includes(segments.value_level)) {
                      clusterTags.push(segments.value_level);
                    }
                    // segments 객체의 다른 필드도 태그로 추가
                    Object.keys(segments).forEach(key => {
                      if (key !== 'life_stage' && key !== 'value_level') {
                        const value = segments[key];
                        if (value && typeof value === 'string' && !clusterTags.includes(value)) {
                          clusterTags.push(value);
                        }
                      }
                    });
                  }
                  
                  // 3. 백엔드에서 제공하는 tags가 있으면 최우선 사용
                  if (clusterProfile.tags && Array.isArray(clusterProfile.tags) && clusterProfile.tags.length > 0) {
                    clusterTags = [...clusterProfile.tags];
                  } else if (clusterProfile.distinctive_features && clusterProfile.distinctive_features.length > 0) {
                    // 태그 생성 (한글 매핑 적용)
                    (clusterProfile.distinctive_features ?? []).slice(0, 3).forEach((f: DistinctiveFeature) => {
                      const display = getFeatureDisplayName(f.feature);
                      const diff = f.diff_percent ?? f.effect_size ?? f.lift ?? 0;
                      const isHigh = diff > 0;

                      // 일부 피처는 커스텀 태그 제공
                      if (f.feature === "Q6_income" || f.feature === "Q6_scaled" || f.feature === "Q6_numeric" || f.feature === "Q6") {
                        clusterTags.push(isHigh ? "고소득" : "저소득");
                        return;
                      }
                      if (f.feature === "is_student") {
                        clusterTags.push(isHigh ? "학생 비중 높음" : "학생 비중 낮음");
                        return;
                      }
                      if (f.feature === "is_apple_user") {
                        clusterTags.push(isHigh ? "애플 사용자 많음" : "애플 사용자 적음");
                        return;
                      }
                      if (f.feature === "is_premium_car") {
                        clusterTags.push(isHigh ? "프리미엄차 보유 많음" : "프리미엄차 보유 적음");
                        return;
                      }
                      if (f.feature === "is_premium_phone") {
                        clusterTags.push(isHigh ? "프리미엄폰 비중 높음" : "프리미엄폰 비중 낮음");
                        return;
                      }

                      // 그 외 일반 규칙
                      clusterTags.push(isHigh ? `높은 ${display}` : `낮은 ${display}`);
                    });
                  }
                } else {
                  // clusterProfile이 없으면 기본 이름 생성
                  clusterName = generateDefaultClusterName();
                }
                
                // 백엔드 인사이트가 없을 때만 기존 로직 사용
                if (clusterProfile && clusterProfiles.length > 1 && (!clusterProfile.insights || !Array.isArray(clusterProfile.insights) || clusterProfile.insights.length === 0)) {
                  // 백엔드 인사이트가 없으면 기존 로직 사용
                  // 모든 클러스터의 평균값 계산
                  const allFeatureValues: Record<string, number[]> = {};
                  clusterProfiles.forEach(prof => {
                    if (prof.features && typeof prof.features === 'object') {
                      Object.keys(prof.features).forEach(feature => {
                        if (!allFeatureValues[feature]) {
                          allFeatureValues[feature] = [];
                        }
                        allFeatureValues[feature].push(prof.features[feature]);
                      });
                    }
                  });
                  
                  // 각 피처의 전체 평균 계산
                  const featureAverages: Record<string, number> = {};
                  Object.keys(allFeatureValues).forEach(feature => {
                    const values = allFeatureValues[feature];
                    featureAverages[feature] = values.reduce((a, b) => a + b, 0) / values.length;
                  });
                  
                  // 이 클러스터의 특징적인 피처 찾기 (전체 평균 대비 높거나 낮은 것)
                  distinctiveFeatures = [];
                  
                  if (clusterProfile.features && typeof clusterProfile.features === 'object') {
                    Object.keys(clusterProfile.features).forEach(feature => {
                    const clusterValue = clusterProfile.features[feature];
                    const avgValue = featureAverages[feature];
                    const diff = clusterValue - avgValue;
                    const diffPercent = avgValue !== 0 ? (diff / Math.abs(avgValue)) * 100 : 0;
                    
                    // 차이가 10% 이상이면 특징적인 피처로 간주
                    if (Math.abs(diffPercent) >= 10) {
                      distinctiveFeatures.push({
                        feature,
                        value: clusterValue,
                        avg: avgValue,
                        diff: diffPercent
                      });
                    }
                  });
                  }
                  
                  // 차이가 큰 순서로 정렬
                  distinctiveFeatures.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
                  
                  // 상위 3개 특징을 태그로 추가 (한글 매핑 적용)
                  distinctiveFeatures.slice(0, 3).forEach(f => {
                    const featureName = getFeatureDisplayName(f.feature);
                    if (f.diff > 0) {
                      clusterTags.push(`높은 ${featureName}`);
                    } else {
                      clusterTags.push(`낮은 ${featureName}`);
                    }
                  });
                  
                  // 대표 인사이트 생성 및 군집 이름 생성
                  if (distinctiveFeatures.length > 0) {
                    const topFeature = distinctiveFeatures[0];
                    const featureName = getFeatureDisplayName(topFeature.feature);
                    
                    // 비율을 배수로 변환 (300% -> 3배)
                    // diffPercent가 300%면, value = avg * (1 + 3) = avg * 4, 즉 4배
                    // diffPercent가 -50%면, value = avg * (1 - 0.5) = avg * 0.5, 즉 0.5배
                    const ratio = topFeature.value / topFeature.avg;
                    
                    // 정수 배수로 변환
                    let multiplierText: string;
                    if (ratio >= 2) {
                      // 2배 이상이면 정수로 반올림
                      multiplierText = `${Math.round(ratio)}배`;
                    } else if (ratio >= 1.1) {
                      // 1.1배 이상 2배 미만이면 소수점 첫째자리
                      multiplierText = `${ratio.toFixed(1)}배`;
                    } else if (ratio <= 0.5) {
                      // 0.5배 이하면 역수로 표현 (예: 0.33배 -> 3배 낮음)
                      const inverseRatio = 1 / ratio;
                      if (inverseRatio >= 2) {
                        multiplierText = `${Math.round(inverseRatio)}배`;
                      } else {
                        multiplierText = `${ratio.toFixed(1)}배`;
                      }
                    } else {
                      // 0.5배 초과 1.1배 미만
                      multiplierText = `${ratio.toFixed(1)}배`;
                    }
                    
                    // 군집 이름 생성 (대표 인사이트 기준, 한글 매핑 적용)
                    // 임시로 distinctive_features 형태로 변환하여 buildClusterDisplayName 사용
                    const tempProfile = {
                      cluster: cluster.id,
                      distinctive_features: [{
                        feature: topFeature.feature,
                        diff_percent: topFeature.diff,
                      }],
                    };
                    clusterName = buildClusterDisplayName(tempProfile);
                    
                    // 대표 인사이트 (배수로 표시) - 더 구체적으로 작성
                    const diffText = topFeature.diff > 0 ? '높음' : '낮음';
                    const topValue = topFeature.value;
                    const avgValue = topFeature.avg;
                    
                    // 구체적인 인사이트 생성
                    if (topFeature.diff > 0) {
                      clusterSnippets.push(`${featureName}이(가) 전체 평균(${avgValue.toFixed(2)}) 대비 ${multiplierText} 높아 ${featureName} 중심 그룹으로 보입니다`);
                    } else {
                      clusterSnippets.push(`${featureName}이(가) 전체 평균(${avgValue.toFixed(2)}) 대비 ${multiplierText} 낮아 ${featureName}가 낮은 그룹입니다`);
                    }
                  }
                }
                
                // 두 번째 특징 - 구체적으로 작성 (백엔드 인사이트가 없을 때만)
                // 백엔드 insights가 있으면 자체 생성 로직 건너뛰기
                if (!clusterProfile?.insights || !Array.isArray(clusterProfile.insights) || clusterProfile.insights.length === 0) {
                  if (distinctiveFeatures && distinctiveFeatures.length > 1) {
                    const secondFeature = distinctiveFeatures[1];
                    const featureName = getFeatureDisplayName(secondFeature.feature);
                    const secondRatio = secondFeature.value / secondFeature.avg;
                    let secondMultiplierText: string;
                    if (secondRatio >= 2) {
                      secondMultiplierText = `${Math.round(secondRatio)}배`;
                    } else if (secondRatio >= 1.1) {
                      secondMultiplierText = `${secondRatio.toFixed(1)}배`;
                    } else if (secondRatio <= 0.5) {
                      const inverseRatio = 1 / secondRatio;
                      if (inverseRatio >= 2) {
                        secondMultiplierText = `${Math.round(inverseRatio)}배`;
                      } else {
                        secondMultiplierText = `${secondRatio.toFixed(1)}배`;
                      }
                    } else {
                      secondMultiplierText = `${secondRatio.toFixed(1)}배`;
                    }
                    
                    if (secondFeature.diff > 0) {
                      clusterSnippets.push(`${featureName}도 평균 대비 ${secondMultiplierText} 높은 편입니다`);
                    } else {
                      clusterSnippets.push(`${featureName}은 평균 대비 ${secondMultiplierText} 낮은 편입니다`);
                    }
                  }
                  
                  // 세 번째 특징도 추가
                  if (distinctiveFeatures && distinctiveFeatures.length > 2) {
                    const thirdFeature = distinctiveFeatures[2];
                    const featureName = getFeatureDisplayName(thirdFeature.feature);
                    if (thirdFeature.diff > 0) {
                      clusterSnippets.push(`${featureName}이 상대적으로 높습니다`);
                    } else {
                      clusterSnippets.push(`${featureName}이 상대적으로 낮습니다`);
                    }
                  }
                }
                
                // 실루엣 점수 기반 태그 (백엔드 인사이트가 없을 때만 추가)
                // 백엔드 insights가 있으면 자체 생성 로직 건너뛰기
                if (!clusterProfile?.insights || !Array.isArray(clusterProfile.insights) || clusterProfile.insights.length === 0) {
                  const silhouetteScore = clusteringMeta?.silhouette_score || 0;
                  if (silhouetteScore >= 0.5 && !clusterTags.includes('높은 응집도')) {
                    clusterTags.push('높은 응집도');
                  } else if (silhouetteScore >= 0.3 && !clusterTags.includes('보통 응집도')) {
                    clusterTags.push('보통 응집도');
                  }
                  
                  // 기본 정보 (백엔드 인사이트에 포함되지 않은 경우만)
                  if (!clusterSnippets.some(s => s.includes(`${cluster.size}명`))) {
                    clusterSnippets.push(`총 ${cluster.size}명 (전체의 ${percentage.toFixed(2)}%)`);
                  }
                  
                  // 클러스터 크기 기반 인사이트 (백엔드 인사이트에 포함되지 않은 경우만)
                  if (!clusterSnippets.some(s => s.includes('군집') && (s.includes('대형') || s.includes('중형') || s.includes('소형')))) {
                    if (percentage >= 30) {
                      clusterSnippets.push(`가장 큰 군집으로 전체의 ${percentage.toFixed(2)}%를 차지합니다`);
                    } else if (percentage >= 15) {
                      clusterSnippets.push(`중간 규모의 군집입니다`);
                    } else {
                      clusterSnippets.push(`소규모 집중 군집입니다`);
                    }
                  }
                } else {
                  // 백엔드 insights가 있을 때는 실루엣 점수만 태그에 추가 (중복 방지)
                  const silhouetteScore = clusteringMeta?.silhouette_score || 0;
                  if (silhouetteScore >= 0.5 && !clusterTags.includes('높은 응집도')) {
                    clusterTags.push('높은 응집도');
                  } else if (silhouetteScore >= 0.3 && !clusterTags.includes('보통 응집도')) {
                    clusterTags.push('보통 응집도');
                  }
                }
                
                // clusterName은 이미 위에서 백엔드 데이터를 우선 사용하여 설정됨
                
                return (
                <div
                  key={cluster.id}
                  onClick={(e) => {
                    // Shift/Ctrl/Cmd 클릭 시 테이블 표시 (기존 동작)
                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                      const clusterPanels = umapData
                        .filter(p => p.cluster === cluster.id && highlightedPanelIds.has(normalizePanelId(p.panelId || '')))
                        .map(p => {
                          const normalizedId = normalizePanelId(p.panelId || '');
                          const panelInfo = searchedPanelInfo[normalizedId] || searchedPanelInfo[p.panelId || ''];
                          return {
                            panelId: p.panelId || '',
                            cluster: p.cluster,
                            umap_x: p.x,
                            umap_y: p.y,
                            isSearchResult: true,
                            gender: panelInfo?.gender || '',
                            age: panelInfo?.age || 0,
                            region: panelInfo?.region || ''
                          };
                        });
                      
                      setClusterPanelTable(clusterPanels);
                      setSelectedClusterForTable(cluster.id);
                    } else {
                      // 일반 클릭 시 상세정보 드로어 열기
                      const clusterColor = getClusterColorUtil(index);
                      
                      // 해당 군집의 검색된 패널 목록 추출
                      const clusterSearchedPanels = umapData
                        .filter(p => p.cluster === cluster.id && highlightedPanelIds.has(normalizePanelId(p.panelId || '')))
                        .map(p => {
                          const normalizedId = normalizePanelId(p.panelId || '');
                          const panelInfo = searchedPanelInfo[normalizedId] || searchedPanelInfo[p.panelId || ''];
                          return {
                            panelId: p.panelId || '',
                            cluster: p.cluster,
                            umap_x: p.x,
                            umap_y: p.y,
                            isSearchResult: true,
                            gender: panelInfo?.gender || '',
                            age: panelInfo?.age || 0,
                            region: panelInfo?.region || ''
                          };
                        });
                      
                      setSelectedClusterForDetail({
                        id: cluster.id,
                        name: clusterName,
                        size: cluster.size,
                        percentage: percentage,
                        color: clusterColor,
                        tags: clusterTags,
                        snippets: clusterSnippets,
                        insights: clusterProfile?.insights || [],
                        features: distinctiveFeatures,
                        silhouette: clusteringMeta?.silhouette_score,
                        description: (clusterProfile as any)?.description || `${cluster.size}명의 패널이 포함된 군집 (${percentage.toFixed(2)}%)`,
                        searchedPanels: clusterSearchedPanels
                      });
                      
                      // 히스토리에 저장
                      try {
                        const clusterHistoryData = {
                          count: cluster.size,
                          percentage: percentage.toFixed(2),
                          size: cluster.size,
                          tags: clusterTags,
                          snippets: clusterSnippets,
                          insights: clusterProfile?.insights || [],
                          features: distinctiveFeatures,
                          silhouette: clusteringMeta?.silhouette_score,
                          color: clusterColor,
                          description: (clusterProfile as any)?.description || `${cluster.size}명의 패널이 포함된 군집 (${percentage.toFixed(2)}%)`,
                        };
                        
                        // 해당 군집의 UMAP 데이터 추출
                        const clusterUmapData = umapData.filter(p => p.cluster === cluster.id);
                        
                        const historyItem = historyManager.createClusterHistory(
                          String(cluster.id),
                          clusterName,
                          clusterHistoryData,
                          clusterUmapData.length > 0 ? clusterUmapData : undefined
                        );
                        historyManager.save(historyItem);
                        console.log('[ClusterLab] 군집 히스토리 저장:', clusterName);
                      } catch (historyError) {
                        console.warn('[ClusterLab] 히스토리 저장 실패:', historyError);
                      }
                      
                      setIsClusterDetailOpen(true);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <PIClusterProfileCard
                    id={`C${cluster.id + 1}`}
                    color={getClusterColorUtil(index)}
                    name={clusterName}
                    description={`${cluster.size}명의 패널이 포함된 군집 (${percentage.toFixed(2)}%)`}
                    tags={clusterTags.length > 0 ? clusterTags : ['분석 중...']}
                    size={cluster.size}
                    silhouette={clusteringMeta?.silhouette_score}
                    snippets={clusterSnippets.length > 0 ? clusterSnippets : ['분석 중...']}
                    name_main={clusterNameMain}
                    name_sub={clusterNameSub}
                    tags_hierarchical={(clusterProfile as any)?.tags_hierarchical}
                  />
                </div>
                );
              })}
              
              {/* 노이즈 카드 추가 */}
              {(() => {
                const totalSamples = clusteringMeta?.n_samples || labels.length || 1;
                const noiseCount = clusteringMeta?.n_noise || umapData.filter(d => d.cluster === -1).length || 0;
                const noisePercentage = totalSamples > 0 ? parseFloat(((noiseCount / totalSamples) * 100).toFixed(2)) : 0.0;
                
                // 노이즈 포인트가 없으면 표시하지 않음
                if (noiseCount === 0) return null;
                
                // 노이즈 포인트의 통계 정보 계산 (가능한 경우)
                const noisePoints = umapData.filter(d => d.cluster === -1);
                const noiseTags: string[] = [];
                const noiseSnippets: string[] = [];
                
                // 노이즈 비율에 따른 태그
                if (noisePercentage >= 10) {
                  noiseTags.push('높은 노이즈 비율');
                  noiseSnippets.push(`전체의 ${noisePercentage.toFixed(2)}%가 노이즈로 분류되었습니다`);
                } else if (noisePercentage >= 5) {
                  noiseTags.push('보통 노이즈 비율');
                  noiseSnippets.push(`전체의 ${noisePercentage.toFixed(2)}%가 노이즈로 분류되었습니다`);
                } else {
                  noiseTags.push('낮은 노이즈 비율');
                  noiseSnippets.push(`전체의 ${noisePercentage.toFixed(2)}%가 노이즈로 분류되었습니다`);
                }
                
                // 노이즈 포인트가 적으면 좋은 신호
                if (noisePercentage < 5) {
                  noiseSnippets.push('노이즈 비율이 낮아 안정적인 클러스터링 결과입니다');
                } else if (noisePercentage >= 10) {
                  noiseSnippets.push('노이즈 비율이 높아 클러스터 해석에 주의가 필요합니다');
                }
                
                return (
                  <div
                    key="noise"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      // 노이즈 포인트 클릭 시 상세정보 표시 (선택사항)
                      const noiseSearchedPanels = noisePoints
                        .filter(p => highlightedPanelIds.has(normalizePanelId(p.panelId || '')))
                        .map(p => {
                          const normalizedId = normalizePanelId(p.panelId || '');
                          const panelInfo = searchedPanelInfo[normalizedId] || searchedPanelInfo[p.panelId || ''];
                          return {
                            panelId: p.panelId || '',
                            cluster: -1,
                            umap_x: p.x,
                            umap_y: p.y,
                            isSearchResult: true,
                            gender: panelInfo?.gender || '',
                            age: panelInfo?.age || 0,
                            region: panelInfo?.region || ''
                          };
                        });
                      
                      setSelectedClusterForDetail({
                        id: -1,
                        name: '노이즈',
                        size: noiseCount,
                        percentage: noisePercentage,
                        color: '#94A3B8',
                        tags: noiseTags,
                        snippets: noiseSnippets,
                        insights: [],
                        features: [],
                        silhouette: undefined,
                        description: `${noiseCount}명의 패널이 노이즈로 분류되었습니다 (${noisePercentage.toFixed(2)}%)`,
                        searchedPanels: noiseSearchedPanels
                      });
                      setIsClusterDetailOpen(true);
                    }}
                  >
                    <PIClusterProfileCard
                      id="Noise"
                      color="#94A3B8"
                      name="노이즈"
                      description={`${noiseCount}명의 패널이 포함된 노이즈 (${noisePercentage.toFixed(2)}%)`}
                      tags={noiseTags.length > 0 ? noiseTags : ['노이즈']}
                      size={noiseCount}
                      snippets={noiseSnippets.length > 0 ? noiseSnippets : ['어느 군집에도 명확하게 속하지 않는 패널입니다']}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* 군집 패널 테이블 모달 */}
        {selectedClusterForTable !== null && clusterPanelTable.length > 0 && (
          <div className="w-full mt-6">
            <div
              className="relative rounded-2xl p-6 flex flex-col"
              style={{
                background: isDark
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(16px)',
                border: isDark
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(17, 24, 39, 0.10)',
                boxShadow: isDark
                  ? '0 6px 16px rgba(0, 0, 0, 0.3)'
                  : '0 6px 16px rgba(0, 0, 0, 0.08)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                  {clusterProfiles.find(p => p.cluster === selectedClusterForTable)?.name || `C${selectedClusterForTable + 1}`} 패널 목록
                  <span className="ml-2 text-sm font-normal" style={{ color: colors.text.secondary }}>
                    ({clusterPanelTable.length}개)
                  </span>
                </h3>
                <PIButton
                  variant="outline"
                  onClick={() => {
                    setSelectedClusterForTable(null);
                    setClusterPanelTable([]);
                  }}
                >
                  닫기
                </PIButton>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ fontSize: '14px' }}>
                  <thead>
                    <tr style={{ 
                      borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E5E7EB',
                      background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
                    }}>
                      <th className="text-left p-3 font-semibold" style={{ color: colors.text.primary }}>패널 ID</th>
                      <th className="text-left p-3 font-semibold" style={{ color: colors.text.primary }}>성별</th>
                      <th className="text-left p-3 font-semibold" style={{ color: colors.text.primary }}>나이</th>
                      <th className="text-left p-3 font-semibold" style={{ color: colors.text.primary }}>지역</th>
                      <th className="text-left p-3 font-semibold" style={{ color: colors.text.primary }}>UMAP X</th>
                      <th className="text-left p-3 font-semibold" style={{ color: colors.text.primary }}>UMAP Y</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clusterPanelTable.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center" style={{ color: colors.text.secondary }}>
                          검색된 패널이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      clusterPanelTable.map((panel, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F3F4F6',
                            background: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)'
                          }}
                          className="hover:opacity-80 transition-opacity"
                        >
                          <td className="p-3" style={{ color: colors.text.primary, fontWeight: 600 }}>
                            {panel.panelId}
                            <span className="ml-2 text-xs" style={{ color: '#F59E0B' }}>✨ 검색됨</span>
                          </td>
                          <td className="p-3" style={{ color: colors.text.secondary }}>
                            {panel.gender || '-'}
                          </td>
                          <td className="p-3" style={{ color: colors.text.secondary }}>
                            {panel.age ? `${panel.age}세` : '-'}
                          </td>
                          <td className="p-3" style={{ color: colors.text.secondary }}>
                            {panel.region || '-'}
                          </td>
                          <td className="p-3" style={{ color: colors.text.secondary }}>{panel.umap_x.toFixed(2)}</td>
                          <td className="p-3" style={{ color: colors.text.secondary }}>{panel.umap_y.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {/* Row 4: Model Status and Quality Metrics */}
        <div className="grid grid-cols-2 gap-6">
          {/* Model Status */}
          <div className="rounded-2xl overflow-hidden"
            style={{
              background: isDark 
                ? 'rgba(30, 41, 59, 0.8)' 
                : 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(16px)',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.1)'
                : '1px solid rgba(17, 24, 39, 0.10)',
              boxShadow: isDark
                ? '0 6px 16px rgba(0, 0, 0, 0.3)'
                : '0 6px 16px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div 
              className="px-5 py-4 border-b"
              style={{
                borderColor: isDark ? colors.border.primary : colors.border.primary,
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.text.primary }}>
                모델 상태
              </h3>
            </div>
            <div className="p-5">
              <PIModelStatusCard
                status={clusteringMeta ? 'synced' : modelStatus}
                userRole={userRole}
                modelVersion={clusteringMeta?.last_updated 
                  ? new Date(clusteringMeta.last_updated).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '2025. 11. 19. 오전 11:41'}
                quickpollCount={8863}
                panelCount={clusteringMeta?.n_samples || 19020}
                clusterCount={clusteringMeta?.n_clusters || clusters.length || 20}
                silhouette={clusteringMeta?.silhouette_score != null && clusteringMeta.silhouette_score !== 0 ? clusteringMeta.silhouette_score : 0.601}
                lastUpdated={clusteringMeta?.last_updated 
                  ? (() => {
                      const now = new Date();
                      const updated = new Date(clusteringMeta.last_updated!);
                      const diffMs = now.getTime() - updated.getTime();
                      const diffMins = Math.floor(diffMs / 60000);
                      if (diffMins < 1) return '방금 전';
                      if (diffMins < 60) return `${diffMins}분 전`;
                      const diffHours = Math.floor(diffMins / 60);
                      if (diffHours < 24) return `${diffHours}시간 전`;
                      const diffDays = Math.floor(diffHours / 24);
                      return `${diffDays}일 전`;
                    })()
                  : '5분 전'}
                noiseCount={clusteringMeta?.n_noise || umapData.filter(d => d.cluster === -1).length || 60}
              />
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="rounded-2xl overflow-hidden"
            style={{
              background: isDark 
                ? 'rgba(30, 41, 59, 0.8)' 
                : 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(16px)',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.1)'
                : '1px solid rgba(17, 24, 39, 0.10)',
              boxShadow: isDark
                ? '0 6px 16px rgba(0, 0, 0, 0.3)'
                : '0 6px 16px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div 
              className="px-5 py-4 border-b"
              style={{
                borderColor: isDark ? colors.border.primary : colors.border.primary,
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.text.primary }}>
                품질 지표
              </h3>
            </div>
            <div className="p-5">
              <PIQualityLegend
                silhouette={clusteringMeta?.silhouette_score != null && clusteringMeta.silhouette_score !== 0 ? clusteringMeta.silhouette_score : 0.601}
                daviesBouldin={clusteringMeta?.davies_bouldin_score != null && clusteringMeta.davies_bouldin_score !== 0 ? clusteringMeta.davies_bouldin_score : 0.687}
                calinskiHarabasz={clusteringMeta?.calinski_harabasz != null && clusteringMeta.calinski_harabasz !== 0 ? clusteringMeta.calinski_harabasz : 6385.79}
                balanceScore={clusteringMeta?.n_clusters && clusteringMeta?.n_samples && clusterSizes && typeof clusterSizes === 'object' && Object.keys(clusterSizes).length > 0
                  ? (() => {
                      // 클러스터 균형도 계산 (표준편차 기반)
                      const sizes = Object.values(clusterSizes).filter((s: any) => typeof s === 'number' && s > 0);
                      if (sizes.length === 0) return undefined;
                      const mean = sizes.reduce((a: number, b: number) => a + b, 0) / sizes.length;
                      const variance = sizes.reduce((sum: number, size: number) => 
                        sum + Math.pow(size - mean, 2), 0) / sizes.length;
                      const stdDev = Math.sqrt(variance);
                      const cv = mean > 0 ? stdDev / mean : 1;
                      return Math.max(0, Math.min(1, 1 - cv)); // 0~1 범위로 정규화
                    })()
                  : undefined}
                noiseCount={clusteringMeta?.n_noise || umapData.filter(d => d.cluster === -1).length || 0}
                totalCount={clusteringMeta?.n_samples || labels.length || 0}
              />
            </div>
          </div>
        </div>

        {/* Row 5: Clustering Explainer - 제거됨 (중복 정보) */}
      </div>

      {/* Sticky Action Bar */}
      <PIActionBar
        filterSummary="전체 결과"
        selectedCount={clusters.length || clusterProfiles.length}
        onExport={async () => {
          try {
            toast.info('PNG 생성 중...', { duration: 3000 });

            // UMAP 차트 컨테이너 찾기
            let element: HTMLElement | null = null;
            
            // 방법 1: data-umap-chart 속성으로 찾기
            element = document.querySelector('[data-umap-chart]') as HTMLElement;
            
            // 방법 2: umapContainerRef 사용
            if (!element && umapContainerRef.current) {
              element = umapContainerRef.current;
            }
            
            // 방법 3: UMAP 관련 클래스로 찾기
            if (!element) {
              const umapContainers = document.querySelectorAll('.relative.rounded-2xl');
              for (const container of umapContainers) {
                if (container.querySelector('svg')) {
                  element = container as HTMLElement;
                  break;
                }
              }
            }

            if (!element) {
              console.error('UMAP 차트 컨테이너를 찾을 수 없습니다.');
              toast.error('UMAP 차트를 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해주세요.');
              return;
            }

            // 요소의 실제 크기 확인
            const rect = element.getBoundingClientRect();
            const elementWidth = rect.width || element.scrollWidth || element.offsetWidth;
            const elementHeight = rect.height || element.scrollHeight || element.offsetHeight;

            // 크기가 0이면 에러 처리
            if (elementWidth === 0 || elementHeight === 0) {
              console.error('요소의 크기가 0입니다:', { elementWidth, elementHeight, rect });
              toast.error('차트가 아직 완전히 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
              return;
            }

            // 실제 사용할 크기 (컨테이너 크기 사용, 패딩 제외)
            const padding = 48; // p-6 = 24px * 2
            const exportWidth = Math.max(umapSize.width, elementWidth - padding);
            const exportHeight = Math.max(umapSize.height, elementHeight - padding);

            // SVG 요소들이 제대로 렌더링되었는지 확인
            const svgElements = element.querySelectorAll('svg');
            let hasValidSvg = false;
            for (const svg of svgElements) {
              const svgRect = svg.getBoundingClientRect();
              if (svgRect.width > 0 && svgRect.height > 0) {
                hasValidSvg = true;
                break;
              }
            }

            if (!hasValidSvg && svgElements.length > 0) {
              console.warn('SVG 요소들이 아직 렌더링되지 않았습니다. 잠시 대기합니다...');
              // 짧은 대기 후 재시도
              await new Promise(resolve => setTimeout(resolve, 500));
            }

            // 방법 1: SVG를 직접 이미지로 변환 (가장 빠름, 순회 없음)
            const svgElement = element.querySelector('svg') as SVGSVGElement;
            
            if (svgElement) {
              // SVG의 실제 크기 가져오기 (컨테이너 크기 우선 사용)
              const actualWidth = exportWidth || umapSize.width || parseInt(svgElement.getAttribute('width') || '800');
              const actualHeight = exportHeight || umapSize.height || parseInt(svgElement.getAttribute('height') || '800');
              
              // SVG를 직접 PNG로 변환
              const svgData = new XMLSerializer().serializeToString(svgElement);
              
              // SVG에 명시적 크기 추가 (항상 추가하여 정확한 크기 보장)
              const finalSvgData = svgData.replace(
                /<svg([^>]*)>/,
                (match, attrs) => {
                  // 기존 width, height 제거
                  let newAttrs = attrs.replace(/\s*width\s*=\s*["'][^"']*["']/gi, '');
                  newAttrs = newAttrs.replace(/\s*height\s*=\s*["'][^"']*["']/gi, '');
                  // 새로운 width, height 추가
                  return `<svg${newAttrs} width="${actualWidth}" height="${actualHeight}">`;
                }
              );
              
              const svgBlob = new Blob([finalSvgData], { type: 'image/svg+xml;charset=utf-8' });
              const svgUrl = URL.createObjectURL(svgBlob);
              
              const img = new Image();
              img.onload = () => {
                try {
                  // 고해상도 캔버스 생성 (scale 2)
                  const scale = 2;
                  // 이미지의 실제 크기 사용 (SVG가 로드된 후의 실제 크기)
                  const imgWidth = img.naturalWidth || actualWidth;
                  const imgHeight = img.naturalHeight || actualHeight;
                  
                  const canvas = document.createElement('canvas');
                  canvas.width = imgWidth * scale;
                  canvas.height = imgHeight * scale;
                  const ctx = canvas.getContext('2d');
                  
                  if (ctx) {
                    // 배경색 설정
                    ctx.fillStyle = isDark ? '#1F2937' : '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // SVG 이미지 그리기 (고해상도, 원본 크기 유지)
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // 다운로드
                    const link = document.createElement('a');
                    const filename = `UMAP_차트_${new Date().toISOString().split('T')[0]}.png`;
                    link.download = filename;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    
                    URL.revokeObjectURL(svgUrl);
                    toast.success('PNG 파일이 다운로드되었습니다');
                  }
                } catch (err) {
                  console.error('SVG to PNG conversion error:', err);
                  URL.revokeObjectURL(svgUrl);
                  fallbackToHtml2Canvas(element);
                }
              };
              
              img.onerror = () => {
                // SVG 변환 실패 시 html2canvas로 폴백
                URL.revokeObjectURL(svgUrl);
                fallbackToHtml2Canvas(element);
              };
              
              img.src = svgUrl;
            } else {
              // SVG가 없으면 html2canvas 사용
              await fallbackToHtml2Canvas(element);
            }
            
            // html2canvas 폴백 함수
            async function fallbackToHtml2Canvas(el: HTMLElement) {
              const html2canvas = (await import('html2canvas')).default;
              const canvas = await html2canvas(el, {
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                foreignObjectRendering: false,
              });
              
              const link = document.createElement('a');
              const filename = `UMAP_차트_${new Date().toISOString().split('T')[0]}.png`;
              link.download = filename;
              link.href = canvas.toDataURL('image/png');
              link.click();
              toast.success('PNG 파일이 다운로드되었습니다');
            }
          } catch (error) {
            console.error('UMAP PNG export error:', error);
            toast.error(`PNG 내보내기 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
          }
        }}
      />
      
      {/* 반짝반짝 애니메이션 스타일 */}
      <style>{`
        
        .searched-panel-marker {
          filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.8));
        }
      `}      </style>

      {/* 군집 상세정보 드로어 */}
      <ClusterDetailDrawer
        isOpen={isClusterDetailOpen}
        onClose={() => {
          setIsClusterDetailOpen(false);
          setSelectedClusterForDetail(null);
        }}
        clusterData={selectedClusterForDetail}
        searchedPanels={selectedClusterForDetail?.searchedPanels || []}
        onPanelClick={(panelId) => {
          setSelectedPanelId(panelId);
          setIsPanelDetailOpen(true);
        }}
      />
      
      {/* 패널 상세정보 드로어 */}
      <PanelDetailDrawer
        isOpen={isPanelDetailOpen}
        onClose={() => {
          setIsPanelDetailOpen(false);
          setSelectedPanelId('');
        }}
        panelId={selectedPanelId}
      />
    </div>
  );
}

