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
}: ResultsPageProps) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // desc = 최신순, asc = 오래된순
  
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
    console.log('[DEBUG Frontend] API 호출 시작...');
    console.log('[DEBUG Frontend] 호출 파라미터:', {
      query: query.trim(),
      filters: {},
      page: pageNum,
      limit: pageSize
    });
    
    try {
      const apiCallStart = Date.now();
      const response = await searchApi.searchPanels(query.trim(), {}, pageNum, pageSize);
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
      const historyItem = historyManager.createQueryHistory(query.trim(), {}, total);
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

  // 쿼리 변경 시 검색 실행 (첫 페이지로)
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
  }, [query]);

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

  // 분포 데이터 계산 (현재 페이지 패널 기준)
  

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
                  handleSearchClick();
                }
              }}
              trailingIcons={[
                <Filter key="filter" className="w-5 h-5 cursor-pointer" onClick={onFilterOpen} />,
                <Search key="search" className="w-5 h-5 cursor-pointer" onClick={handleSearchClick} />,
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
          {/* Total Results - 12 cols */}
          <div className="col-span-12">
            <PICard variant="summary" className="relative overflow-hidden bg-gradient-to-br from-white via-white to-purple-50/30 h-[240px]">
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
