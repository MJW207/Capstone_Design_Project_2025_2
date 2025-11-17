import { useState, useMemo, useEffect } from 'react';
import { Download, ArrowRight, TrendingUp, FileText, Image } from 'lucide-react';
import { PICard } from '../../ui/pi/PICard';
import { PIButton } from '../../ui/pi/PIButton';
import { PIBadge } from '../../ui/pi/PIBadge';
import { PIHashtag, getHashtagColor } from '../../ui/pi/PIHashtag';
import { PIGroupSelectionModal } from '../../ui/pi/PIGroupSelectionModal';
import { PISegmentedControl } from '../../ui/pi/PISegmentedControl';
import { PIComparisonView } from '../../ui/profiling-ui-kit/components/comparison/PIComparisonView';
import { ClusterComparisonData } from '../../ui/profiling-ui-kit/components/comparison/types';
import { toast } from 'sonner';
import { historyManager } from '../../lib/history';
import { API_URL } from '../../lib/config';
import { ComparePageEmptyState } from './ComparePageEmptyState';
import { useDarkMode, useThemeColors } from '../../lib/DarkModeSystem';
import { CLUSTER_COLORS } from '../../ui/profiling-ui-kit/components/comparison/utils';

type GroupSource = 'all' | 'search';

interface CompareGroup {
  id: string;
  type: 'cluster' | 'segment';
  label: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
  tags: string[];
  evidence?: string[];
  qualityWarnings?: Array<'low-sample' | 'low-coverage' | 'high-noise'>;
}

interface DifferenceData {
  category: string;
  groupA: number;
  groupB: number;
  delta: number;
}

interface LiftData {
  feature: string;
  liftA: number;
  liftB: number;
}

interface SMDData {
  metric: string;
  groupA: number;
  groupB: number;
  smd: number;
  ci: [number, number];
}



export function ComparePage() {
  const { isDark } = useDarkMode();
  const colors = useThemeColors();
  const [selectedGroupA, setSelectedGroupA] = useState<CompareGroup | null>(null);
  const [selectedGroupB, setSelectedGroupB] = useState<CompareGroup | null>(null);
  const [groupBSource, setGroupBSource] = useState<GroupSource>('all');
  const [diffSortBy, setDiffSortBy] = useState<'delta' | 'lift' | 'smd'>('delta');
  
  // Modal states
  const [isGroupAModalOpen, setIsGroupAModalOpen] = useState(false);
  const [isGroupBModalOpen, setIsGroupBModalOpen] = useState(false);

  // 실제 클러스터 데이터 상태
  const [clusterGroups, setClusterGroups] = useState<CompareGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClusters, setLoadingClusters] = useState(true);
  const [comparisonData, setComparisonData] = useState<ClusterComparisonData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasClusters, setHasClusters] = useState(false);
  // 19개 군집용 고유 색상 (utils.ts에서 import)
  const clusterColors = CLUSTER_COLORS;

  // 클러스터 목록 가져오기
  useEffect(() => {
    const fetchClusters = async () => {
      setLoadingClusters(true);
      try {
        // localStorage에서 최근 클러스터링 세션 ID 가져오기
        const lastSessionId = localStorage.getItem('last_clustering_session_id');
        if (!lastSessionId) {
          console.warn('[비교 분석] 클러스터링 세션이 없습니다.');
          setHasClusters(false);
          setLoadingClusters(false);
          return;
        }
        
        setSessionId(lastSessionId);
        
        // Precomputed 클러스터 프로파일 가져오기
        const response = await fetch(`${API_URL}/api/precomputed/profiles`);
        if (!response.ok) {
          throw new Error('Precomputed 클러스터 프로파일을 가져올 수 없습니다.');
        }
        
        const data = await response.json();
        if (!data.success || !data.data || data.data.length === 0) {
          throw new Error('Precomputed 클러스터 데이터가 없습니다.');
        }
        
        // localStorage에서 클러스터 이름 가져오기 (fallback용)
        const clusterNamesMapStr = localStorage.getItem('cluster_names_map');
        const clusterNamesMap: Record<number, string> = clusterNamesMapStr ? JSON.parse(clusterNamesMapStr) : {};
        
        // 클러스터 그룹 생성
        const groups: CompareGroup[] = data.data.map((profile: any, idx: number) => {
          // 백엔드에서 반환하는 name을 우선 사용, 없으면 localStorage, 없으면 기본값
          const clusterName = profile.name || clusterNamesMap[profile.cluster] || `C${profile.cluster + 1}`;
          const totalSize = data.data.reduce((sum: number, p: any) => sum + p.size, 0);
          const percentage = parseFloat(((profile.size / totalSize) * 100).toFixed(2));
          
          return {
            id: `C${profile.cluster + 1}`,
            type: 'cluster' as const,
            label: clusterName, // 군집 분석에서 명명한 이름 사용
            count: profile.size,
            percentage: percentage,
            color: clusterColors[idx % clusterColors.length],
            description: clusterName,
            tags: [],
            evidence: [],
            qualityWarnings: [],
          };
        });
        
        setClusterGroups(groups);
        setHasClusters(true); // 클러스터가 있으면 true로 설정
        
        // 기본 선택 설정
        if (groups.length > 0 && !selectedGroupA) {
          setSelectedGroupA(groups[0]);
        }
        if (groups.length > 1 && !selectedGroupB) {
          setSelectedGroupB(groups[1]);
        }
      } catch (error) {
        console.error('[비교 분석] 클러스터 목록 가져오기 실패:', error);
        setHasClusters(false);
        setClusterGroups([]);
        // 에러 토스트는 대기 화면에서 처리하므로 여기서는 표시하지 않음
      } finally {
        setLoadingClusters(false);
      }
    };
    
    fetchClusters();
  }, []);

  // 비교 분석 실행
  useEffect(() => {
    const fetchComparison = async () => {
      // 필수 조건 체크 (조건 미충족 시 조용히 리턴)
      if (!selectedGroupA || !selectedGroupB || !sessionId) {
        return;
      }
      
      setLoading(true);
      try {
        const clusterAId = parseInt(selectedGroupA.id.replace('C', '')) - 1;
        const clusterBId = parseInt(selectedGroupB.id.replace('C', '')) - 1;
        
        // 같은 클러스터끼리 비교하는 경우 방지
        if (clusterAId === clusterBId) {
          toast.error('같은 군집끼리는 비교할 수 없습니다. 다른 군집을 선택해주세요.');
          setLoading(false);
          return;
        }
        
        // Precomputed 비교 분석 API 사용
        const response = await fetch(`${API_URL}/api/precomputed/comparison/${clusterAId}/${clusterBId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        
        if (!response.ok) {
          let errorText = '';
          let errorData: any = {};
          
          try {
            errorText = await response.text();
            console.error('[Precomputed 비교 분석 API 오류]', {
              status: response.status,
              statusText: response.statusText,
              errorText: errorText.substring(0, 500),
              clusterA: clusterAId,
              clusterB: clusterBId,
            });
            
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { detail: errorText };
            }
          } catch {
            errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
          }
          
          const errorDetail = errorData.detail || errorData.message || errorText || `HTTP ${response.status}`;
          let detailedError = `[Precomputed 비교 분석 실패]\n\n`;
          detailedError += `클러스터: ${clusterAId} vs ${clusterBId}\n`;
          detailedError += `상태 코드: ${response.status}\n`;
          detailedError += `오류: ${errorDetail}\n\n`;
          
          if (response.status === 404) {
            detailedError += '⚠️ 비교 분석 데이터가 없습니다.\n\n';
            detailedError += '해결 방법:\n';
            detailedError += '1. Precomputed 데이터 재생성:\n';
            detailedError += '   python server/app/clustering/generate_precomputed_data.py\n';
            detailedError += '2. 비교 분석 JSON 파일 확인:\n';
            detailedError += '   clustering_data/data/precomputed/comparison_results.json\n';
          } else if (response.status === 400) {
            detailedError += '⚠️ 잘못된 클러스터 ID입니다.\n';
            detailedError += `클러스터 ${clusterAId} 또는 ${clusterBId}가 존재하지 않습니다.`;
          } else if (response.status >= 500) {
            detailedError += '⚠️ 서버 내부 오류입니다.\n';
            detailedError += '서버 로그를 확인하세요.';
          }
          
          toast.error(`비교 분석 실패 (${response.status})`, {
            description: errorDetail,
            duration: 10000,
          });
          setLoading(false);
          return;
        }
        
        const responseData = await response.json();
        
        // Precomputed API 응답 형식: {success: true, data: {...}}
        const data = responseData.success ? responseData.data : responseData;
        
        if (data.error) {
          console.error('[비교 분석 오류]', data.error);
          throw new Error(data.error);
        }
        
        // 클러스터 이름 가져오기 (selectedGroup의 label 우선 사용, 이미 백엔드 name이 포함됨)
        const groupALabel = selectedGroupA?.label || `C${clusterAId + 1}`;
        const groupBLabel = selectedGroupB?.label || `C${clusterBId + 1}`;
        
        // comparison 데이터에서 highlights 생성
        const allComparisons = data.comparison || [];
        
        // 연속형 변수: cohens_d 기준으로 정렬 (cohens_d가 있는 것만, 절댓값 기준)
        const continuousComparisons = allComparisons
          .filter((item: any) => item.type === 'continuous' && item.cohens_d !== undefined && item.cohens_d !== null)
          .map((item: any) => ({
            ...item,
            abs_cohens_d: Math.abs(item.cohens_d || 0),
          }))
          .sort((a: any, b: any) => b.abs_cohens_d - a.abs_cohens_d)
          .slice(0, 5) // 상위 5개
          .map((item: any) => {
            // abs_cohens_d 제거 (타입에 없음)
            const { abs_cohens_d, ...rest } = item;
            return rest;
          });
        
        // 이진형 변수: abs_diff_pct 기준으로 정렬 (abs_diff_pct가 있는 것만)
        const binaryComparisons = allComparisons
          .filter((item: any) => item.type === 'binary' && (item.abs_diff_pct !== undefined && item.abs_diff_pct !== null))
          .map((item: any) => ({
            ...item,
            abs_diff_pct_value: Math.abs(item.abs_diff_pct || 0),
          }))
          .sort((a: any, b: any) => b.abs_diff_pct_value - a.abs_diff_pct_value)
          .slice(0, 5) // 상위 5개
          .map((item: any) => {
            // abs_diff_pct_value 제거 (타입에 없음)
            const { abs_diff_pct_value, ...rest } = item;
            return rest;
          });
        
        // API 응답을 ClusterComparisonData 형식으로 변환
        const totalCount = (data.group_a?.count ?? 0) + (data.group_b?.count ?? 0);
        const convertedData: ClusterComparisonData = {
          group_a: {
            id: data.group_a?.id ?? clusterAId,
            count: data.group_a?.count ?? 0,
            percentage: totalCount > 0 ? parseFloat(((data.group_a?.count ?? 0) / totalCount * 100).toFixed(2)) : 0,
            label: groupALabel,
          },
          group_b: {
            id: data.group_b?.id ?? clusterBId,
            count: data.group_b?.count ?? 0,
            percentage: totalCount > 0 ? parseFloat(((data.group_b?.count ?? 0) / totalCount * 100).toFixed(2)) : 0,
            label: groupBLabel,
          },
          comparison: allComparisons,
          highlights: {
            num_top: continuousComparisons,
            bin_cat_top: binaryComparisons,
          },
        };
        
        setComparisonData(convertedData);
        
        // 비교 분석 히스토리 저장
        if (selectedGroupA && selectedGroupB) {
          const historyItem = historyManager.createComparisonHistory(
            {
              id: selectedGroupA.id,
              name: selectedGroupA.label,
              color: selectedGroupA.color
            },
            {
              id: selectedGroupB.id,
              name: selectedGroupB.label,
              color: selectedGroupB.color
            },
            'difference', // 기본 분석 타입
            {
              comparison: allComparisons,
              highlights: {
                continuous: continuousComparisons,
                binary: binaryComparisons
              },
            }
          );
          historyManager.save(historyItem);
        }
      } catch (error) {
        console.error('[비교 분석 실패] 상세 오류:', {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          selectedGroupA: selectedGroupA?.id,
          selectedGroupB: selectedGroupB?.id,
          sessionId,
        });
        toast.error(`비교 분석 실행 실패: ${error instanceof Error ? error.message : String(error)}`);
        setComparisonData(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchComparison();
  }, [selectedGroupA, selectedGroupB, sessionId]);


  // Mock difference data - 건강관리형 vs 트렌디소비형
  const differenceData: DifferenceData[] = [
    { category: '여성', groupA: 68, groupB: 72, delta: -4 },
    { category: '남성', groupA: 32, groupB: 28, delta: 4 },
    { category: '20대', groupA: 15, groupB: 45, delta: -30 },
    { category: '30대', groupA: 45, groupB: 35, delta: 10 },
    { category: '40대', groupA: 28, groupB: 15, delta: 13 },
    { category: '50대+', groupA: 12, groupB: 5, delta: 7 },
    { category: '서울', groupA: 35, groupB: 45, delta: -10 },
    { category: '경기', groupA: 25, groupB: 30, delta: -5 },
    { category: '부산', groupA: 15, groupB: 10, delta: 5 },
    { category: '대구', groupA: 10, groupB: 8, delta: 2 },
    { category: '기타', groupA: 15, groupB: 7, delta: 8 },
  ];

  // Mock lift data - 건강관리형 vs 트렌디소비형
  const liftData: LiftData[] = [
    { feature: '건강식품 구매', liftA: 2.4, liftB: 0.8 },
    { feature: '피트니스 이용', liftA: 3.1, liftB: 1.2 },
    { feature: '프리미엄 브랜드', liftA: 1.8, liftB: 0.6 },
    { feature: 'SNS 활동', liftA: 1.2, liftB: 2.8 },
    { feature: '패션/뷰티', liftA: 0.7, liftB: 2.9 },
    { feature: 'OTT 구독', liftA: 1.1, liftB: 2.5 },
    { feature: '온라인 쇼핑', liftA: 1.4, liftB: 1.6 },
    { feature: '배송 서비스', liftA: 1.3, liftB: 1.5 },
    { feature: '브랜드 충성도', liftA: 1.9, liftB: 1.1 },
    { feature: '트렌드 추종', liftA: 0.8, liftB: 2.7 },
  ];

  // Mock SMD data - 건강관리형 vs 트렌디소비형
  const smdData: SMDData[] = [
    { metric: '월 평균 소비액', groupA: 420000, groupB: 280000, smd: 0.82, ci: [0.65, 0.99] },
    { metric: '건강관심도 (1-5)', groupA: 4.2, groupB: 3.1, smd: 0.71, ci: [0.58, 0.84] },
    { metric: '운동 횟수/주', groupA: 3.8, groupB: 1.9, smd: 0.65, ci: [0.52, 0.78] },
    { metric: 'SNS 사용시간/일', groupA: 1.2, groupB: 2.8, smd: -0.58, ci: [-0.71, -0.45] },
    { metric: '브랜드 충성도', groupA: 3.9, groupB: 3.2, smd: 0.42, ci: [0.29, 0.55] },
    { metric: '패션 관심도 (1-5)', groupA: 2.8, groupB: 4.1, smd: -0.73, ci: [-0.86, -0.60] },
    { metric: '트렌드 민감도 (1-5)', groupA: 2.5, groupB: 4.3, smd: -0.89, ci: [-1.02, -0.76] },
    { metric: '가격 민감도 (1-5)', groupA: 3.2, groupB: 2.1, smd: 0.68, ci: [0.55, 0.81] },
  ];




  // Set default selections
  useMemo(() => {
    if (!selectedGroupA && clusterGroups.length > 0) {
      setSelectedGroupA(clusterGroups[0]);
    }
    if (!selectedGroupB && clusterGroups.length > 1) {
      setSelectedGroupB(clusterGroups[1]);
    }
  }, [clusterGroups]);

  // 비교 히스토리 저장 (UI 틀만 - 실제 저장 로직 제거)
  // useMemo(() => {
  //   if (selectedGroupA && selectedGroupB) {
  //     const historyItem = historyManager.createComparisonHistory(
  //       {
  //         id: selectedGroupA.id,
  //         name: selectedGroupA.label,
  //         color: selectedGroupA.color
  //       },
  //       {
  //         id: selectedGroupB.id,
  //         name: selectedGroupB.label,
  //         color: selectedGroupB.color
  //       },
  //       diffSortBy as 'difference' | 'lift' | 'smd',
  //       {
  //         differenceData,
  //         liftData,
  //         smdData
  //       }
  //     );
  //     historyManager.save(historyItem);
  //   }
  // }, [selectedGroupA, selectedGroupB, diffSortBy]);

  const getQualityBadge = (warning: string) => {
    switch (warning) {
      case 'low-sample':
        return { label: '표본<50', variant: 'warning' as const };
      case 'low-coverage':
        return { label: 'Coverage<30%', variant: 'warning' as const };
      case 'high-noise':
        return { label: 'Noise↑', variant: 'error' as const };
      default:
        return null;
    }
  };

  const sortedDifferenceData = useMemo(() => {
    return [...differenceData].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [differenceData, diffSortBy]);

  // 내보내기 함수들
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 현재 활성화된 차트 ID 찾기
  const getCurrentActiveChartId = (): string | null => {
    // DOM에서 현재 표시된 차트 찾기
    const charts = ['radar', 'heatmap', 'stacked', 'index'];
    for (const chartId of charts) {
      const element = document.querySelector(`[data-chart-id="${chartId}"]`) as HTMLElement | null;
      if (element && element.offsetParent !== null) {
        // 요소가 표시되어 있으면 (display: none이 아니면)
        return chartId;
      }
    }
    return null;
  };

  // 현재 활성화된 차트만 PNG로 내보내기
  const downloadChartPNG = async (chartId?: string) => {
    // chartId가 없으면 현재 활성화된 차트 찾기
    const activeChartId = chartId || getCurrentActiveChartId();
    if (!activeChartId) {
      toast.error('내보낼 차트를 찾을 수 없습니다.');
      return;
    }
    try {
      // 그룹이 선택되지 않은 경우 체크
      if (!selectedGroupA || !selectedGroupB || !comparisonData) {
        toast.error('비교할 그룹을 먼저 선택해주세요');
        return;
      }

      toast.info('PNG 생성 중...', { duration: 3000 });

      // data-chart-id로 차트 요소 찾기
      const element = document.querySelector(`[data-chart-id="${activeChartId}"]`) as HTMLElement | null;
      
      if (!element) {
        toast.error('내보낼 차트를 찾을 수 없습니다.');
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

      // html2canvas 사용
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(element, {
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (element) => {
          if (element.tagName === 'CANVAS') return true;
          if (element.tagName === 'PATTERN') return true;
          if (element instanceof SVGElement && element.tagName === 'pattern') return true;
          return false;
        },
        onclone: (clonedDoc) => {
          // 1. 패턴 요소 전역 제거 (createPattern 오류 방지) - 최우선 처리
          const allPatterns = clonedDoc.querySelectorAll('pattern');
          const allPatternIds = new Set<string>();
          allPatterns.forEach((pattern) => {
            const id = pattern.getAttribute('id');
            if (id) allPatternIds.add(id);
            pattern.remove();
          });
          
          // 2. 모든 url(#...) 참조 및 linear-gradient를 찾아서 제거 (더 강력한 접근)
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const element = el as HTMLElement | SVGElement;
            
            // fill 속성 - 모든 url(#...) 참조를 확인
            const fill = element.getAttribute('fill');
            if (fill && fill.includes('url(#')) {
              // 패턴이든 아니든 일단 단색으로 변경 (안전)
              element.setAttribute('fill', isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(229, 231, 235, 0.5)');
            }
            
            // stroke 속성
            const stroke = element.getAttribute('stroke');
            if (stroke && stroke.includes('url(#')) {
              element.setAttribute('stroke', isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB');
            }
            
            // style 속성 (인라인 스타일) - 모든 url(#...) 및 linear-gradient 제거
            const styleAttr = element.getAttribute('style');
            if (styleAttr) {
              let newStyle = styleAttr;
              
              // url(#...) 제거
              if (newStyle.includes('url(#')) {
                newStyle = newStyle.replace(/url\(#[^)]+\)/gi, (match) => {
                  // 패턴 ID인지 확인
                  const matchId = match.match(/url\(#([^)]+)\)/);
                  if (matchId && allPatternIds.has(matchId[1])) {
                    return isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(229, 231, 235, 0.5)';
                  }
                  // 패턴이 아니어도 안전을 위해 제거
                  return isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(229, 231, 235, 0.5)';
                });
              }
              
              // linear-gradient 제거 (createPattern 오류 방지)
              if (newStyle.includes('linear-gradient')) {
                newStyle = newStyle.replace(/linear-gradient\([^)]+\)/gi, isDark ? 'rgba(29, 78, 216, 0.5)' : 'rgba(29, 78, 216, 0.5)');
              }
              
              // radial-gradient 제거
              if (newStyle.includes('radial-gradient')) {
                newStyle = newStyle.replace(/radial-gradient\([^)]+\)/gi, isDark ? 'rgba(29, 78, 216, 0.5)' : 'rgba(29, 78, 216, 0.5)');
              }
              
              if (newStyle !== styleAttr) {
                element.setAttribute('style', newStyle);
              }
            }
          });
          
          // 3. CSS 스타일에서 패턴 참조, gradient 및 oklch 제거
          const styleSheets = clonedDoc.querySelectorAll('style');
          styleSheets.forEach((style) => {
            if (style.textContent) {
              let newContent = style.textContent;
              
              // oklch() 변환
              if (newContent.includes('oklch')) {
                newContent = newContent.replace(
                  /oklch\(([^)]+)\)/g,
                  (_match, params) => {
                    const parts = params.trim().split(/\s+/);
                    const L = parseFloat(parts[0]) || 0.5;
                    if (isDark) {
                      if (L > 0.7) return 'rgb(249, 250, 251)';
                      if (L > 0.5) return 'rgb(209, 213, 219)';
                      if (L > 0.3) return 'rgb(156, 163, 175)';
                      return 'rgb(31, 41, 55)';
                    } else {
                      if (L > 0.7) return 'rgb(255, 255, 255)';
                      if (L > 0.5) return 'rgb(148, 163, 184)';
                      if (L > 0.3) return 'rgb(100, 116, 139)';
                      return 'rgb(15, 23, 42)';
                    }
                  }
                );
              }
              
              // 모든 url(#...) 참조 제거 (패턴이든 아니든)
              newContent = newContent.replace(/url\(#[^)]+\)/gi, isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(229, 231, 235, 0.5)');
              
              // linear-gradient 제거 (createPattern 오류 방지)
              if (newContent.includes('linear-gradient')) {
                newContent = newContent.replace(/linear-gradient\([^)]+\)/gi, isDark ? 'rgba(29, 78, 216, 0.5)' : 'rgba(29, 78, 216, 0.5)');
              }
              
              // radial-gradient 제거
              if (newContent.includes('radial-gradient')) {
                newContent = newContent.replace(/radial-gradient\([^)]+\)/gi, isDark ? 'rgba(29, 78, 216, 0.5)' : 'rgba(29, 78, 216, 0.5)');
              }
              
              if (newContent !== style.textContent) {
                style.textContent = newContent;
              }
            }
          });
          
          // 4. 인라인 스타일의 oklch() 변환
          const elementsWithOklch = clonedDoc.querySelectorAll('[style*="oklch"]');
          const maxElementsToProcess = 1000;
          for (let i = 0; i < Math.min(elementsWithOklch.length, maxElementsToProcess); i++) {
            const el = elementsWithOklch[i] as HTMLElement;
            if (el.closest('svg')) continue;
            
            if (el.style.cssText && el.style.cssText.includes('oklch')) {
              el.style.cssText = el.style.cssText.replace(
                /oklch\([^)]+\)/g,
                () => isDark ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)'
              );
            }
          }
          
          // 5. Canvas 요소 확인 및 수정
          const canvases = clonedDoc.querySelectorAll('canvas');
          canvases.forEach((c) => {
            const canvas = c as HTMLCanvasElement;
            if (canvas.width === 0 || canvas.height === 0) {
              canvas.width = canvas.clientWidth || 1;
              canvas.height = canvas.clientHeight || 1;
            }
          });
          
          // 6. SVG 요소들의 크기 확인 및 수정
          const svgs = clonedDoc.querySelectorAll('svg');
          svgs.forEach((svg) => {
            const svgEl = svg as SVGSVGElement;
            const viewBox = svgEl.getAttribute('viewBox');
            let width = svgEl.getAttribute('width');
            let height = svgEl.getAttribute('height');
            
            if (!width || width === '0' || !height || height === '0') {
              if (viewBox) {
                const parts = viewBox.split(' ').map(Number);
                if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
                  width = String(parts[2]);
                  height = String(parts[3]);
                  svgEl.setAttribute('width', width);
                  svgEl.setAttribute('height', height);
                }
              } else {
                width = '800';
                height = '600';
                svgEl.setAttribute('width', width);
                svgEl.setAttribute('height', height);
              }
            }
          });
        },
      });

      const link = document.createElement('a');
      const filename = `${activeChartId}_${selectedGroupA.label}_vs_${selectedGroupB.label}_${new Date().toISOString().split('T')[0]}.png`;
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('PNG 파일이 다운로드되었습니다');
    } catch (error) {
      console.error('PNG export error:', error);
      toast.error(`PNG 내보내기 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const exportToCSV = () => {
    if (!comparisonData || !selectedGroupA || !selectedGroupB) {
      toast.error('비교할 그룹을 먼저 선택해주세요');
      return;
    }

    // CSV 헤더
    const headers = [
      '변수명',
      '한글명',
      '타입',
      `${selectedGroupA.label} 평균/비율`,
      `${selectedGroupB.label} 평균/비율`,
      '차이',
      '차이(%)',
      'Lift(%)',
      'Cohen\'s d',
      'p-value',
      '유의성'
    ];

    const rows: string[][] = [headers];

    // 비교 데이터 추가
    comparisonData.comparison.forEach((item: any) => {
      const featureNameKr = item.feature_name_kr || item.feature;
      let groupAValue = '';
      let groupBValue = '';
      let difference = '';
      let differencePct = '';
      
      if (item.type === 'continuous') {
        const origA = item.original_group_a_mean ?? item.group_a_mean;
        const origB = item.original_group_b_mean ?? item.group_b_mean;
        groupAValue = origA !== null && origA !== undefined ? origA.toFixed(2) : '-';
        groupBValue = origB !== null && origB !== undefined ? origB.toFixed(2) : '-';
        difference = item.difference !== null && item.difference !== undefined ? item.difference.toFixed(2) : '-';
        differencePct = item.lift_pct !== null && item.lift_pct !== undefined ? item.lift_pct.toFixed(2) : '-';
      } else if (item.type === 'binary') {
        groupAValue = item.group_a_ratio !== null && item.group_a_ratio !== undefined ? (item.group_a_ratio * 100).toFixed(2) + '%' : '-';
        groupBValue = item.group_b_ratio !== null && item.group_b_ratio !== undefined ? (item.group_b_ratio * 100).toFixed(2) + '%' : '-';
        const absDiffPct = item.abs_diff_pct ?? Math.abs(item.difference) * 100;
        difference = absDiffPct !== null && absDiffPct !== undefined ? absDiffPct.toFixed(2) + '%p' : '-';
        differencePct = item.lift_pct !== null && item.lift_pct !== undefined ? item.lift_pct.toFixed(2) : '-';
      } else {
        groupAValue = '-';
        groupBValue = '-';
        difference = '-';
        differencePct = '-';
      }

      rows.push([
        item.feature || '',
        featureNameKr || '',
        item.type || '',
        groupAValue,
        groupBValue,
        difference,
        differencePct,
        item.lift_pct !== null && item.lift_pct !== undefined ? item.lift_pct.toFixed(2) : '-',
        item.cohens_d !== null && item.cohens_d !== undefined ? item.cohens_d.toFixed(3) : '-',
        item.p_value !== null && item.p_value !== undefined ? item.p_value.toFixed(4) : '-',
        item.significant ? '유의' : '비유의'
      ]);
    });


    // CSV 콘텐츠 생성 (BOM 추가로 한글 깨짐 방지)
    const csvContent = '\uFEFF' + rows.map(row => 
      row.map(cell => {
        // 셀 내용에 쉼표나 따옴표가 있으면 따옴표로 감싸기
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    const filename = `비교분석_${selectedGroupA.label}_vs_${selectedGroupB.label}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
    toast.success('CSV 파일이 다운로드되었습니다');
  };

  // 대기 화면 표시 조건: 클러스터 로딩 중이거나 클러스터가 없을 때
  // 로딩이 완료되고 클러스터가 없을 때만 대기 화면 표시
  if (!loadingClusters && !hasClusters) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--background)' }}>
        <ComparePageEmptyState />
      </div>
    );
  }

  // 로딩 중일 때는 간단한 로딩 표시
  if (loadingClusters) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-500)] mb-4"></div>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--neutral-600)' }}>
            클러스터 목록을 불러오는 중...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* SECTION-0: Compare Bar */}
      <div className="sticky top-0 z-40 border-b" style={{ 
        height: '72px', 
        background: 'var(--card)', 
        borderColor: 'var(--border)' 
      }}>
        <div className="mx-auto px-20 h-full flex items-center justify-between">
          {/* Left: Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {selectedGroupA && selectedGroupB ? (
                <>
                  {/* Group A Info */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: selectedGroupA.color }}
                    />
                    <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {selectedGroupA.label}
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {selectedGroupA.count.toLocaleString()}명
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {selectedGroupA.percentage.toFixed(2)}%
                    </span>
                  </div>

                  <span className="text-base font-medium" style={{ color: 'var(--text-tertiary)' }}>vs</span>

                  {/* Group B Info */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: selectedGroupB.color }}
                    />
                    <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {selectedGroupB.label}
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {selectedGroupB.count.toLocaleString()}명
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {selectedGroupB.percentage.toFixed(2)}%
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  비교할 그룹을 선택해주세요
                </span>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <PIButton 
              variant="ghost" 
              size="small"
              onClick={exportToCSV}
            >
              <FileText className="w-4 h-4 mr-1" />
              CSV
            </PIButton>
            <PIButton 
              variant="ghost" 
              size="small"
              onClick={() => downloadChartPNG()}
            >
              <Image className="w-4 h-4 mr-1" />
              PNG
            </PIButton>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto px-20 py-6 space-y-6 comparison-chart-container">
        {/* SECTION-1: Cluster Selection UI */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <PICard className="p-6">
              <div className="flex items-center gap-6">
                {/* Group A Selection */}
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    첫 번째 군집 선택
                  </label>
                  <button
                    className="w-full px-4 py-3 rounded-lg border-2 flex items-center justify-between hover:border-[var(--primary-500)] transition-colors"
                    style={{
                      borderColor: selectedGroupA?.color || 'var(--border)',
                      background: selectedGroupA?.color ? `${selectedGroupA.color}10` : 'transparent',
                    }}
                    onClick={() => setIsGroupAModalOpen(true)}
                  >
                    <div className="flex items-center gap-3">
                      {selectedGroupA && (
                        <>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ background: selectedGroupA.color }}
                          />
                          <div className="text-left">
                            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {selectedGroupA.label}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {selectedGroupA.count.toLocaleString()}명 · {selectedGroupA.percentage.toFixed(2)}%
                            </div>
                          </div>
                        </>
                      )}
                      {!selectedGroupA && (
                        <span style={{ color: 'var(--text-secondary)' }}>군집 선택</span>
                      )}
                    </div>
                    <span style={{ color: 'var(--text-tertiary)' }}>▼</span>
                  </button>
                </div>

                <div className="flex items-center">
                  <span className="text-lg font-semibold" style={{ color: 'var(--text-tertiary)' }}>VS</span>
                </div>

                {/* Group B Selection */}
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    두 번째 군집 선택
                  </label>
                  <button
                    className="w-full px-4 py-3 rounded-lg border-2 flex items-center justify-between hover:border-[var(--primary-500)] transition-colors"
                    style={{
                      borderColor: selectedGroupB?.color || 'var(--border)',
                      background: selectedGroupB?.color ? `${selectedGroupB.color}10` : 'transparent',
                    }}
                    onClick={() => setIsGroupBModalOpen(true)}
                  >
                    <div className="flex items-center gap-3">
                      {selectedGroupB && (
                        <>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ background: selectedGroupB.color }}
                          />
                          <div className="text-left">
                            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {selectedGroupB.label}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {selectedGroupB.count.toLocaleString()}명 · {selectedGroupB.percentage.toFixed(2)}%
                            </div>
                          </div>
                        </>
                      )}
                      {!selectedGroupB && (
                        <span style={{ color: 'var(--text-secondary)' }}>군집 선택</span>
                      )}
                    </div>
                    <span style={{ color: 'var(--text-tertiary)' }}>▼</span>
                  </button>
                </div>
              </div>
            </PICard>
          </div>
        </div>

        {/* SECTION-2: Difference Panel - Figma Component */}
        {selectedGroupA && selectedGroupB ? (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12">
              {loading ? (
                <div className="flex items-center justify-center p-12 rounded-2xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(17, 24, 39, 0.10)',
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#64748B' }}>
                    비교 분석 중...
                  </p>
                </div>
              ) : comparisonData ? (
                <div data-comparison-view>
                  <PIComparisonView data={comparisonData} />
                </div>
              ) : (
                <div className="flex items-center justify-center p-12 rounded-2xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(17, 24, 39, 0.10)',
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#64748B' }}>
                    비교 분석 데이터를 불러올 수 없습니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12">
              <PICard className="relative overflow-visible h-[540px] p-5" data-export-chart>
                <div className="flex items-center justify-center h-full">
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--neutral-600)' }}>
                    비교할 그룹을 선택해주세요
                  </p>
                </div>
              </PICard>
            </div>
          </div>
        )}

        {/* SECTION-2: Legacy Difference Panel (Hidden) */}
        {false && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12">
              <PICard className="relative overflow-visible h-[540px] p-5" data-export-chart>
                {/* Top gradient hairline */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{
                    background: 'linear-gradient(90deg, #C7B6FF 0%, #A5C8FF 100%)',
                  }}
                />

                {/* Header - Sticky */}
                <div className="flex items-center justify-between sticky top-0 backdrop-blur-md z-10" style={{ 
                  padding: '12px 0', 
                  marginBottom: '16px',
                  background: 'var(--card)'
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>차이 분석</h3>
                  <PISegmentedControl
                    value={diffSortBy}
                    onChange={(v) => setDiffSortBy(v as 'delta' | 'lift' | 'smd')}
                      options={[
                        { value: 'delta', label: 'Delta%p' },
                        { value: 'lift', label: 'Lift' },
                      { value: 'smd', label: 'SMD' },
                    ]}
                  />
                </div>

                <div className="space-y-4" style={{ gap: '16px' }}>
                  {/* BLOCK-1: Δ%p (h=220) */}
                <div style={{ height: '220px' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-600)' }}>분포 차이 (Delta%p)</h4>
                    <select 
                      className="text-xs px-2 py-1 rounded border"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--card)',
                        color: 'var(--muted-foreground)'
                      }}
                      defaultValue="delta"
                    >
                      <option value="delta">Delta%p ↓</option>
                      <option value="groupA">A% ↓</option>
                      <option value="groupB">B% ↓</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sortedDifferenceData.slice(0, 6).map((item, idx) => {
                      const maxPercent = Math.max(item.groupA, item.groupB);
                      const scaleA = (item.groupA / maxPercent) * 100;
                      const scaleB = (item.groupB / maxPercent) * 100;

                      return (
                        <div key={idx} className="flex items-center" style={{ gap: '12px' }}>
                          {/* Col-L: Label (120px) */}
                          <div style={{ width: '120px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: 'var(--primary-500)' }}>
                            {item.category}
                          </div>

                          {/* Col-M: Diverging Bar (flex-1) */}
                          <div className="flex-1 relative" style={{ height: '14px' }}>
                            {/* Rail */}
                            <div className="absolute inset-0 rounded-full" style={{ background: '#EEF2F8' }} />
                            
                            {/* Center guide */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: '#E5E7EB', transform: 'translateX(-50%)' }} />
                            
                            {/* Left fill (A) - align right */}
                            <div 
                              className="absolute top-0 bottom-0 right-1/2 rounded-l-full"
                              style={{ 
                                width: `${scaleA / 2}%`,
                                background: '#3B82F6',
                              }}
                            />
                            
                            {/* Right fill (B) - align left */}
                            <div 
                              className="absolute top-0 bottom-0 left-1/2 rounded-r-full"
                              style={{ 
                                width: `${scaleB / 2}%`,
                                background: '#8B5CF6',
                              }}
                            />
                            
                            {/* Center Δ chip - Enhanced visibility */}
                            <div 
                              className="absolute top-1/2 left-1/2 flex items-center gap-0.5 px-2 py-1 rounded-full shadow-sm"
                              style={{ 
                                transform: 'translate(-50%, -50%)',
                                background: item.delta > 0 ? '#DCFCE7' : '#FEE2E2',
                                border: `1.5px solid ${item.delta > 0 ? '#16A34A' : '#DC2626'}`,
                                color: item.delta > 0 ? '#15803D' : '#B91C1C',
                                fontWeight: 700,
                                fontSize: '11px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span style={{ fontSize: '10px' }}>{item.delta > 0 ? '+' : '-'}</span>
                              <span>{Math.abs(item.delta)}%p</span>
                            </div>
                          </div>

                          {/* Col-R: Values (96px) */}
                          <div style={{ width: '96px', fontSize: '12px', fontWeight: 600, color: 'var(--primary-500)' }}>
                            <span style={{ color: '#3B82F6' }}>{item.groupA}%</span>
                            <span style={{ color: 'var(--neutral-400)', fontWeight: 400, margin: '0 4px' }}>/</span>
                            <span style={{ color: '#8B5CF6' }}>{item.groupB}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* BLOCK-2: Lift (h=160) */}
                <div className="pt-4 border-t border-[var(--neutral-200)]" style={{ height: '160px' }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-600)' }}>특징 히트맵 (Lift)</h4>
                    <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--neutral-500)' }}>1.0 기준</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {liftData.slice(0, 4).map((item, idx) => {
                      // Diverging bar around 1.0 with MAX width limit to prevent overflow
                      const baselinePosition = 50; // 1.0 at center
                      const maxLift = 3.0;
                      const MAX_BAR_WIDTH = 45; // Maximum 45% to prevent overflow into text
                      
                      // Calculate positions relative to baseline and clamp to max
                      let widthA = Math.min(((item.liftA - 1) / (maxLift - 1)) * baselinePosition, MAX_BAR_WIDTH);
                      let widthB = Math.min(((item.liftB - 1) / (maxLift - 1)) * baselinePosition, MAX_BAR_WIDTH);
                      
                      // For values < 1.0, calculate from left
                      let leftPosA = item.liftA < 1 ? Math.max(baselinePosition - Math.min(((1 - item.liftA) / (maxLift - 1)) * baselinePosition, MAX_BAR_WIDTH), 5) : baselinePosition;
                      let leftPosB = item.liftB < 1 ? Math.max(baselinePosition - Math.min(((1 - item.liftB) / (maxLift - 1)) * baselinePosition, MAX_BAR_WIDTH), 5) : baselinePosition;

                      return (
                        <div key={idx} className="flex items-center" style={{ gap: '12px' }}>
                          {/* Col-L: Label */}
                          <div style={{ width: '120px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: 'var(--primary-500)' }}>
                            {item.feature}
                          </div>

                          {/* Col-M: Diverging bar around 1.0 - SAFE ZONE */}
                          <div className="flex-1 relative overflow-hidden" style={{ height: '14px' }}>
                            {/* Rail - z-index 0 */}
                            <div className="absolute inset-0 rounded-full" style={{ background: '#EEF2F8', zIndex: 0 }} />
                            
                            {/* Center line at 1.0 - z-index 2 */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: '#D1D5DB', transform: 'translateX(-50%)', zIndex: 2 }} />
                            <div 
                              className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full" 
                              style={{ background: '#9CA3AF', transform: 'translate(-50%, -50%)', zIndex: 2 }}
                            />
                            
                            {/* Group A bar - z-index 1 */}
                            {item.liftA < 1 ? (
                              <div 
                                className="absolute top-0 bottom-0 rounded-full"
                                style={{ 
                                  left: `${leftPosA}%`,
                                  right: '50%',
                                  background: '#60A5FA',
                                  opacity: 0.4,
                                  zIndex: 1,
                                }}
                              />
                            ) : (
                              <div 
                                className="absolute top-0 bottom-0 rounded-r-full"
                                style={{ 
                                  left: '50%',
                                  width: `${widthA}%`,
                                  background: '#F59E0B',
                                  opacity: 0.8,
                                  zIndex: 1,
                                }}
                              />
                            )}
                            
                            {/* Group B bar - z-index 1 */}
                            {item.liftB < 1 ? (
                              <div 
                                className="absolute top-0 bottom-0 rounded-full"
                                style={{ 
                                  left: `${leftPosB}%`,
                                  right: '50%',
                                  background: '#60A5FA',
                                  opacity: 0.25,
                                  zIndex: 1,
                                }}
                              />
                            ) : (
                              <div 
                                className="absolute top-0 bottom-0 rounded-r-full"
                                style={{ 
                                  left: '50%',
                                  width: `${widthB}%`,
                                  background: '#F59E0B',
                                  opacity: 0.5,
                                  zIndex: 1,
                                }}
                              />
                            )}
                          </div>

                          {/* Col-R: Values - PROTECTED with explicit z-index */}
                          <div style={{ width: '96px', display: 'flex', flexDirection: 'column', gap: '0', position: 'relative', zIndex: 10 }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-500)', lineHeight: '1.3' }}>
                              <span style={{ color: '#3B82F6' }}>{item.liftA.toFixed(1)}×</span>
                              <span style={{ margin: '0 2px', color: 'var(--neutral-400)', fontWeight: 400 }}>/</span>
                              <span style={{ color: '#8B5CF6' }}>{item.liftB.toFixed(1)}×</span>
                            </div>
                            <div style={{ fontSize: '9px', fontWeight: 400, color: 'var(--neutral-500)', lineHeight: '1.2' }}>
                              base 18%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* BLOCK-3: SMD (h=160) */}
                <div className="pt-4 border-t border-[var(--neutral-200)]" style={{ height: '160px' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                    <div className="flex items-center gap-2">
                      <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-600)' }}>연속형 차이 (SMD)</h4>
                      <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--neutral-500)' }}>표준화 평균 차이</span>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-[var(--neutral-600)] cursor-pointer">
                      <input type="checkbox" className="w-3 h-3 rounded" />
                      <span style={{ fontSize: '10px' }}>절대값 정렬</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {smdData.slice(0, 4).map((item, idx) => {
                      // Zero baseline at center
                      const maxSMD = 2.0;
                      const smdPosition = ((item.smd / maxSMD) * 50) + 50; // Map -2~2 to 0~100%
                      const ciLeft = ((item.ci[0] / maxSMD) * 50) + 50;
                      const ciRight = ((item.ci[1] / maxSMD) * 50) + 50;

                      return (
                        <div key={idx} className="flex items-center" style={{ gap: '12px' }}>
                          {/* Col-L: Label */}
                          <div style={{ width: '120px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: 'var(--primary-500)' }}>
                            {item.metric}
                          </div>

                          {/* Col-M: Diverging bar with dot and CI whisker */}
                          <div className="flex-1 relative" style={{ height: '14px' }}>
                            {/* Rail */}
                            <div className="absolute inset-0 rounded-full" style={{ background: '#EEF2F8' }} />
                            
                            {/* Zero baseline */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: '#D1D5DB', transform: 'translateX(-50%)' }} />
                            
                            {/* CI range (whisker) */}
                            <div
                              className="absolute top-1/2 h-0.5"
                              style={{
                                left: `${Math.min(ciLeft, ciRight)}%`,
                                width: `${Math.abs(ciRight - ciLeft)}%`,
                                background: item.smd > 0 ? '#3B82F6' : '#8B5CF6',
                                opacity: 0.3,
                                transform: 'translateY(-50%)',
                              }}
                            />
                            
                            {/* Point estimate (dot) */}
                            <div
                              className="absolute top-1/2 w-2 h-2 rounded-full shadow-sm"
                              style={{
                                left: `${smdPosition}%`,
                                transform: 'translate(-50%, -50%)',
                                background: item.smd > 0 ? '#3B82F6' : '#8B5CF6',
                                border: '1.5px solid white',
                              }}
                            />
                          </div>

                          {/* Col-R: Values */}
                          <div style={{ width: '96px' }}>
                            <span
                              className="inline-block px-2 py-0.5 rounded"
                              style={{
                                background: item.smd > 0 ? 'rgba(59, 130, 246, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                                color: item.smd > 0 ? '#3B82F6' : '#8B5CF6',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                            >
                              {item.smd > 0 ? '+' : ''}{item.smd.toFixed(2)} σ
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                </div>
              </PICard>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER: Sticky Action Bar */}
      <div
        className="sticky bottom-0 z-30 border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
        style={{ 
          height: '56px',
          background: 'var(--card)',
          borderColor: 'var(--border)'
        }}
      >
        <div className="mx-auto px-20 h-full flex items-center justify-between">
          <div className="text-sm text-[var(--neutral-600)]">
            선택:{' '}
            <span className="font-semibold" style={{ color: selectedGroupA?.color }}>
              {selectedGroupA?.id}
            </span>
            {' vs '}
            <span className="font-semibold" style={{ color: selectedGroupB?.color }}>
              {selectedGroupB?.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <PIButton variant="ghost" size="small">
              <Download className="w-4 h-4 mr-1" />
              CSV
            </PIButton>
            <PIButton 
              variant="primary" 
              size="small"
              onClick={() => downloadChartPNG()}
            >
              <Download className="w-4 h-4 mr-1" />
              PNG
            </PIButton>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PIGroupSelectionModal
        isOpen={isGroupAModalOpen}
        onClose={() => setIsGroupAModalOpen(false)}
        onSelect={(group) => {
          setSelectedGroupA(group);
          setIsGroupAModalOpen(false);
        }}
        groups={clusterGroups}
        title="그룹 A 선택"
        selectedGroup={selectedGroupA}
      />

      <PIGroupSelectionModal
        isOpen={isGroupBModalOpen}
        onClose={() => setIsGroupBModalOpen(false)}
        onSelect={(group) => {
          setSelectedGroupB(group);
          setIsGroupBModalOpen(false);
        }}
        groups={clusterGroups}
        title="그룹 B 선택"
        selectedGroup={selectedGroupB}
      />

    </div>
  );
}
