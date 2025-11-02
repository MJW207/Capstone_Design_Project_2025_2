import React, { useState, useMemo, useEffect } from 'react';
import { PIPagination } from '../pi/PIPagination';
import { Search, Filter, Download, Quote, MapPin, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Copy, Loader2 } from 'lucide-react';
import { PITextField } from '../pi/PITextField';
import { PIButton } from '../pi/PIButton';
import { PIChip } from '../pi/PIChip';
import { PICard } from '../pi/PICard';
import { PIBadge } from '../pi/PIBadge';
import { PISegmentedControl } from '../pi/PISegmentedControl';
import { PIClusterBadge, ClusterType } from '../pi/PIClusterBadge';
import { PISelectionBar } from '../pi/PISelectionBar';
import { PIBookmarkStar } from '../pi/PIBookmarkStar';
import { PIPresetLoadButton } from '../pi/PIPresetLoadButton';
import { PIBookmarkPanel } from '../pi/PIBookmarkPanel';
import { PIBookmarkButton } from '../pi/PIBookmarkButton';
import { SummaryBar } from '../summary/SummaryBar';
import type { SummaryData } from '../summary/types';
import { bookmarkManager } from '../../lib/bookmarkManager';
import { presetManager, type FilterPreset } from '../../lib/presetManager';
import { toast } from 'sonner';
import { historyManager } from '../../lib/history';
import { searchApi } from '../../lib/utils';

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
      ageRange: preset.filters.ageRange || [15, 80],
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
    if (query && query.trim()) {
      searchPanels(1);
    } else {
      // 검색어가 없어도 필터만으로 검색 실행 (필요시)
      toast.success(`프리셋 "${preset.name}"이 적용되었습니다`);
    }
  };

  // 북마크 패널로 이동
  const handleNavigateToBookmark = (panelId: string) => {
    onPanelDetailOpen(panelId);
  };

  // 서버 검색 (텍스트 일치 + 페이지네이션)
  const searchPanels = async (pageNum: number = currentPage) => {
    console.log('[DEBUG Frontend] ========== searchPanels 시작 ==========');
    console.log('[DEBUG Frontend] Query:', query);
    console.log('[DEBUG Frontend] Page:', pageNum);
    
    // 쿼리가 없으면 검색하지 않음
    if (!query || !query.trim()) {
      console.log('[DEBUG Frontend] Query가 비어있음, 검색 스킵');
      setPanels([]);
      setTotalResults(0);
      setCurrentPage(1);
      setTotalPages(1);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const searchStartTime = Date.now();
    // 필터 객체 준비 (propFilters 사용)
    const filtersToSend = {
      selectedGenders: propFilters.selectedGenders || [],
      selectedRegions: propFilters.selectedRegions || [],
      selectedIncomes: propFilters.selectedIncomes || [],
      ageRange: propFilters.ageRange || [],
      quickpollOnly: propFilters.quickpollOnly || false,
    };
    
    console.log('[DEBUG Frontend] API 호출 시작...');
    console.log('[DEBUG Frontend] 호출 파라미터:', {
      query: query.trim(),
      filters: filtersToSend,
      page: pageNum,
      limit: pageSize
    });
    
    try {
      const apiCallStart = Date.now();
      const response = await searchApi.searchPanels(query.trim(), filtersToSend, pageNum, pageSize);
      const apiCallDuration = Date.now() - apiCallStart;
      
      console.log('[DEBUG Frontend] API 호출 완료:', {
        duration: `${apiCallDuration}ms`,
        responseKeys: Object.keys(response),
        resultCount: response.results?.length || 0,
        mode: response.mode,
        total: response.total,
        pages: response.pages,
        query: response.query,
        error: response.error,
        fullResponse: response  // 전체 응답 로그
      });
      
      // 에러 확인
      if (response.error) {
        console.error('[DEBUG Frontend] ⚠️ API 응답에 에러가 있습니다:', response.error);
        setError(`검색 오류: ${response.error}`);
      }
      
      const results = response.results || [];
      
      console.log('[DEBUG Frontend] 결과 상세:', {
        resultsLength: results.length,
        total: response.total,
        pages: response.pages,
        mode: response.mode,
        hasError: !!response.error
      });
      
      // 페이지네이션 정보 설정
      const total = response.total || 0;
      const pages = response.pages || 1;
      const currentPageNum = response.page || pageNum;
      
      setPanels(results);
      setTotalResults(total);
      setCurrentPage(currentPageNum);
      setTotalPages(pages);
      
      // Q+W, W only 카운트 (현재 페이지만)
      setQwCount(results.filter((p: Panel) => p.coverage === 'qw').length);
      setWOnlyCount(results.filter((p: Panel) => p.coverage === 'w').length);
      
      // 히스토리 저장 (전체 개수 사용)
      const historyItem = historyManager.createQueryHistory(query.trim(), filtersToSend, total);
      historyManager.save(historyItem);
      
      const totalDuration = Date.now() - searchStartTime;
      console.log('[DEBUG Frontend] ========== 검색 완료 ==========');
      console.log('[DEBUG Frontend] 총 소요 시간:', `${totalDuration}ms`);
      console.log('[DEBUG Frontend] 결과 수:', results.length);
      
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
    } finally {
      setLoading(false);
      console.log('[DEBUG Frontend] 검색 함수 종료 (finally)');
    }
  };

  // 쿼리 또는 필터 변경 시 검색 실행 (첫 페이지로)
  useEffect(() => {
    if (query && query.trim()) {
      setCurrentPage(1);
      searchPanels(1);
    } else {
      setPanels([]);
      setTotalResults(0);
      setCurrentPage(1);
      setTotalPages(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, propFilters]);

  // 검색 결과가 변경될 때 상위 컴포넌트에 전달
  useEffect(() => {
    if (panels.length > 0) {
      onDataChange?.(panels);
    }
  }, [panels, onDataChange]);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (query && query.trim()) {
      searchPanels(page);
    }
  };
  
  // 검색창 돋보기 클릭 핸들러 (재검색)
  const handleSearchClick = () => {
    if (query && query.trim()) {
      // 현재 페이지에서 다시 검색
      searchPanels(currentPage);
    } else {
      // 쿼리가 비어있으면 첫 페이지로 검색
      setCurrentPage(1);
      searchPanels(1);
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

      {/* Summary Bar - Compact 4-Row Layout */}
      {(() => {
        // SummaryData 변환
        const summaryData: SummaryData = {
          total: loading ? 0 : totalResults,
          qCount: loading ? 0 : qwCount,
          wOnlyCount: loading ? 0 : wOnlyCount,
          femaleRate: quickInsightData
            ? quickInsightData.gender_top / 100 // 0~1로 변환
            : undefined,
          avgAge: undefined, // quickInsightData에 age_med 속성이 없음 (추후 추가 가능)
          regionsTop:
            quickInsightData && quickInsightData.top_regions
              ? quickInsightData.top_regions.map((region) => {
                  // 지역 비율 계산 (현재 페이지 기준, 추후 전체 데이터 기준으로 개선 가능)
                  const regionCount = panels.filter(
                    (p: Panel) => (p as any).region === region
                  ).length;
                  const rate =
                    panels.length > 0
                      ? Math.round((regionCount / panels.length) * 100)
                      : 0;
                  return {
                    name: region,
                    count: regionCount,
                    rate,
                  };
                })
              : [],
          tagsTop: quickInsightData?.top_tags || [],
          // latestDate와 medianDate는 현재 데이터가 없음
          // previousTotal도 현재 추적하지 않음
        };

        return (
          <SummaryBar
            data={summaryData}
            onFilterClick={onFilterOpen}
            onExportClick={onExportOpen}
            onPresetClick={() => {
              // 프리셋 메뉴 열기 (추후 구현)
            }}
            onCompareClick={() => {
              // 비교 기능 (추후 구현)
            }}
            filterCount={
              appliedFilters.length > 0 ? appliedFilters.length : 0
            }
          />
        );
      })()}

      {/* 하단: 검색 결과 영역 (전체 너비) */}
      <main style={{ marginTop: '24px', paddingTop: '16px' }}>
          {/* View Switch with Sort Control */}
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

          {/* Results - Cards View */}
          {!loading && !error && viewMode === 'cards' && (
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
                      <PIBadge kind={panel.coverage === 'qw' ? 'coverage-qw' : 'coverage-w'}>
                        {panel.coverage === 'qw' ? 'Q+W' : 'W'}
                      </PIBadge>
                    </div>
                  </div>

                  {/* Meta Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    <PIChip type="tag">{panel.gender}</PIChip>
                    <PIChip type="tag">{panel.age}세</PIChip>
                    <PIChip type="tag">{panel.region}</PIChip>
                  </div>

                  {/* Response Snippets */}
                  {panel.responses && (
                    <div className="pt-2 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
                      <div className="space-y-2">
                        {Object.entries(panel.responses).slice(0, 2).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <Quote className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'var(--brand-blue-300)' }} />
                            <div className="flex-1">
                              <p className="text-xs italic line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
                                {String(value)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PICard>
              ))}
            </div>
          )}

          {/* Results - Table View */}
          {!loading && !error && viewMode === 'table' && (
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
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>이름</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>성별</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>나이</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>지역</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>응답</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold w-12" style={{ color: 'var(--text-tertiary)' }}>북마크</th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                      className="flex items-center gap-1 text-xs font-semibold transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--brand-blue-300)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-tertiary)';
                      }}
                      title="응답일 기준으로 정렬합니다."
                    >
                      응답일
                      {sortOrder === 'desc' ? (
                        <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUp className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>액션</th>
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
                      className="px-4 py-3 text-sm cursor-pointer transition-colors"
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
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{panel.gender}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{panel.age}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{panel.region}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {panel.responses && Object.keys(panel.responses).slice(0, 2).map((key, i) => (
                          <PIChip key={i} type="tag" className="text-xs">
                            {key}
                          </PIChip>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PIBookmarkStar
                        panelId={panel.id}
                        isBookmarked={bookmarkedPanels.has(panel.id)}
                        onToggle={(id) => handleToggleBookmark(id, panel)}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(panel.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLocatePanel?.(panel.id);
                          }}
                          className="p-1.5 rounded-lg transition-colors btn--ghost"
                          style={{ color: 'var(--brand-blue-300)' }}
                          title="지도에서 위치 표시 (L)"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(37, 99, 235, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPanelDetailOpen(panel.id);
                          }}
                          className="p-1.5 rounded-lg transition-colors btn--ghost"
                          style={{ color: 'var(--muted-foreground)' }}
                          title="새 창으로 열기 (W)"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--surface-2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(panel.id).then(() => {
                              toast.success(`${panel.name} ID 복사됨`);
                            }).catch(() => {
                              toast.error('클립보드 복사 실패');
                            });
                          }}
                          className="p-1.5 rounded-lg transition-colors btn--ghost"
                          style={{ color: 'var(--muted-foreground)' }}
                          title="패널 ID 복사"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--surface-2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination - 항상 표시, 내보내기 버튼 위에 고정 배치(문서 흐름 내) */}
          {!loading && !error && (
            <div className="pt-8 flex items-center justify-center">
              <PIPagination
                count={Math.max(1, totalPages)}
                page={currentPage}
                onChange={handlePageChange}
                siblingCount={1}
                boundaryCount={1}
                disabled={loading}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-center pt-6">
            <PIButton
              variant="secondary"
              size="large"
              icon={<Download className="w-5 h-5" />}
              onClick={onExportOpen}
            >
              내보내기
            </PIButton>
          </div>
        </main>
      
      {/* Selection Bar */}
      {selectedPanels.length > 0 && (
        <PISelectionBar
          selectedCount={selectedPanels.length}
          onHighlightAll={() => toast.success('선택한 패널을 지도에 표시합니다')}
          onSendToCompare={() => toast.success('비교 보드로 이동합니다')}
          onExportCSV={() => toast.success('CSV 내보내기 시작')}
          onClear={() => setSelectedPanels([])}
        />
      )}
    </div>
  );
}
