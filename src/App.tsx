import { useState, useEffect } from 'react';
import { StartPage } from './components/pages/StartPage';
import { ResultsPage } from './components/pages/ResultsPage';
import { ClusterLabPage } from './components/pages/ClusterLabPage';
import { ComparePage } from './components/pages/ComparePage';
import { FilterDrawer } from './components/drawers/FilterDrawer';
import { ExportDrawer } from './components/drawers/ExportDrawer';
import { PIPanelWindow } from './components/pi/PIPanelWindow';
import { PIHistoryDrawer } from './components/pi/PIHistoryDrawer';
import { HistoryType } from './types/history';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Search, BarChart3, GitCompare, History } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

type AppView = 'start' | 'results';

// Panel window instance
interface PanelWindow {
  id: string;
  panelData: PanelData;
  position: { x: number; y: number };
}

// Mock panel data type
interface PanelData {
  id: string;
  coverage: 'Q+W' | 'W only';
  cluster?: string;
  gender: string;
  age: number;
  region: string;
  income: string;
  tags: string[];
  isPinned?: boolean;
}

export default function App() {
  const [view, setView] = useState<AppView>('start');
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('results');
  const [filters, setFilters] = useState<any>({});
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Drawer states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
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
  
  // Panel windows states (multiple windows)
  const [panelWindows, setPanelWindows] = useState<PanelWindow[]>([]);
  const [focusedWindowId, setFocusedWindowId] = useState<string | null>(null);
  
  // Recent panels history (max 50)
  
  // Located panel for UMAP highlight
  const [locatedPanelId, setLocatedPanelId] = useState<string | null>(null);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setView('results');
  };

  const handlePresetApply = (preset: any) => {
    setFilters(preset.filters);
    toast.success(`프리셋 "${preset.name}"이 적용되었습니다`);
    // 필터가 적용되면 자동으로 검색 실행
    if (query) {
      handleSearch(query);
    } else {
      // 검색어가 없으면 필터 드로어를 열어서 확인할 수 있게 함
      setIsFilterOpen(true);
    }
  };

  const handlePanelDetailOpen = (panelId: string) => {
    // Mock panel data - in real app, fetch from API
    const mockPanel: PanelData = {
      id: panelId,
      coverage: Math.random() > 0.5 ? 'Q+W' : 'W only',
      cluster: `C${Math.floor(Math.random() * 5) + 1}`,
      gender: Math.random() > 0.5 ? '여성' : '남성',
      age: Math.floor(Math.random() * 40) + 20,
      region: '서울',
      income: '300~400만원',
      tags: ['스킨케어', 'OTT', '여행', '피트니스', '뷰티', '건강'],
      isPinned: false,
    };
    
    
    // Calculate position with offset for multiple windows
    const offset = panelWindows.length * 40;
    const centerX = (typeof window !== 'undefined' ? window.innerWidth : 1200) / 2 - 360; // 360 = half of M size width
    const centerY = (typeof window !== 'undefined' ? window.innerHeight : 800) / 2 - 320; // 320 = half of M size height
    
    const newWindow: PanelWindow = {
      id: `window-${Date.now()}`,
      panelData: mockPanel,
      position: {
        x: Math.min(centerX + offset, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 720),
        y: Math.min(centerY + offset, (typeof window !== 'undefined' ? window.innerHeight : 800) - 640),
      },
    };
    
    setPanelWindows([...panelWindows, newWindow]);
    setFocusedWindowId(newWindow.id);
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
  

  const handleCloseWindow = (windowId: string) => {
    setPanelWindows(panelWindows.filter(w => w.id !== windowId));
    if (focusedWindowId === windowId) {
      setFocusedWindowId(panelWindows[panelWindows.length - 1]?.id || null);
    }
  };

  const handleDuplicateWindow = (windowId: string) => {
    const window = panelWindows.find(w => w.id === windowId);
    if (!window) return;
    
    const offset = 40;
    const newWindow: PanelWindow = {
      id: `window-${Date.now()}`,
      panelData: { ...window.panelData },
      position: {
        x: Math.min(window.position.x + offset, 1200 - 720),
        y: Math.min(window.position.y + offset, 800 - 640),
      },
    };
    
    setPanelWindows([...panelWindows, newWindow]);
    setFocusedWindowId(newWindow.id);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC - close focused window
      if (e.key === 'Escape' && focusedWindowId) {
        handleCloseWindow(focusedWindowId);
      }
      
      // Cmd/Ctrl + H - toggle history
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        setIsHistoryOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedWindowId, panelWindows]);

  return (
    <div className="min-h-screen bg-background">
      {view === 'start' ? (
        <StartPage
          onSearch={handleSearch}
          onFilterOpen={() => setIsFilterOpen(true)}
          onPresetApply={handlePresetApply}
          currentFilters={filters}
        />
      ) : (
        <div className="flex flex-col h-screen">
          {/* Top Navigation with Logo */}
          <div className="bg-white border-b border-[var(--neutral-200)] px-20 py-4">
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
              />
            )}
            
            {activeTab === 'cluster' && <ClusterLabPage locatedPanelId={locatedPanelId} />}
            
            {activeTab === 'compare' && <ComparePage />}
          </div>
        </div>
      )}

      {/* Drawers */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
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
        }}
        initialFilters={filters}
      />

      {/* Panel Windows (Multiple, Draggable) */}
      {panelWindows.map((window) => (
        <PIPanelWindow
          key={window.id}
          panelData={window.panelData}
          size="M"
          initialPosition={window.position}
          isFocused={focusedWindowId === window.id}
          onFocus={() => setFocusedWindowId(window.id)}
          onClose={() => handleCloseWindow(window.id)}
          onDuplicate={() => handleDuplicateWindow(window.id)}
        />
      ))}

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
