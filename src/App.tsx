import { useState, useEffect, useCallback } from 'react';
import { StartPage } from './components/pages/StartPage';
import { ResultsPage } from './components/pages/ResultsPage';
import { ClusterLabPage } from './components/pages/ClusterLabPage';
import { ComparePage } from './components/pages/ComparePage';
import { FilterDrawer } from './components/drawers/FilterDrawer';
import { ExportDrawer } from './components/drawers/ExportDrawer';
import { PanelDetailDrawer } from './components/drawers/PanelDetailDrawer';
import { PIHistoryDrawer } from './ui/pi/PIHistoryDrawer';
import { HistoryType } from './types/history';
import { Tabs, TabsList, TabsTrigger } from './ui/base/tabs';
import { Search, BarChart3, GitCompare, History } from 'lucide-react';
import { Toaster } from './ui/base/sonner';
import { toast } from 'sonner';
import { DarkModeToggle, useDarkMode } from './lib/DarkModeSystem';
import { useMirrorThemeToPortals } from './lib/useMirrorThemeToPortals';
import { presetManager } from './lib/presetManager';
import { PICommandPalette } from './ui/pi/PICommandPalette';


type AppView = 'start' | 'results';

export default function App() {
  // 다크 모드 포털 테마 동기화
  useMirrorThemeToPortals();
  const { isDark } = useDarkMode();
  
  const [view, setView] = useState<AppView>('start');
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('results');
  const [filters, setFilters] = useState<any>({});
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  
  // 검색 결과 및 클러스터링 결과 캐시 (탭 간 이동 시 재검색 방지)
  const [searchCache, setSearchCache] = useState<{
    key: string;
    results: any[];
    allResults: any[]; // 전체 검색 결과 (UMAP용)
    total: number;
  } | null>(null);
  const [clusteringCache, setClusteringCache] = useState<{
    key: string;
    data: any;
  } | null>(null);
  
  // 검색 키 생성 함수
  const getSearchKey = (q: string, f: any) => {
    return JSON.stringify({ query: q.trim(), filters: f });
  };
  
  // Drawer states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPanelDetailOpen, setIsPanelDetailOpen] = useState(false);
  const [selectedPanelId, setSelectedPanelId] = useState<string>('');
  const [editingPreset, setEditingPreset] = useState<{ id: string; name: string; filters: any } | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  // History navigation
  const handleHistoryNavigate = (type: HistoryType, data: any) => {
    switch (type) {
      case 'query':
        setQuery(data.query);
        setFilters(data.filters || {});
        setView('results');
        setActiveTab('results');
        break;
      case 'panel':
        // 패널 상세 보기
        handlePanelDetailOpen(data.panelId);
        break;
      case 'cluster':
        setView('results');
        setActiveTab('cluster-lab');
        break;
      case 'comparison':
        setView('results');
        setActiveTab('compare');
        break;
    }
  };
  
  const handleSearch = (searchQuery: string, forceRefresh: boolean = false) => {
    const newQuery = searchQuery;
    const newFilters = forceRefresh ? {} : filters;
    const searchKey = getSearchKey(newQuery, newFilters);
    
    // 강제 새로고침이 아니고 캐시가 있으면 캐시 사용
    if (!forceRefresh && searchCache && searchCache.key === searchKey) {
      setSearchResults(searchCache.results);
      setTotalResults(searchCache.total);
      setView('results');
      return;
    }
    
    setQuery(newQuery);
    setView('results');
    // 강제 새로고침 시에만 필터 초기화
    if (forceRefresh) {
      setFilters({});
      setSearchCache(null);
      setClusteringCache(null);
    }
  };

  const handlePresetApply = (preset: any) => {
    // 프리셋 필터 적용
    setFilters(preset.filters);
    toast.success(`프리셋 "${preset.name}"이 적용되었습니다`);
    // 필터 적용 후 검색 실행 (검색페이지와 동일한 로직)
    if (query && query.trim()) {
      handleSearch(query);
    } else {
      // 검색어가 없으면 검색 화면으로 전환 (필터만 적용)
      // 검색 페이지로 이동은 상위 컴포넌트에서 처리
    }
  };

  const handlePanelDetailOpen = (panelId: string) => {
    setSelectedPanelId(panelId);
    setIsPanelDetailOpen(true);
  };
  
  

  // 검색 결과 변경 핸들러 (메모이제이션)
  const handleDataChange = useCallback((data: any[], allResults?: any[]) => {
    setSearchResults(data);
    // 검색 결과 캐시 업데이트
    const searchKey = getSearchKey(query, filters);
    setSearchCache({
      key: searchKey,
      results: data,
      allResults: allResults || data, // 전체 검색 결과 저장 (UMAP용)
      total: totalResults,
    });
  }, [query, filters, totalResults]);
  


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // Cmd/Ctrl + H - toggle history
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        setIsHistoryOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {view === 'start' ? (
        <StartPage
          onSearch={handleSearch}
          onFilterOpen={() => setIsFilterOpen(true)}
          onPresetApply={handlePresetApply}
          currentFilters={filters}
          onPanelDetailOpen={handlePanelDetailOpen}
        />
      ) : (
        <div className="flex flex-col h-screen">
          {/* Top Navigation with Logo */}
          <div className="px-20 py-4" style={{ 
            background: 'var(--background)', 
            borderBottom: '1px solid var(--border)' 
          }}>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setView('start')}
                className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                }}
              >
                <img 
                  src="/panel-insight-icon.svg" 
                  alt="Panel Insight"
                  style={{
                    width: '32px',
                    height: '32px',
                  }}
                />
                <div className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                  Panel Insight
                </div>
              </button>
              
              <div className="flex items-center gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger 
                      value="results" 
                      className="flex items-center gap-2"
                      style={{
                        background: activeTab === 'results' 
                          ? (isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.1)')
                          : 'transparent',
                        color: activeTab === 'results' 
                          ? (isDark ? '#60A5FA' : '#2563EB')
                          : 'var(--text-tertiary)',
                        fontWeight: activeTab === 'results' ? 600 : 500,
                        boxShadow: activeTab === 'results' 
                          ? (isDark ? '0 2px 8px rgba(37, 99, 235, 0.2)' : '0 2px 8px rgba(37, 99, 235, 0.15)')
                          : 'none',
                      }}
                    >
                      <Search className="w-4 h-4" />
                      검색 결과
                    </TabsTrigger>
                    <TabsTrigger 
                      value="cluster" 
                      className="flex items-center gap-2"
                      style={{
                        background: (activeTab === 'cluster' || activeTab === 'cluster-lab')
                          ? (isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.1)')
                          : 'transparent',
                        color: (activeTab === 'cluster' || activeTab === 'cluster-lab')
                          ? (isDark ? '#60A5FA' : '#2563EB')
                          : 'var(--text-tertiary)',
                        fontWeight: (activeTab === 'cluster' || activeTab === 'cluster-lab') ? 600 : 500,
                        boxShadow: (activeTab === 'cluster' || activeTab === 'cluster-lab')
                          ? (isDark ? '0 2px 8px rgba(37, 99, 235, 0.2)' : '0 2px 8px rgba(37, 99, 235, 0.15)')
                          : 'none',
                      }}
                    >
                      <BarChart3 className="w-4 h-4" />
                      군집 분석
                    </TabsTrigger>
                    <TabsTrigger 
                      value="compare" 
                      className="flex items-center gap-2"
                      style={{
                        background: activeTab === 'compare' 
                          ? (isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.1)')
                          : 'transparent',
                        color: activeTab === 'compare' 
                          ? (isDark ? '#60A5FA' : '#2563EB')
                          : 'var(--text-tertiary)',
                        fontWeight: activeTab === 'compare' ? 600 : 500,
                        boxShadow: activeTab === 'compare' 
                          ? (isDark ? '0 2px 8px rgba(37, 99, 235, 0.2)' : '0 2px 8px rgba(37, 99, 235, 0.15)')
                          : 'none',
                      }}
                    >
                      <GitCompare className="w-4 h-4" />
                      비교 분석
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="relative flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--neutral-600)] hover:text-[var(--primary-500)] transition-colors rounded-lg hover:bg-[var(--neutral-100)]"
                  title="최근 본 패널 (Cmd+H)"
                >
                  <History className="w-4 h-4" />
                </button>
                
                <DarkModeToggle variant="icon" size="sm" position="relative" />
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'results' && (
              <ResultsPage
                query={query}
                onFilterOpen={() => setIsFilterOpen(true)}
                onExportOpen={() => setIsExportOpen(true)}
                onPanelDetailOpen={handlePanelDetailOpen}
                filters={filters}
                onQueryChange={setQuery}
                onSearch={handleSearch}
                onDataChange={handleDataChange}
                onFiltersChange={(newFilters) => {
                  setFilters(newFilters);
                  setIsFilterOpen(false);
                }}
                onTotalResultsChange={(total) => {
                  setTotalResults(total);
                  // 검색 결과 캐시 업데이트
                  const searchKey = getSearchKey(query, filters);
                  if (searchCache && searchCache.key === searchKey) {
                    setSearchCache({
                      ...searchCache,
                      total: total,
                    });
                  }
                }}
                onPresetEdit={(preset) => {
                  // 프리셋 편집 시 필터창 열기
                  setEditingPreset({
                    id: preset.id,
                    name: preset.name,
                    filters: preset.filters,
                  });
                  setIsFilterOpen(true);
                }}
              />
            )}
            
            {activeTab === 'cluster' && (
              <ClusterLabPage 
                searchResults={searchCache?.allResults || searchResults} 
                query={query}
                onNavigateToResults={() => setActiveTab('results')}
              />
            )}
            
            {activeTab === 'compare' && <ComparePage />}
          </div>
        </div>
      )}

      {/* Drawers */}
      {isFilterOpen && (
        <FilterDrawer
          isOpen={isFilterOpen}
          onClose={() => {
            setIsFilterOpen(false);
            setEditingPreset(null);
          }}
          onApply={(appliedFilters) => {
            // 필터가 모두 초기화된 경우 (빈 필터) 완전히 제거
            const isEmpty = 
              (!appliedFilters.selectedGenders || appliedFilters.selectedGenders.length === 0) &&
              (!appliedFilters.selectedRegions || appliedFilters.selectedRegions.length === 0) &&
              (!appliedFilters.selectedIncomes || appliedFilters.selectedIncomes.length === 0) &&
              (!appliedFilters.interests || appliedFilters.interests.length === 0) &&
              (!appliedFilters.quickpollOnly || appliedFilters.quickpollOnly === false) &&
              (!appliedFilters.ageRange || (appliedFilters.ageRange[0] === 0 && appliedFilters.ageRange[1] === 120));
            
            if (isEmpty) {
              setFilters({});
            } else {
              setFilters(appliedFilters);
            }
            
            if (view === 'start') {
              setView('results');
            }
            // 필터 적용 시 자동으로 검색 실행 (쿼리가 있으면 쿼리 검색, 없으면 필터만 검색)
            if (query && query.trim()) {
              handleSearch(query);
            } else {
              // 쿼리가 없어도 필터만으로 검색 실행
              handleSearch('');
            }
            setEditingPreset(null);
          }}
          initialFilters={editingPreset && editingPreset.filters ? {
            selectedGenders: editingPreset.filters.gender || [],
            selectedRegions: editingPreset.filters.regions || [],
            selectedIncomes: editingPreset.filters.income || [],
            ageRange: editingPreset.filters.ageRange || [0, 120],
            quickpollOnly: editingPreset.filters.quickpollOnly || false,
            interests: Array.isArray(editingPreset.filters.interests) 
              ? editingPreset.filters.interests 
              : editingPreset.filters.interests 
                ? [editingPreset.filters.interests] 
                : [],
            interestLogic: editingPreset.filters.interestLogic || 'and',
          } : (filters || {})}
          totalResults={totalResults}
          filteredResults={totalResults}
          presetId={editingPreset?.id}
          presetName={editingPreset?.name || ''}
        onPresetUpdate={(presetId, filters, name) => {
          // 프리셋 수정만 (검색 실행하지 않음)
          presetManager.updatePreset(presetId, {
            name,
            filters: {
              gender: filters.selectedGenders || [],
              regions: filters.selectedRegions || [],
              income: filters.selectedIncomes || [],
              ageRange: filters.ageRange || [15, 80],
              quickpollOnly: filters.quickpollOnly || false,
              interests: filters.interests || [],
              interestLogic: filters.interestLogic || 'and',
            },
          });
          // 수정 후 필터창 닫고 편집 상태 해제
          setEditingPreset(null);
          setIsFilterOpen(false);
        }}
        onPresetSave={(filters, name) => {
          // 새 프리셋 저장
          presetManager.addPreset(name, {
            gender: filters.selectedGenders || [],
            regions: filters.selectedRegions || [],
            income: filters.selectedIncomes || [],
            ageRange: filters.ageRange || [15, 80],
            quickpollOnly: filters.quickpollOnly || false,
            interests: filters.interests || [],
            interestLogic: filters.interestLogic || 'and',
          }, '개인');
          
          // 필터도 적용 (사용자가 원하면)
          setFilters(filters);
          if (query) {
            handleSearch(query);
          }
          
          // 프리셋 저장 후 필터창은 그대로 열어둠 (사용자가 계속 필터를 조정할 수 있도록)
          // setIsFilterOpen(false);
          toast.success(`프리셋 "${name}"이 저장되었습니다`);
        }}
      />
      )}

      <PanelDetailDrawer
        isOpen={isPanelDetailOpen}
        onClose={() => {
          setIsPanelDetailOpen(false);
          setSelectedPanelId('');
        }}
        panelId={selectedPanelId}
        searchResults={searchResults}
        query={query}
      />

      <ExportDrawer
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        data={searchResults}
        query={query}
        filters={filters}
      />


      <PIHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onNavigate={handleHistoryNavigate}
      />

      {/* Global Command Palette */}
      <PICommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onFilterOpen={() => {
          setIsFilterOpen(true);
          setIsCommandPaletteOpen(false);
        }}
        onExportOpen={() => {
          setIsExportOpen(true);
          setIsCommandPaletteOpen(false);
        }}
        onClusterLabOpen={() => {
          setView('results');
          setActiveTab('cluster');
          setIsCommandPaletteOpen(false);
        }}
      />

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}
