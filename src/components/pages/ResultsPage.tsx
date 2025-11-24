import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PIPagination } from '../../ui/pi/PIPagination';
import { Search, Filter, Download, Quote, MapPin, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Copy, Loader2, RefreshCw, User, Calendar, Briefcase, DollarSign } from 'lucide-react';
import { PITextField } from '../../ui/pi/PITextField';
import { PIButton } from '../../ui/pi/PIButton';
import { PIChip } from '../../ui/pi/PIChip';
import { PICard } from '../../ui/pi/PICard';
import { PIBadge } from '../../ui/pi/PIBadge';
import { PISegmentedControl } from '../../ui/pi/PISegmentedControl';
import { PIClusterBadge, ClusterType } from '../../ui/pi/PIClusterBadge';
import { PISelectionBar } from '../../ui/pi/PISelectionBar';
import { PIBookmarkStar } from '../../ui/pi/PIBookmarkStar';
import { PIPresetLoadButton } from '../../ui/pi/PIPresetLoadButton';
import { PIBookmarkPanel } from '../../ui/pi/PIBookmarkPanel';
import { PIBookmarkButton } from '../../ui/pi/PIBookmarkButton';
import { SummaryBar } from '../../ui/summary/SummaryBar';
import { SummaryBar as SummaryBarNew } from '../../ui/summary/SummaryBarNew';
import type { SummaryData } from '../../ui/summary/types';
import { convertSummaryDataToBarProps } from '../../ui/summary/summaryBarUtils';
import { bookmarkManager } from '../../lib/bookmarkManager';
import { presetManager, type FilterPreset } from '../../lib/presetManager';
import { toast } from 'sonner';
import { historyManager } from '../../lib/history';
import { searchApi } from '../../lib/utils';
import { SummaryStatDrawer } from '../drawers/SummaryStatDrawer';
import type { SummaryProfileChip } from '../../ui/summary/SummaryBarNew';

interface ResultsPageProps {
  query: string;
  onFilterOpen: () => void;
  onExportOpen: () => void;
  onPanelDetailOpen: (panelId: string) => void;
  onLocatePanel?: (panelId: string) => void;
  filters?: any;
  onQueryChange?: (query: string) => void;
  onSearch?: (query: string) => void;
  onDataChange?: (data: Panel[]) => void;
  onFiltersChange?: (filters: any) => void;
  onTotalResultsChange?: (total: number) => void;
  onPresetEdit?: (preset: any) => void;
}

interface Panel {
  id: string;
  name: string;
  age: number;
  gender: string;
  region: string;
  responses: any;
  created_at: string;
  embedding?: number[];
  coverage?: 'qw' | 'w' | string;
  income?: string;
  aiSummary?: string;
  metadata?: {
    결혼여부?: string;
    자녀수?: number;
    가족수?: string;
    최종학력?: string;
    직업?: string;
    직무?: string;
    "월평균 개인소득"?: string;
    "월평균 가구소득"?: string;
    detail_location?: string;
    [key: string]: any;
  };
}

export function ResultsPage({
  query,
  onFilterOpen,
  onExportOpen,
  onPanelDetailOpen,
  onLocatePanel,
  filters: propFilters = {},
  onQueryChange,
  onSearch,
  onDataChange,
  onFiltersChange,
  onTotalResultsChange,
  onPresetEdit,
}: ResultsPageProps) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // desc = 최신순, asc = 오래된순
  const [bookmarkedPanels, setBookmarkedPanels] = useState<Set<string>>(new Set());
  const [isBookmarkPanelOpen, setIsBookmarkPanelOpen] = useState(false);
  
  // SummaryBar 통계 드로우아웃 상태
  const [statDrawerOpen, setStatDrawerOpen] = useState(false);
  const [selectedChip, setSelectedChip] = useState<SummaryProfileChip | null>(null);
  
  // 로컬 더미 + 페이지네이션 상태
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [qwCount, setQwCount] = useState(0);
  const [wOnlyCount, setWOnlyCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(20); // 페이지당 결과 수 (20개로 변경)
  
  // 검색 결과 캐시 (쿼리+필터 조합을 키로 사용)
  const [searchCache, setSearchCache] = useState<{
    key: string;
    allResults: Panel[];
    total: number;
    pages: number;
  } | null>(null);

  // 북마크 로드 및 업데이트
  const updateBookmarks = () => {
    const bookmarks = bookmarkManager.loadBookmarks();
    const panelIds = new Set(bookmarks.map(b => b.panelId));
    setBookmarkedPanels(panelIds);
  };

  useEffect(() => {
    updateBookmarks();
  }, []);

  // 북마크 패널이 열릴 때마다 북마크 목록 새로고침
  useEffect(() => {
    if (isBookmarkPanelOpen) {
      updateBookmarks();
    }
  }, [isBookmarkPanelOpen]);

  // 북마크 개수 업데이트
  const bookmarkCount = bookmarkedPanels.size;

  // 북마크 토글
  const handleToggleBookmark = (panelId: string, panel: Panel) => {
    const isBookmarked = bookmarkedPanels.has(panelId);
    
    if (isBookmarked) {
      bookmarkManager.removeBookmark(panelId);
      setBookmarkedPanels(prev => {
        const newSet = new Set(prev);
        newSet.delete(panelId);
        return newSet;
      });
      toast.success('북마크가 해제되었습니다');
    } else {
      bookmarkManager.addBookmark({
        panelId,
        timestamp: Date.now(),
        metadata: {
          gender: panel.gender,
          age: panel.age,
          region: panel.region,
        },
      });
      setBookmarkedPanels(prev => new Set(prev).add(panelId));
      toast.success('북마크에 저장되었습니다');
    }
  };

  // 프리셋 로드 핸들러 - 프리셋 필터 값을 적용하고 검색 실행
  const handlePresetLoad = (preset: FilterPreset) => {
    // 프리셋 필터 값을 FilterDrawer 형식으로 변환
    const filtersForDrawer = {
      selectedGenders: preset.filters.gender || [],
      selectedRegions: preset.filters.regions || [],
      selectedIncomes: preset.filters.income || [],
      ageRange: preset.filters.ageRange || [0, 120],
      quickpollOnly: preset.filters.quickpollOnly || false,
      interests: Array.isArray(preset.filters.interests) 
        ? preset.filters.interests 
        : preset.filters.interests 
          ? [preset.filters.interests] 
          : [],
      interestLogic: preset.filters.interestLogic || 'and',
    };
    
    // 필터 적용
    if (onFiltersChange) {
      onFiltersChange(filtersForDrawer);
    }
    
    // 검색 실행 (query가 있으면 그대로, 없으면 빈 쿼리로라도 검색)
    // 프리셋 로드는 필터 변경이므로 강제 새로고침
    if (query && query.trim()) {
      searchPanels(1, true);
    } else {
      // 검색어가 없어도 필터만으로 검색 실행 (필요시)
      toast.success(`프리셋 "${preset.name}"이 적용되었습니다`);
    }
  };

  // 북마크 패널로 이동
  const handleNavigateToBookmark = (panelId: string) => {
    onPanelDetailOpen(panelId);
  };

  // 검색 키 생성 (쿼리 + 필터 조합)
  const getSearchKey = (queryText: string, filters: any): string => {
    return JSON.stringify({
      query: queryText.trim(),
      filters: {
        selectedGenders: filters.selectedGenders || [],
        selectedRegions: filters.selectedRegions || [],
        selectedIncomes: filters.selectedIncomes || [],
        ageRange: filters.ageRange || [],
        quickpollOnly: filters.quickpollOnly || false,
      }
    });
  };

  // 전체 결과를 가져오는 함수 (모든 페이지)
  const fetchAllResults = async (queryText: string, filters: any): Promise<Panel[]> => {
    const allResults: Panel[] = [];
    let currentPageNum = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await searchApi.searchPanels(queryText.trim(), filters, currentPageNum, pageSize);
      const results = response.results || [];
      
      if (results.length === 0) {
        hasMore = false;
      } else {
        allResults.push(...results);
        currentPageNum++;
        
        // 전체 페이지 수 확인
        const totalPages = response.pages || 1;
        if (currentPageNum > totalPages) {
          hasMore = false;
        }
      }
    }
    
    return allResults;
  };

  // 서버 검색 (텍스트 일치 + 페이지네이션)
  const searchPanels = async (pageNum: number = currentPage, forceRefresh: boolean = false) => {
    // 디버그 로그는 개발 환경에서만 출력 (선택적)
    // if (import.meta.env.DEV) {
    //   console.log('[DEBUG Frontend] searchPanels:', { query, pageNum, forceRefresh });
    // }
    
    // 쿼리가 없으면 검색하지 않음
    if (!query || !query.trim()) {
      setPanels([]);
      setTotalResults(0);
      setCurrentPage(1);
      setTotalPages(1);
      setSearchCache(null);
      return;
    }
    
    // 필터 객체 준비 (propFilters 사용)
    const filtersToSend = {
      selectedGenders: propFilters.selectedGenders || [],
      selectedRegions: propFilters.selectedRegions || [],
      selectedIncomes: propFilters.selectedIncomes || [],
      ageRange: propFilters.ageRange || [],
      quickpollOnly: propFilters.quickpollOnly || false,
      interests: propFilters.interests || [],
      interestLogic: propFilters.interestLogic || 'and',
    };
    
    const searchKey = getSearchKey(query, filtersToSend);
    
    // 캐시 확인 (강제 새로고침이 아니고, 같은 검색 키이고, 캐시가 있는 경우)
    if (!forceRefresh && searchCache && searchCache.key === searchKey) {
      const startIdx = (pageNum - 1) * pageSize;
      const endIdx = startIdx + pageSize;
      const paginatedResults = searchCache.allResults.slice(startIdx, endIdx);
      
      setPanels(paginatedResults);
      setTotalResults(searchCache.total);
      setCurrentPage(pageNum);
      setTotalPages(searchCache.pages);
      
      // Q+W, W only 카운트 (현재 페이지만)
      setQwCount(paginatedResults.filter((p: Panel) => p.coverage === 'qw').length);
      setWOnlyCount(paginatedResults.filter((p: Panel) => p.coverage === 'w').length);
      
      return;
    }
    
    // 캐시가 없거나 다른 검색이면 새로 검색
    setLoading(true);
    setError(null);
    // 로딩 시작 시 이전 결과 초기화 (검색 중일 때 빈 결과가 표시되지 않도록)
    setPanels([]);
    
    const searchStartTime = Date.now();
    
    try {
      // 전체 결과 가져오기
      const allResults = await fetchAllResults(query.trim(), filtersToSend);
      const total = allResults.length;
      const pages = Math.max(1, Math.ceil(total / pageSize));
      
      // 캐시에 저장
      setSearchCache({
        key: searchKey,
        allResults: allResults,
        total: total,
        pages: pages
      });
      
      // 현재 페이지 결과 추출
      const startIdx = (pageNum - 1) * pageSize;
      const endIdx = startIdx + pageSize;
      const paginatedResults = allResults.slice(startIdx, endIdx);
      
      setPanels(paginatedResults);
      setTotalResults(total);
      setCurrentPage(pageNum);
      setTotalPages(pages);
      
      // Q+W, W only 카운트 (전체 결과 기준)
      setQwCount(allResults.filter((p: Panel) => p.coverage === 'qw').length);
      setWOnlyCount(allResults.filter((p: Panel) => p.coverage === 'w').length);
      
      // 히스토리 저장 (전체 개수 사용)
      const historyItem = historyManager.createQueryHistory(query.trim(), filtersToSend, total);
      historyManager.save(historyItem);
      
    } catch (err: any) {
      const errorDuration = Date.now() - searchStartTime;
      console.error('[DEBUG Frontend] ========== 에러 발생 ==========');
      console.error('[DEBUG Frontend] 에러 발생 시간:', `${errorDuration}ms`);
      console.error('[DEBUG Frontend] 에러 타입:', err?.constructor?.name || typeof err);
      console.error('[DEBUG Frontend] 에러 메시지:', err?.message);
      console.error('[DEBUG Frontend] 에러 detail:', err?.detail);
      console.error('[DEBUG Frontend] 전체 에러 객체:', err);
      console.error('[DEBUG Frontend] 에러 스택:', err?.stack);
      console.error('[DEBUG Frontend] ==============================');
      
      let errorMsg = err?.message || err?.detail || '알 수 없는 오류';
      
      // Failed to fetch 에러 처리
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('fetch') || err?.name === 'TypeError') {
        console.error('[DEBUG Frontend] 🔴 연결 실패 감지: 네트워크/Fetch 문제');
        errorMsg = `백엔드 서버에 연결할 수 없습니다 (네트워크/Fetch 오류)\n\n원인 파악:\n1. 백엔드 서버 실행 여부 확인 (포트 8004)\n2. CORS 설정 확인\n3. 네트워크 연결 확인\n\n해결 방법:\n터미널에서 실행: cd server && python -m uvicorn app.main:app --reload --port 8004 --host 127.0.0.1`;
      } else if (errorMsg.includes('HTTP error') || err?.message?.includes('status')) {
        console.error('[DEBUG Frontend] 🔴 HTTP 응답 오류: 백엔드는 연결되었으나 오류 응답');
      } else {
        console.error('[DEBUG Frontend] 🔴 기타 오류: 백엔드 로직 또는 DB 문제 가능성');
      }
      
      setError(errorMsg);
      setPanels([]);
      setTotalResults(0);
      setSearchCache(null);
    } finally {
      setLoading(false);
    }
  };

  // 쿼리 또는 필터 변경 시 검색 실행 (debounce 적용)
  const prevQueryRef = useRef<string>('');
  const prevFiltersRef = useRef<any>({});
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // 이전 타이머 취소
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    const queryChanged = query !== prevQueryRef.current;
    const filtersChanged = JSON.stringify(propFilters) !== JSON.stringify(prevFiltersRef.current);
    
    if (query && query.trim() && (queryChanged || filtersChanged)) {
      // Debounce: 500ms 후에 검색 실행
      searchTimeoutRef.current = setTimeout(() => {
        setCurrentPage(1);
        prevQueryRef.current = query;
        prevFiltersRef.current = propFilters;
        searchPanels(1, true);
      }, 500);
    } else if (!query || !query.trim()) {
      setPanels([]);
      setTotalResults(0);
      setCurrentPage(1);
      setTotalPages(1);
      setSearchCache(null);
      prevQueryRef.current = '';
      prevFiltersRef.current = {};
    }
    
    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, propFilters]);

  // 검색 결과가 변경될 때 상위 컴포넌트에 전달
  useEffect(() => {
    if (panels.length > 0) {
      onDataChange?.(panels);
    }
  }, [panels, onDataChange]);

  // 페이지 변경 핸들러 (캐시에서 가져오기)
  const handlePageChange = (page: number) => {
    if (query && query.trim()) {
      // 캐시에서 페이지 변경 (재검색 없음)
      searchPanels(page, false);
    }
  };
  
  // 검색창 돋보기 클릭 핸들러 (재검색 - 강제 새로고침)
  const handleSearchClick = () => {
    if (query && query.trim()) {
      // 강제 새로고침으로 재검색
      searchPanels(1, true);
    } else {
      // 쿼리가 비어있으면 첫 페이지로 검색
      setCurrentPage(1);
      searchPanels(1, true);
    }
  };

  // (Deprecated) 수동 페이지 버튼 제거 → 공용 PIPagination 사용

  // 필터 상태를 appliedFilters에 반영
  useEffect(() => {
    const filterLabels: string[] = [];
    
    if (propFilters.ageRange) {
      const [min, max] = propFilters.ageRange;
      filterLabels.push(`나이: ${min}세-${max}세`);
    }
    
    if (propFilters.selectedGenders && propFilters.selectedGenders.length > 0) {
      filterLabels.push(`성별: ${propFilters.selectedGenders.join(', ')}`);
    }
    
    if (propFilters.selectedRegions && propFilters.selectedRegions.length > 0) {
      filterLabels.push(`지역: ${propFilters.selectedRegions.join(', ')}`);
    }
    
    if (propFilters.selectedIncomes && propFilters.selectedIncomes.length > 0) {
      filterLabels.push(`소득: ${propFilters.selectedIncomes.join(', ')}`);
    }
    
    if (propFilters.quickpollOnly) {
      filterLabels.push('퀵폴 응답 보유만');
    }
    
    setAppliedFilters(filterLabels);
  }, [propFilters]);

  // 퀵 인사이트 제거 요청에 따라 관련 상태/로직 제거

  // 퀵 인사이트 데이터/뷰 제거

  // Sort panels by response date
  const sortedPanels = useMemo(() => {
    return [...panels].sort((a, b) => {
      // Handle null dates (W-only) - always put at the end
      if (!a.created_at && !b.created_at) return 0;
      if (!a.created_at) return 1;
      if (!b.created_at) return 1;
      
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [panels, sortOrder]);

  // 퀵 인사이트 데이터 계산
  const quickInsightData = useMemo(() => {
    if (totalResults === 0 || panels.length === 0) {
      return null;
    }

    // 전체 결과에서 통계 계산
    const qRatio = totalResults > 0 ? Math.round((qwCount / totalResults) * 100) : 0;
    const wRatio = totalResults > 0 ? Math.round((wOnlyCount / totalResults) * 100) : 0;

    // 성별 통계 (여성 비율)
    const genders = panels.map((p: Panel) => {
      const genderStr = (p as any).gender || '';
      if (typeof genderStr === 'string') {
        const lower = genderStr.toLowerCase();
        if (lower.includes('여') || lower.includes('f') || lower === '여성' || lower === 'female') {
          return 'F';
        } else if (lower.includes('남') || lower.includes('m') || lower === '남성' || lower === 'male') {
          return 'M';
        }
      }
      return null;
    }).filter(Boolean) as string[];
    
    const femaleCount = genders.filter(g => g === 'F').length;
    const genderTop = genders.length > 0 ? Math.round((femaleCount / genders.length) * 100) : 50;

    // 지역 통계
    const regions = panels.map((p: Panel) => (p as any).region || '').filter(Boolean);
    const regionCount: Record<string, number> = {};
    regions.forEach(region => {
      regionCount[region] = (regionCount[region] || 0) + 1;
    });
    const topRegions = Object.entries(regionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([region]) => region) as [string, string, string];
    
    // 태그 통계 (임시로 더미 데이터, 실제로는 응답 데이터에서 추출해야 함)
    const topTags: [string, string, string] = ['태그1', '태그2', '태그3'];

    return {
      total: totalResults,
      q_cnt: qwCount,
      q_ratio: qRatio,
      w_cnt: wOnlyCount,
      w_ratio: wRatio,
      gender_top: genderTop,
      top_regions: topRegions.length === 3 ? topRegions : ['서울', '경기', '인천'] as [string, string, string],
      top_tags: topTags,
    };
  }, [totalResults, panels, qwCount, wOnlyCount]);

  // 분포 데이터 계산 (현재 페이지 패널 기준)
  

  return (
    <div className="page-full min-h-screen" style={{ background: 'var(--background)' }}>
      {/* 북마크 패널 */}
      <PIBookmarkPanel 
        isOpen={isBookmarkPanelOpen}
        onNavigate={(panelId) => {
          handleNavigateToBookmark(panelId);
          setIsBookmarkPanelOpen(false);
        }} 
      />
      
      {/* 상단 검색바/툴바 - 완전 통합된 디자인 */}
      <section className="bar-full sticky top-0 z-20" style={{ 
        background: 'var(--card)', 
        borderBottom: '1px solid var(--border)',
        padding: '12px 20px',
        marginBottom: '12px'
      }}>
        {/* 통합된 검색 바 - 실제 검색 헤더 높이에 맞춤 (40px) */}
        <div 
          className="flex items-center gap-0 rounded-xl overflow-hidden"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-primary)',
            height: '40px',
            width: '100%',
          }}
        >
          {/* 검색 입력 필드 */}
          <div className="flex-1 flex items-center" style={{ height: '100%', minWidth: 0 }}>
            <input
              type="text"
              placeholder="검색어 수정..."
              value={query}
              onChange={(e) => onQueryChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchClick();
                }
              }}
              className="w-full h-full border-none outline-none bg-transparent"
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '14px',
                padding: '0 16px',
                height: '100%',
              }}
            />
            <style>{`
              input::placeholder {
                color: var(--text-tertiary);
              }
            `}</style>
          </div>
          
          {/* 내부 아이콘 버튼들 */}
          <div className="flex items-center gap-0.5" style={{ height: '100%', padding: '0 4px', flexShrink: 0 }}>
            <button
              onClick={handleSearchClick}
              className="flex items-center justify-center rounded-lg transition-all"
              style={{
                width: '32px',
                height: '32px',
                color: 'var(--text-secondary)',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              title="검색"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          
          {/* 구분선 */}
          <div style={{ 
            width: '1px', 
            height: '24px', 
            background: 'var(--border-primary)',
            margin: '0 2px',
            flexShrink: 0,
          }} />
          
          {/* 통합된 버튼 그룹 - 검색 필드와 같은 높이 (40px) */}
          <div className="flex items-center gap-0.5" style={{ height: '100%', paddingRight: '2px', flexShrink: 0 }}>
            <PIPresetLoadButton
              onLoad={handlePresetLoad}
              onEdit={(preset) => {
                // 프리셋 클릭 또는 수정 버튼 클릭 시 필터창 열기
                if (onPresetEdit) {
                  onPresetEdit(preset);
                }
              }}
            />
            <PIBookmarkButton
              onClick={() => setIsBookmarkPanelOpen(!isBookmarkPanelOpen)}
              bookmarkCount={bookmarkCount}
            />
            <button
              onClick={onFilterOpen}
              className="flex items-center gap-1.5 px-3 rounded-lg transition-all h-full"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                padding: '0 12px',
                height: '100%',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Filter className="w-3.5 h-3.5" />
              필터
            </button>
            <button
              onClick={onExportOpen}
              className="flex items-center gap-1.5 px-3 rounded-lg transition-all h-full"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                padding: '0 12px',
                height: '100%',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Download className="w-3.5 h-3.5" />
              내보내기
            </button>
          </div>
        </div>
        
        {/* Applied Filter Chips */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {appliedFilters.map((filter, index) => (
            <PIChip
              key={index}
              type="filter"
              selected
              onRemove={() => setAppliedFilters(appliedFilters.filter((_, i) => i !== index))}
            >
              {filter}
            </PIChip>
          ))}
        </div>
      </section>

      {/* Summary Bar - 전체 검색 결과 기준으로 계산 */}
      {(() => {
        // 전체 검색 결과 기준으로 통계 계산 (searchCache의 allResults 사용)
        const allSearchResults = searchCache?.allResults || panels; // 전체 결과가 있으면 사용, 없으면 현재 페이지만
        const currentPanels = panels; // 현재 페이지의 패널들 (표시용)
        const currentTotal = allSearchResults.length; // 전체 검색 결과 수
        const currentQCount = allSearchResults.filter((p: Panel) => p.coverage === 'qw' || p.coverage === 'qw1' || p.coverage === 'qw2' || p.coverage === 'q').length;
        const currentWOnlyCount = allSearchResults.filter((p: Panel) => p.coverage === 'w' || p.coverage === 'w1' || p.coverage === 'w2').length;

        // 성별 통계 (전체 검색 결과 기준)
        const genders = allSearchResults.map((p: Panel) => {
          const genderStr = (p as any).gender || '';
          if (typeof genderStr === 'string') {
            const lower = genderStr.toLowerCase();
            if (lower.includes('여') || lower.includes('f') || lower === '여성' || lower === 'female') {
              return 'F';
            } else if (lower.includes('남') || lower.includes('m') || lower === '남성' || lower === 'male') {
              return 'M';
            }
          }
          return null;
        }).filter(Boolean) as string[];
        
        const femaleCount = genders.filter(g => g === 'F').length;
        const femaleRate = genders.length > 0 ? femaleCount / genders.length : undefined;

        // 지역 통계 (전체 검색 결과 기준)
        const regions = allSearchResults.map((p: Panel) => (p as any).region || (p as any).location || '').filter(Boolean);
        const regionCount: Record<string, number> = {};
        regions.forEach(region => {
          regionCount[region] = (regionCount[region] || 0) + 1;
        });
        const regionsTop = Object.entries(regionCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({
            name,
            count,
            rate: currentTotal > 0 ? Math.round((count / currentTotal) * 100) : 0
          }));

        // 연령대 통계 (전체 검색 결과 기준)
        const ages = allSearchResults.map((p: Panel) => (p as any).age || 0).filter((age: number) => age > 0);
        const avgAge = ages.length > 0 ? Math.round(ages.reduce((sum: number, age: number) => sum + age, 0) / ages.length) : undefined;

        // 연령대 분포 계산
        const ageGroups = [
          { label: '10대', min: 10, max: 19 },
          { label: '20대', min: 20, max: 29 },
          { label: '30대', min: 30, max: 39 },
          { label: '40대', min: 40, max: 49 },
          { label: '50대', min: 50, max: 59 },
          { label: '60대+', min: 60, max: 999 },
        ];
        const ageDistribution = ageGroups.map(group => {
          const count = ages.filter(age => age >= group.min && age <= group.max).length;
          const rate = currentTotal > 0 ? Math.round((count / currentTotal) * 100) : 0;
          return {
            label: group.label,
            count,
            rate
          };
        });

        // 소득 파싱 함수 (범위 처리: "200~299만원" -> 250)
        const parseIncome = (incomeStr: string | undefined): number | null => {
          if (!incomeStr) return null;
          const str = String(incomeStr);
          
          // 범위 형식: "200~299만원", "월 200~299만원" 등
          const rangeMatch = str.match(/(\d+)~(\d+)/);
          if (rangeMatch) {
            const min = parseInt(rangeMatch[1]);
            const max = parseInt(rangeMatch[2]);
            return Math.round((min + max) / 2); // 중간값 반환
          }
          
          // 단일 숫자 형식: "300만원", "월 300만원" 등
          const singleMatch = str.match(/(\d+)/);
          if (singleMatch) {
            return parseInt(singleMatch[1]);
          }
          
          return null;
        };

        // 소득 통계 계산 (전체 검색 결과 기준)
        const personalIncomes = allSearchResults
          .map((p: Panel) => parseIncome(p.metadata?.["월평균 개인소득"]))
          .filter((v): v is number => v !== null && v > 0);
        
        const householdIncomes = allSearchResults
          .map((p: Panel) => parseIncome(p.metadata?.["월평균 가구소득"]))
          .filter((v): v is number => v !== null && v > 0);
        
        const avgPersonalIncome = personalIncomes.length > 0
          ? Math.round(personalIncomes.reduce((sum, val) => sum + val, 0) / personalIncomes.length)
          : undefined;
        
        const avgHouseholdIncome = householdIncomes.length > 0
          ? Math.round(householdIncomes.reduce((sum, val) => sum + val, 0) / householdIncomes.length)
          : undefined;

        // 소득 구간 분포 (개인소득 기준, 없으면 가구소득)
        const allIncomes = personalIncomes.length > 0 ? personalIncomes : householdIncomes;
        const incomeGroups = [
          { label: '200만원 미만', max: 200 },
          { label: '200-300만원', min: 200, max: 300 },
          { label: '300-400만원', min: 300, max: 400 },
          { label: '400-500만원', min: 400, max: 500 },
          { label: '500만원 이상', min: 500, max: Infinity },
        ];
        const incomeDistribution = incomeGroups.map(group => {
          const count = allIncomes.filter(income => {
            if (group.min !== undefined && group.max !== Infinity) {
              return income >= group.min && income < group.max;
            } else if (group.max !== Infinity) {
              return income < group.max;
            } else {
              return income >= group.min!;
            }
          }).length;
          const rate = allIncomes.length > 0 ? Math.round((count / allIncomes.length) * 100) : 0;
          return { label: group.label, count, rate };
        });

        // 직업 통계 (전체 검색 결과 기준)
        const occupations = allSearchResults
          .map((p: Panel) => p.metadata?.직업)
          .filter(Boolean) as string[];
        const occupationCount: Record<string, number> = {};
        occupations.forEach(occ => {
          if (occ) occupationCount[occ] = (occupationCount[occ] || 0) + 1;
        });
        const occupationTop = Object.entries(occupationCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({
            name,
            count,
            rate: currentTotal > 0 ? Math.round((count / currentTotal) * 100) : 0
          }));

        // 학력 분포 (전체 검색 결과 기준)
        const educations = allSearchResults
          .map((p: Panel) => p.metadata?.최종학력)
          .filter(Boolean) as string[];
        const educationCount: Record<string, number> = {};
        educations.forEach(edu => {
          if (edu) educationCount[edu] = (educationCount[edu] || 0) + 1;
        });
        const educationDistribution = Object.entries(educationCount)
          .map(([label, count]) => ({
            label,
            count,
            rate: educations.length > 0 ? Math.round((count / educations.length) * 100) : 0
          }))
          .sort((a, b) => b.count - a.count);

        // 결혼 여부 통계 (전체 검색 결과 기준)
        const marriedStatuses = allSearchResults
          .map((p: Panel) => {
            const status = p.metadata?.결혼여부;
            if (!status) return null;
            const lower = String(status).toLowerCase();
            return lower.includes('기혼') || lower.includes('married') || lower === '기혼' ? 'married' : 'single';
          })
          .filter(Boolean) as string[];
        const marriedCount = marriedStatuses.filter(s => s === 'married').length;
        const marriedRate = marriedStatuses.length > 0 ? marriedCount / marriedStatuses.length : undefined;

        // 자녀 수 통계 (전체 검색 결과 기준)
        const childrenCounts = allSearchResults
          .map((p: Panel) => {
            const count = p.metadata?.자녀수;
            return typeof count === 'number' ? count : null;
          })
          .filter((v): v is number => v !== null && v >= 0);
        const avgChildrenCount = childrenCounts.length > 0
          ? Math.round((childrenCounts.reduce((sum, val) => sum + val, 0) / childrenCounts.length) * 10) / 10
          : undefined;

        // 가구원 수 분포 (전체 검색 결과 기준)
        const householdSizes = allSearchResults
          .map((p: Panel) => {
            const size = p.metadata?.가족수;
            if (!size) return null;
            const match = String(size).match(/(\d+)/);
            return match ? parseInt(match[1]) : null;
          })
          .filter((v): v is number => v !== null && v > 0);
        const householdSizeGroups = [
          { label: '1인', value: 1 },
          { label: '2인', value: 2 },
          { label: '3인', value: 3 },
          { label: '4인', value: 4 },
          { label: '5인 이상', min: 5 },
        ];
        const householdSizeDistribution = householdSizeGroups.map(group => {
          const count = householdSizes.filter(size => {
            if (group.value !== undefined) {
              return size === group.value;
            } else {
              return size >= group.min!;
            }
          }).length;
          const rate = householdSizes.length > 0 ? Math.round((count / householdSizes.length) * 100) : 0;
          return { label: group.label, count, rate };
        });

        // 북마크 비율 (전체 검색 결과 기준)
        const bookmarkedCount = allSearchResults.filter((p: Panel) => bookmarkedPanels.has(p.id)).length;
        const bookmarkedRate = currentTotal > 0 ? bookmarkedCount / currentTotal : undefined;

        // 메타데이터 완성도 계산 (전체 검색 결과 기준)
        const metadataFields = ['직업', '최종학력', '결혼여부', '자녀수', '가족수', '월평균 개인소득', '월평균 가구소득'];
        const completenessScores = allSearchResults.map((p: Panel) => {
          const filledFields = metadataFields.filter(field => {
            const value = p.metadata?.[field];
            return value !== undefined && value !== null && value !== '';
          }).length;
          return filledFields / metadataFields.length;
        });
        const metadataCompleteness = completenessScores.length > 0
          ? completenessScores.reduce((sum, score) => sum + score, 0) / completenessScores.length
          : undefined;

        // 차량 보유율 계산 (전체 검색 결과 기준)
        const carOwnershipStatuses = allSearchResults
          .map((p: Panel) => {
            const status = p.metadata?.["보유차량여부"];
            if (!status) return null;
            const lower = String(status).toLowerCase();
            return lower.includes('있다') || lower === '있음' || lower === 'yes' ? 'has_car' : 'no_car';
          })
          .filter(Boolean) as string[];
        const carOwnershipRate = carOwnershipStatuses.length > 0
          ? carOwnershipStatuses.filter(s => s === 'has_car').length / carOwnershipStatuses.length
          : undefined;

        // 주요 스마트폰 브랜드 통계 (전체 검색 결과 기준)
        const phoneBrands = allSearchResults
          .map((p: Panel) => {
            const brand = p.metadata?.["보유 휴대폰 단말기 브랜드"];
            if (!brand || brand === '무응답' || String(brand).trim() === '') return null;
            return String(brand).trim();
          })
          .filter(Boolean) as string[];
        const phoneBrandCount: Record<string, number> = {};
        phoneBrands.forEach(brand => {
          phoneBrandCount[brand] = (phoneBrandCount[brand] || 0) + 1;
        });
        const topPhoneBrand = Object.entries(phoneBrandCount).length > 0
          ? (() => {
              const sorted = Object.entries(phoneBrandCount)
                .sort((a, b) => b[1] - a[1])[0];
              return {
                name: sorted[0],
                count: sorted[1],
                rate: phoneBrands.length > 0 ? Math.round((sorted[1] / phoneBrands.length) * 100) : 0
              };
            })()
          : undefined;


        // SummaryData 변환 (전체 검색 결과 수 사용)
        const summaryData: SummaryData = {
          total: loading ? 0 : totalResults, // 전체 검색 결과 수 사용
          qCount: loading ? 0 : currentQCount, // 현재 페이지 기준 (전체 데이터 없음)
          wOnlyCount: loading ? 0 : currentWOnlyCount, // 현재 페이지 기준 (전체 데이터 없음)
          femaleRate: femaleRate,
          avgAge: avgAge,
          regionsTop: regionsTop,
          tagsTop: [], // 관심사는 제거
          ageDistribution: ageDistribution,
          // 소득 관련
          avgPersonalIncome,
          avgHouseholdIncome,
          incomeDistribution: incomeDistribution.filter(d => d.count > 0),
          // 직업/학력 관련
          occupationTop: occupationTop.length > 0 ? occupationTop : undefined,
          educationDistribution: educationDistribution.length > 0 ? educationDistribution : undefined,
          // 가족 구성 관련
          marriedRate,
          avgChildrenCount,
          householdSizeDistribution: householdSizeDistribution.filter(d => d.count > 0),
          // 검색 품질 지표
          bookmarkedRate,
          metadataCompleteness,
          // 라이프스타일 관련
          carOwnershipRate,
          topPhoneBrand,
          // latestDate와 medianDate는 현재 데이터가 없음
          // previousTotal도 현재 추적하지 않음
        };

        // 새로운 SummaryBar 사용
        const summaryBarProps = convertSummaryDataToBarProps(
          summaryData,
          query,
          propFilters,
          undefined, // costKb - 추후 API 응답에서 가져올 수 있음
          undefined  // latencyText - 추후 API 응답에서 가져올 수 있음
        );

        return (
          <SummaryBarNew
            {...summaryBarProps}
            onChipClick={(chip) => {
              // 인터랙티브 칩만 드로우아웃 열기
              const interactiveChips = ['region', 'car', 'phone', 'job', 'income', 'age', 'marriage'];
              if (interactiveChips.includes(chip.key)) {
                setSelectedChip(chip);
                setStatDrawerOpen(true);
              } else {
                // 기타 칩은 기존 로직 (필요시 추가)
                console.log('Chip clicked:', chip);
              }
            }}
          />
        );
      })()}

      {/* 하단: 검색 결과 영역 (전체 너비) */}
      <main style={{ marginTop: '24px', paddingTop: '16px' }}>
          {/* View Switch with Sort Control - 결과가 있을 때만 표시 */}
          {!loading && !error && totalResults > 0 && (
            <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>검색 결과</h2>
              <div className="flex items-center gap-4">
                {/* Sort Control */}
                <PISegmentedControl
                  options={[
                    { value: 'desc', label: '최신순' },
                    { value: 'asc', label: '오래된순' },
                  ]}
                  value={sortOrder}
                  onChange={(v) => setSortOrder(v as 'desc' | 'asc')}
                />
                {/* View Mode Toggle */}
                <PISegmentedControl
                  options={[
                    { value: 'table', label: '테이블' },
                    { value: 'cards', label: '카드' },
                  ]}
                  value={viewMode}
                  onChange={(v) => setViewMode(v as 'table' | 'cards')}
                />
              </div>
            </div>
          )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand-blue-300)' }} />
              <span className="text-lg" style={{ color: 'var(--text-primary)' }}>검색 중...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-2xl">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
                <p className="text-red-800 font-semibold mb-2">오류 발생</p>
                <p className="text-red-700 whitespace-pre-line text-sm">{error}</p>
              </div>
              <PIButton onClick={() => searchPanels()}>다시 시도</PIButton>
            </div>
          </div>
        )}

          {/* Empty State - 로딩이 끝나고 결과가 없을 때만 표시 */}
          {!loading && !error && totalResults === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center max-w-md">
                <p className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>검색 결과가 없습니다</p>
                <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>다른 검색어나 필터를 시도해보세요</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <PIButton
                    variant="secondary"
                    size="medium"
                    onClick={onFilterOpen}
                  >
                    필터 조정
                  </PIButton>
                  <PIButton
                    variant="secondary"
                    size="medium"
                    onClick={() => {
                      if (onQueryChange) {
                        onQueryChange('');
                      }
                    }}
                  >
                    검색어 변경
                  </PIButton>
                  <PIButton
                    variant="secondary"
                    size="medium"
                    onClick={() => {
                      // 상단의 프리셋 버튼을 클릭하도록 유도
                      // 실제로는 상단 프리셋 버튼의 ref를 사용하거나, 
                      // 프리셋 메뉴를 직접 여는 로직이 필요하지만
                      // 현재는 사용자에게 안내 메시지 표시
                      toast.info('상단의 "프리셋" 버튼을 클릭하여 프리셋을 불러올 수 있습니다');
                    }}
                  >
                    프리셋 불러오기
                  </PIButton>
                </div>
              </div>
            </div>
          )}

          {/* Results - Cards View */}
          {!loading && !error && totalResults > 0 && viewMode === 'cards' && (
            <>
              {sortedPanels.length === 0 ? null : (
                <div className="cards-grid">
                  {sortedPanels.map((panel) => (
              <PICard
                key={panel.id}
                variant="panel"
                onClick={() => onPanelDetailOpen(panel.id)}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="p-1 rounded-lg transition-colors flex-shrink-0"
                          style={{
                            background: 'transparent'
                          }}
                          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                            e.currentTarget.style.background = 'rgba(250, 204, 21, 0.1)';
                          }}
                          onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <PIBookmarkStar
                            panelId={panel.id}
                            isBookmarked={bookmarkedPanels.has(panel.id)}
                            onToggle={(id) => handleToggleBookmark(id, panel)}
                            size="sm"
                          />
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{panel.name}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>생성일: {new Date(panel.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(panel.id).then(() => {
                            toast.success(`${panel.id} 복사됨`);
                          }).catch(() => {
                            toast.error('클립보드 복사 실패');
                          });
                        }}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{
                          background: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--muted)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title="패널 ID 복사"
                      >
                        <Copy className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                      </button>
                      {(() => {
                        // QuickPoll 응답 여부 확인
                        // ⭐ coverage 필드가 명시적으로 q, qw, qw1, qw2로 시작하는 경우만 Q+W로 표시
                        const hasQuickPoll = panel.coverage && (
                          panel.coverage === 'q' || 
                          panel.coverage === 'qw' || 
                          panel.coverage === 'qw1' || 
                          panel.coverage === 'qw2'
                        );
                        // ⭐ coverage가 없을 때만 metadata의 quick_answers를 확인 (fallback)
                        // 단, 실제로 유효한 값이 있는지 확인
                        const hasValidQuickAnswers = !hasQuickPoll && panel.metadata?.quick_answers && 
                          Object.keys(panel.metadata.quick_answers).length > 0 &&
                          Object.values(panel.metadata.quick_answers).some((val: any) => {
                            if (val === null || val === undefined || val === '') return false;
                            if (Array.isArray(val)) return val.length > 0;
                            return true;
                          });
                        const finalHasQuickPoll = hasQuickPoll || hasValidQuickAnswers;
                        const coverageText = finalHasQuickPoll ? 'Q+W' : 'W';
                        const coverageKind = finalHasQuickPoll ? 'coverage-qw' : 'coverage-w';
                        return (
                          <PIBadge kind={coverageKind}>
                            {coverageText}
                          </PIBadge>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Meta Chips with Icons and Colors */}
                  {(() => {
                    const gender = panel.gender || panel.metadata?.성별 || panel.welcome1_info?.gender || '';
                    const isFemale = gender === '여';
                    return (
                      <div 
                        className="flex flex-wrap gap-2 p-3 rounded-lg transition-colors"
                        style={{
                          background: isFemale ? 'rgba(236, 72, 153, 0.05)' : 'transparent',
                          border: isFemale ? '1px solid rgba(236, 72, 153, 0.15)' : 'none'
                        }}
                      >
                    {/* 성별 */}
                    {(() => {
                      const gender = panel.gender || panel.metadata?.성별 || panel.welcome1_info?.gender || '';
                      if (!gender) return null;
                      return (
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            background: gender === '여' 
                              ? 'rgba(236, 72, 153, 0.1)' 
                              : 'rgba(59, 130, 246, 0.1)',
                            color: gender === '여' 
                              ? '#ec4899' 
                              : '#3b82f6',
                            border: `1px solid ${gender === '여' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
                          }}
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>{gender}</span>
                        </div>
                      );
                    })()}
                    
                    {/* 나이 */}
                    {(() => {
                      const age = panel.age || panel.metadata?.나이 || panel.welcome1_info?.age || 0;
                      if (!age) return null;
                      return (
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            background: 'rgba(139, 92, 246, 0.1)',
                            color: '#8b5cf6',
                            border: '1px solid rgba(139, 92, 246, 0.2)'
                          }}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{age}세</span>
                        </div>
                      );
                    })()}
                    
                    {/* 지역 */}
                    {(() => {
                      const region = panel.region || panel.metadata?.지역 || panel.welcome1_info?.region || '';
                      if (!region) return null;
                      return (
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                          }}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{region}</span>
                        </div>
                      );
                    })()}
                    
                    {/* 직업 (있는 경우) */}
                    {panel.metadata?.직업 && (() => {
                      // 괄호와 그 안의 내용 제거
                      const jobWithoutParentheses = panel.metadata.직업.replace(/\s*\([^)]*\)/g, '').trim();
                      return (
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            color: '#6366f1',
                            border: '1px solid rgba(99, 102, 241, 0.2)'
                          }}
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[100px]">{jobWithoutParentheses}</span>
                        </div>
                      );
                    })()}
                    
                    {/* 소득 (있는 경우) */}
                    {(panel.metadata?.["월평균 개인소득"] || panel.metadata?.["월평균 가구소득"]) && (
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#059669',
                          border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[80px]">
                          {panel.metadata?.["월평균 개인소득"] || panel.metadata?.["월평균 가구소득"]}
                        </span>
                      </div>
                    )}
                      </div>
                    );
                  })()}

                  {/* AI 인사이트 */}
                  {panel.aiSummary && (
                    <div className="pt-2 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
                      <div className="flex gap-2">
                        <Quote className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'var(--brand-blue-300)' }} />
                        <div className="flex-1">
                          <p className="text-xs italic line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
                            {panel.aiSummary}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </PICard>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Results - Table View */}
          {!loading && !error && totalResults > 0 && viewMode === 'table' && (
            <>
              {sortedPanels.length === 0 ? null : (
                <div className="rounded-[var(--radius-card)] border overflow-hidden" style={{ 
                  background: 'var(--surface-1)', 
                  borderColor: 'var(--border-primary)' 
                }}>
                  <table className="w-full">
              <thead className="border-b" style={{
                background: 'var(--bg-0)',
                borderColor: 'var(--border-primary)'
              }}>
                <tr>
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedPanels.length === panels.length && panels.length > 0}
                      onChange={() => {
                        if (selectedPanels.length === panels.length) {
                          setSelectedPanels([]);
                        } else {
                          setSelectedPanels(panels.map(p => p.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-base font-semibold whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>이름</th>
                  <th className="px-4 py-3 text-left text-base font-semibold whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>성별</th>
                  <th className="px-4 py-3 text-left text-base font-semibold whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>나이</th>
                  <th className="px-4 py-3 text-left text-base font-semibold whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>지역/구</th>
                  <th className="px-4 py-3 text-left text-base font-semibold whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>직업</th>
                  <th className="px-4 py-3 text-left text-base font-semibold whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>소득</th>
                  <th className="px-4 py-3 text-center text-base font-semibold whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>응답</th>
                  <th className="px-4 py-3 text-center text-base font-semibold whitespace-nowrap" style={{ color: 'var(--text-tertiary)', verticalAlign: 'middle' }}>북마크</th>
                  <th className="px-4 py-3 text-center text-base font-semibold whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>위치</th>
                </tr>
              </thead>
              <tbody>
                {sortedPanels.map((panel, index) => (
                  <tr
                    key={panel.id}
                    className="border-b transition-all"
                    style={{ 
                      borderColor: 'var(--border-secondary)',
                      background: 'var(--surface-1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface-1)';
                    }}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPanels.includes(panel.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (selectedPanels.includes(panel.id)) {
                            setSelectedPanels(selectedPanels.filter(id => id !== panel.id));
                          } else {
                            setSelectedPanels([...selectedPanels, panel.id]);
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td 
                      className="px-4 py-3 text-lg cursor-pointer transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => onPanelDetailOpen(panel.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--brand-blue-300)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      {panel.name}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const gender = panel.gender || panel.metadata?.성별 || panel.welcome1_info?.gender || '';
                        if (!gender) return <span style={{ color: 'var(--text-tertiary)' }}>-</span>;
                        const isFemale = gender === '여';
                        return (
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium"
                            style={{
                              background: isFemale 
                                ? 'rgba(236, 72, 153, 0.1)' 
                                : 'rgba(59, 130, 246, 0.1)',
                              color: isFemale 
                                ? '#ec4899' 
                                : '#3b82f6',
                              border: `1px solid ${isFemale ? 'rgba(236, 72, 153, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
                            }}
                          >
                            <User className="w-4 h-4" />
                            <span>{gender}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const age = panel.age || panel.metadata?.나이 || panel.welcome1_info?.age || 0;
                        if (!age) return <span style={{ color: 'var(--text-tertiary)' }}>-</span>;
                        return (
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium"
                            style={{
                              background: 'rgba(139, 92, 246, 0.1)',
                              color: '#8b5cf6',
                              border: '1px solid rgba(139, 92, 246, 0.2)'
                            }}
                          >
                            <Calendar className="w-4 h-4" />
                            <span>{age}세</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const region = panel.region || panel.metadata?.지역 || panel.welcome1_info?.region || panel.metadata?.location || '';
                        if (!region) return <span style={{ color: 'var(--text-tertiary)' }}>-</span>;
                        return (
                          <div className="flex flex-col gap-1">
                            <div
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium w-fit"
                              style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.2)'
                              }}
                            >
                              <MapPin className="w-4 h-4" />
                              <span>{region}</span>
                            </div>
                            {panel.metadata?.detail_location && panel.metadata.detail_location !== '무응답' && (
                              <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                                {panel.metadata.detail_location}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const job = panel.metadata?.직업;
                        if (!job) return <span style={{ color: 'var(--text-tertiary)' }}>-</span>;
                        // 괄호와 그 안의 내용 제거
                        const jobWithoutParentheses = job.replace(/\s*\([^)]*\)/g, '').trim();
                        return (
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium max-w-[200px]"
                            style={{
                              background: 'rgba(99, 102, 241, 0.1)',
                              color: '#6366f1',
                              border: '1px solid rgba(99, 102, 241, 0.2)'
                            }}
                          >
                            <Briefcase className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{jobWithoutParentheses}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const income = panel.metadata?.["월평균 개인소득"] || panel.metadata?.["월평균 가구소득"] || panel.income || '';
                        if (!income) return <span style={{ color: 'var(--text-tertiary)' }}>-</span>;
                        return (
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium max-w-[150px]"
                            style={{
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#059669',
                              border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}
                          >
                            <DollarSign className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{income}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        // QuickPoll 응답 여부 확인
                        // ⭐ coverage 필드가 명시적으로 q, qw, qw1, qw2로 시작하는 경우만 Q+W로 표시
                        const hasQuickPoll = panel.coverage && (
                          panel.coverage === 'q' || 
                          panel.coverage === 'qw' || 
                          panel.coverage === 'qw1' || 
                          panel.coverage === 'qw2'
                        );
                        // ⭐ coverage가 없을 때만 metadata의 quick_answers를 확인 (fallback)
                        // 단, 실제로 유효한 값이 있는지 확인
                        const hasValidQuickAnswers = !hasQuickPoll && panel.metadata?.quick_answers && 
                          Object.keys(panel.metadata.quick_answers).length > 0 &&
                          Object.values(panel.metadata.quick_answers).some((val: any) => {
                            if (val === null || val === undefined || val === '') return false;
                            if (Array.isArray(val)) return val.length > 0;
                            return true;
                          });
                        const finalHasQuickPoll = hasQuickPoll || hasValidQuickAnswers;
                        const coverageText = finalHasQuickPoll ? 'Q+W' : 'W';
                        return (
                          <PIBadge kind={finalHasQuickPoll ? 'coverage-qw' : 'coverage-w'}>
                            {coverageText}
                          </PIBadge>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ verticalAlign: 'middle' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PIBookmarkStar
                          panelId={panel.id}
                          isBookmarked={bookmarkedPanels.has(panel.id)}
                          onToggle={(id) => handleToggleBookmark(id, panel)}
                          size="sm"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {onLocatePanel && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLocatePanel(panel.id);
                          }}
                          className="p-2 rounded-lg transition-colors btn--ghost"
                          style={{ color: 'var(--brand-blue-300)' }}
                          title="UMAP에서 위치 표시"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(37, 99, 235, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <MapPin className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                  </tbody>
                </table>
              </div>
              )}
            </>
          )}

          {/* Pagination */}
          {!loading && !error && totalResults > 0 && (
            <div className="mt-8 flex justify-center">
              <PIPagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
              />
            </div>
          )}
        </main>

        {/* SummaryBar 통계 드로우아웃 */}
        <SummaryStatDrawer
          isOpen={statDrawerOpen}
          onClose={() => {
            setStatDrawerOpen(false);
            setSelectedChip(null);
          }}
          chip={selectedChip}
          allSearchResults={searchCache?.allResults || panels}
        />
    </div>
  );
}