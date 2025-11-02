import { useState, useEffect } from 'react';
import { StartPage } from './components/pages/StartPage';
import { ResultsPage } from './components/pages/ResultsPage';
import { ClusterLabPage } from './components/pages/ClusterLabPage';
import { ComparePage } from './components/pages/ComparePage';
import { FilterDrawer } from './components/drawers/FilterDrawer';
import { ExportDrawer } from './components/drawers/ExportDrawer';
import { PanelDetailDrawer } from './components/drawers/PanelDetailDrawer';
import { PIHistoryDrawer } from './components/pi/PIHistoryDrawer';
import { HistoryType } from './types/history';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Search, BarChart3, GitCompare, History } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { DarkModeToggle } from './lib/DarkModeSystem';
import { useMirrorThemeToPortals } from './lib/useMirrorThemeToPortals';
import { presetManager } from './lib/presetManager';


type AppView = 'start' | 'results';

export default function App() {
  // 다크 모드 포털 테마 동기화
  useMirrorThemeToPortals();
  
  const [view, setView] = useState<AppView>('start');
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('results');
  const [filters, setFilters] = useState<any>({});
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  
  // Drawer states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPanelDetailOpen, setIsPanelDetailOpen] = useState(false);
  const [selectedPanelId, setSelectedPanelId] = useState<string>('');
  const [editingPreset, setEditingPreset] = useState<{ id: string; name: string; filters: any } | null>(null);
  
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
  
  // Located panel for UMAP highlight
  const [locatedPanelId, setLocatedPanelId] = useState<string | null>(null);

  const handleSearch = (searchQuery: string) => {
    console.log('[App] handleSearch called with query:', searchQuery);
    setQuery(searchQuery);
    setView('results');
    // 검색 시 필터 자동 초기화
    setFilters({});
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
  
  
  const handleLocatePanel = (panelId: string) => {
    setLocatedPanelId(panelId);
    setActiveTab('cluster');
    
    // Scroll to UMAP chart after tab switch
    setTimeout(() => {
      const umapElement = document.querySelector('[data-umap-chart]');
      if (umapElement) {
        umapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast.success(`지도에서 ${panelId} 위치를 표시했어요`);
    }, 200);
    
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setLocatedPanelId(null);
    }, 3000);
  };
  


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
                className="text-xl font-bold hover:text-[var(--accent-blue)] transition-colors"
              >
                Panel Insight
              </button>
              
              <div className="flex items-center gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="results" className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      검색 결과
                    </TabsTrigger>
                    <TabsTrigger value="cluster" className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      군집 분석
                    </TabsTrigger>
                    <TabsTrigger value="compare" className="flex items-center gap-2">
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
                onLocatePanel={handleLocatePanel}
                filters={filters}
                onQueryChange={setQuery}
                onSearch={handleSearch}
                onDataChange={setSearchResults}
                onFiltersChange={(newFilters) => {
                  setFilters(newFilters);
                  setIsFilterOpen(false);
                }}
                onTotalResultsChange={setTotalResults}
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
            
            {activeTab === 'cluster' && <ClusterLabPage locatedPanelId={locatedPanelId} searchResults={searchResults} query={query} />}
            
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
            console.log('Applied filters:', appliedFilters);
            setFilters(appliedFilters);
            if (view === 'start') {
              setView('results');
            }
            // 필터 적용 시 자동으로 검색 실행
            if (query) {
              handleSearch(query);
            }
            setEditingPreset(null);
          }}
          initialFilters={editingPreset && editingPreset.filters ? {
            selectedGenders: editingPreset.filters.gender || [],
            selectedRegions: editingPreset.filters.regions || [],
            selectedIncomes: editingPreset.filters.income || [],
            ageRange: editingPreset.filters.ageRange || [15, 80],
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

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}
