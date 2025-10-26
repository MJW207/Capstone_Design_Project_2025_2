import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Download, Quote, MapPin, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Copy, Loader2 } from 'lucide-react';
import { PITextField } from '../pi/PITextField';
import { PIButton } from '../pi/PIButton';
import { PIChip } from '../pi/PIChip';
import { PICard } from '../pi/PICard';
import { PIBadge } from '../pi/PIBadge';
import { PISegmentedControl } from '../pi/PISegmentedControl';
import { PIClusterBadge, ClusterType } from '../pi/PIClusterBadge';
import { PISelectionBar } from '../pi/PISelectionBar';
import { PIQuickInsightCard } from '../pi/PIQuickInsightCard';
import { toast } from 'sonner';
import { searchApi } from '../../lib/utils';
import { historyManager } from '../../lib/history';

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
}

const mockPanels = [
  {
    id: 'P****001',
    gender: '여성',
    age: 24,
    region: '서울',
    income: '300~400',
    tags: ['OTT 이용', '스킨케어', '온라인쇼핑', '카페', '요가'],
    coverage: 'qw',
    cluster: 'C1' as ClusterType,
    probability: 0.85,
    snippet: '넷플릭스를 주 3회 이상 시청하며, 피부 관리에 관심이 많음',
    similarity: 0.92,
    lastAnswered: '2025-01-10',
  },
  {
    id: 'P****002',
    gender: '여성',
    age: 27,
    region: '서울',
    income: '400~600',
    tags: ['OTT 이용', '뷰티', '운동', '여행', '맛집탐방'],
    coverage: 'qw',
    cluster: 'C2' as ClusterType,
    probability: 0.78,
    snippet: '디즈니플러스와 넷플릭스를 모두 구독 중',
    similarity: 0.88,
    lastAnswered: '2025-01-15',
  },
  {
    id: 'P****003',
    gender: '여성',
    age: 22,
    region: '경기',
    income: '200~300',
    tags: ['스킨케어', '패션', '인스타그램', 'K-POP'],
    coverage: 'w',
    cluster: 'Noise' as ClusterType,
    probability: 0.42,
    snippet: '스킨케어 루틴에 관심이 높고 새로운 제품 시도를 좋아함',
    similarity: 0.85,
    lastAnswered: null, // W-only, no response
  },
  {
    id: 'P****004',
    gender: '여성',
    age: 29,
    region: '서울',
    income: '400~600',
    tags: ['OTT 이용', '독서', '요가', '명상', '건강식'],
    coverage: 'qw',
    cluster: 'C3' as ClusterType,
    probability: 0.91,
    snippet: '웰빙 라이프스타일을 추구하며 OTT로 다큐멘터리 시청',
    similarity: 0.83,
    lastAnswered: '2025-01-08',
  },
];

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
}: ResultsPageProps) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // desc = 최신순, asc = 오래된순
  
  // API 상태 관리
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [qwCount, setQwCount] = useState(0);
  const [wOnlyCount, setWOnlyCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(20);

  // 검색 실행
  const searchPanels = async (page: number = 1) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await searchApi.searchPanels(query, propFilters, page, pageSize);
      setPanels(response.results);
      setTotalResults(response.total);
      setQwCount(response.qw_count || 0);
      setWOnlyCount(response.w_only_count || 0);
      setCurrentPage(response.page);
      setTotalPages(response.pages || 1);
      
      // 검색 히스토리 저장 (첫 페이지일 때만)
      if (page === 1) {
        const historyItem = historyManager.createQueryHistory(
          query,
          propFilters,
          response.total
        );
        historyManager.save(historyItem);
      }
    } catch (err) {
      setError('검색 중 오류가 발생했습니다.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 검색 실행
  useEffect(() => {
    searchPanels(1);
  }, [query, propFilters]);

  // 검색 결과가 변경될 때 상위 컴포넌트에 전달
  useEffect(() => {
    if (panels.length > 0) {
      onDataChange?.(panels);
    }
  }, [panels, onDataChange]);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    searchPanels(page);
  };

  // 페이지네이션 버튼 생성
  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 이전 페이지 버튼
    if (currentPage > 1) {
      buttons.push(
        <PIButton
          key="prev"
          variant="outline"
          size="small"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={loading}
        >
          이전
        </PIButton>
      );
    }
    
    // 페이지 번호 버튼들
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <PIButton
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="small"
          onClick={() => handlePageChange(i)}
          disabled={loading}
        >
          {i}
        </PIButton>
      );
    }
    
    // 다음 페이지 버튼
    if (currentPage < totalPages) {
      buttons.push(
        <PIButton
          key="next"
          variant="outline"
          size="small"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={loading}
        >
          다음
        </PIButton>
      );
    }
    
    return buttons;
  };

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

  // 퀵 인사이트 상태 관리
  const [quickInsight, setQuickInsight] = useState<any>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // 퀵 인사이트 생성
  const generateQuickInsight = async () => {
    if (!panels.length || !query.trim()) return;
    
    setInsightLoading(true);
    try {
      const response = await searchApi.generateQuickInsight(query, panels, propFilters);
      setQuickInsight(response);
    } catch (err) {
      console.error('Quick insight error:', err);
      toast.error('퀵 인사이트 생성 중 오류가 발생했습니다.');
    } finally {
      setInsightLoading(false);
    }
  };

  // 검색 결과 변경 시 퀵 인사이트 자동 생성
  useEffect(() => {
    if (panels.length > 0 && query.trim()) {
      generateQuickInsight();
    }
  }, [panels, query, propFilters]);

  // Quick Insight 데이터 (API 응답 기반)
  const quickInsightData = useMemo(() => {
    if (quickInsight?.summary) {
      const { summary } = quickInsight;
      return {
        total: summary.total,
        q_cnt: summary.q_cnt,
        q_ratio: summary.total > 0 ? Math.round((summary.q_cnt / summary.total) * 100) : 0,
        w_cnt: summary.w_cnt,
        w_ratio: summary.total > 0 ? Math.round((summary.w_cnt / summary.total) * 100) : 0,
        gender_top: summary.gender_top,
        top_regions: summary.top_regions as [string, string, string],
        top_tags: summary.top_tags as [string, string, string],
        recent_30d: 1823, // 추후 계산
        age_med: summary.age_med,
      };
    }
    
    // 기본값 (API 응답이 없을 때)
    const qwCount = panels.filter(p => p.responses?.q1 && p.responses.q1.trim()).length;
    const wCount = panels.length - qwCount;
    
    return {
      total: totalResults,
      q_cnt: qwCount,
      q_ratio: totalResults > 0 ? Math.round((qwCount / totalResults) * 100) : 0,
      w_cnt: wCount,
      w_ratio: totalResults > 0 ? Math.round((wCount / totalResults) * 100) : 0,
      gender_top: 0,
      top_regions: ['', '', ''] as [string, string, string],
      top_tags: ['', '', ''] as [string, string, string],
      recent_30d: 0,
      age_med: 0,
    };
  }, [quickInsight, panels, totalResults]);

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

  return (
    <div className="min-h-screen bg-[var(--neutral-50)]">
      {/* Fixed Search Bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-[var(--neutral-200)] px-20 py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <PITextField
              placeholder="검색어 수정..."
              value={query}
              onChange={(e) => onQueryChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearch?.(query);
                }
              }}
              trailingIcons={[
                <Filter key="filter" className="w-5 h-5" onClick={onFilterOpen} />,
                <Search key="search" className="w-5 h-5" onClick={() => onSearch?.(query)} />,
              ]}
            />
          </div>
          <PIButton variant="secondary" size="medium" icon={<Filter className="w-4 h-4" />} onClick={onFilterOpen}>
            필터
          </PIButton>
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
      </div>

      <div className="px-20 py-8 space-y-6">
        {/* Summary Strip - Refactored with Quick Insight */}
        <div className="grid grid-cols-12 gap-6">
          {/* Total Results - 4 cols */}
          <div className="col-span-4">
            <PICard variant="summary" className="relative overflow-hidden bg-gradient-to-br from-white via-white to-purple-50/30" style={{ height: '240px' }}>
              {/* Top Gradient Hairline */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#C7B6FF] to-[#A5C8FF]" />
              
              {/* Decorative Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-4 right-4 w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent-blue)] to-[#7C3AED]" />
                <div className="absolute bottom-4 right-8 w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED] to-[var(--accent-blue)]" />
              </div>
              
              <div className="h-full flex flex-col justify-between relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[var(--accent-blue)] flex items-center justify-center shadow-md">
                      <Search className="w-4 h-4 text-white" />
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--neutral-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      총 결과
                    </p>
                  </div>
                  <div className="mt-6">
                    <p 
                      className="font-bold bg-gradient-to-r from-[#7C3AED] to-[var(--accent-blue)] bg-clip-text text-transparent"
                      style={{ fontSize: '64px', lineHeight: '1', letterSpacing: '-0.02em' }}
                    >
                      {loading ? (
                        <Loader2 className="w-16 h-16 animate-spin" />
                      ) : (
                        totalResults.toLocaleString()
                      )}
                    </p>
                    <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--neutral-600)', marginTop: '8px' }}>
                      패널 검색됨
                    </p>
                  </div>
                </div>
                
                {/* Mini Stats */}
                <div className="flex gap-2">
                  <div className="flex-1 px-3 py-2.5 rounded-lg bg-gradient-to-br from-[var(--accent-blue)]/10 to-[var(--accent-blue)]/5 border border-[var(--accent-blue)]/20">
                    <p className="text-xs text-[var(--neutral-600)]">Q+W</p>
                    <p style={{ fontSize: '16px', fontWeight: 700 }} className="text-[var(--accent-blue)]">
                      {loading ? '...' : qwCount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex-1 px-3 py-2.5 rounded-lg bg-gradient-to-br from-[var(--neutral-200)]/30 to-[var(--neutral-100)]/20 border border-[var(--neutral-200)]">
                    <p className="text-xs text-[var(--neutral-600)]">W only</p>
                    <p style={{ fontSize: '16px', fontWeight: 700 }} className="text-[var(--neutral-600)]">
                      {loading ? '...' : wOnlyCount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </PICard>
          </div>

          {/* Quick Insight - 8 cols */}
          <div className="col-span-8">
            <div style={{ height: '240px' }}>
              <PIQuickInsightCard 
                data={quickInsightData} 
                insight={quickInsight?.insight}
                loading={insightLoading}
              />
            </div>
          </div>
        </div>

        {/* View Switch with Sort Control */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">검색 결과</h2>
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
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-lg">검색 중...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <PIButton onClick={searchPanels}>다시 시도</PIButton>
            </div>
          </div>
        )}

        {/* Results - Cards View */}
        {!loading && !error && viewMode === 'cards' && (
          <div className="grid grid-cols-4 gap-4">
            {sortedPanels.map((panel) => (
              <PICard
                key={panel.id}
                variant="panel"
                onClick={() => onPanelDetailOpen(panel.id)}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-[var(--neutral-600)]">{panel.name}</span>
                      <p className="text-xs text-[var(--neutral-600)]">생성일: {new Date(panel.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(panel.id).then(() => {
                            toast.success(`${panel.id} 복사됨`);
                          }).catch(() => {
                            toast.error('클립보드 복사 실패');
                          });
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                        title="패널 ID 복사"
                      >
                        <Copy className="w-4 h-4" style={{ color: '#64748B' }} />
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
                    <div className="pt-2 border-t border-[var(--neutral-200)]">
                      <div className="space-y-2">
                        {Object.entries(panel.responses).slice(0, 2).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <Quote className="w-3 h-3 text-[var(--accent-blue)] flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-[var(--neutral-600)] italic line-clamp-2">
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
          <div className="bg-white rounded-[var(--radius-card)] border border-[var(--neutral-200)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--neutral-50)] border-b border-[var(--neutral-200)]">
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--primary-500)]">이름</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--primary-500)]">성별</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--primary-500)]">나이</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--primary-500)]">지역</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--primary-500)]">응답</th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                      className="flex items-center gap-1 text-xs font-semibold text-[var(--primary-500)] hover:text-[var(--accent-blue)] transition-colors"
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
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--primary-500)]">액션</th>
                </tr>
              </thead>
              <tbody>
                {sortedPanels.map((panel, index) => (
                  <tr
                    key={panel.id}
                    className="border-b border-[var(--neutral-200)] hover:bg-[var(--neutral-50)] transition-all"
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
                      className="px-4 py-3 text-sm cursor-pointer hover:text-[var(--accent-blue)] transition-colors"
                      onClick={() => onPanelDetailOpen(panel.id)}
                    >
                      {panel.name}
                    </td>
                    <td className="px-4 py-3 text-sm">{panel.gender}</td>
                    <td className="px-4 py-3 text-sm">{panel.age}</td>
                    <td className="px-4 py-3 text-sm">{panel.region}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {panel.responses && Object.keys(panel.responses).slice(0, 2).map((key, i) => (
                          <PIChip key={i} type="tag" className="text-xs">
                            {key}
                          </PIChip>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(panel.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLocatePanel?.(panel.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          title="지도에서 위치 표시 (L)"
                        >
                          <MapPin className="w-4 h-4" style={{ color: '#2563EB' }} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPanelDetailOpen(panel.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                          title="새 창으로 열기 (W)"
                        >
                          <ExternalLink className="w-4 h-4" style={{ color: '#64748B' }} />
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
                          className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                          title="패널 ID 복사"
                        >
                          <Copy className="w-4 h-4" style={{ color: '#64748B' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between pt-6">
            <div className="text-sm text-[var(--neutral-600)]">
              {totalResults > 0 ? (
                <>
                  {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalResults)} / {totalResults.toLocaleString()}개 결과
                </>
              ) : (
                '검색 결과가 없습니다'
              )}
            </div>
            <div className="flex items-center gap-2">
              {renderPaginationButtons()}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center pt-8">
          <PIButton
            variant="secondary"
            size="large"
            icon={<Download className="w-5 h-5" />}
            onClick={onExportOpen}
          >
            내보내기
          </PIButton>
        </div>
      </div>
      
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
