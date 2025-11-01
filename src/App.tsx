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

// 패널별 고유 응답 이력 (UI 데모용)
const PANEL_RESPONSE_HISTORY: Record<string, Array<{ title: string; answer: string; date: string }>> = {
  'P****001': [
    { title: '주요 특성 요약', answer: '충남 거주 21세 남성, 3인 가구, 생산/노무직(건설·건축·토목·환경)', date: '2025.01.10' },
    { title: '소득/가구', answer: '개인 100~199만원, 가구 400~499만원', date: '2025.01.08' },
    { title: '자산·디바이스', answer: '현대 아반떼, 아이폰 SE, 냉장고/김치냉장고/세탁기/에어컨/제습기/일반청소기/비데/건조기/전기레인지/에어프라이기/노트북/태블릿/무선이어폰/스마트워치/스피커 보유', date: '2025.01.06' },
    { title: '음주/흡연', answer: '흡연 경험 없음, 음용: 소주/맥주', date: '2025.01.04' },
    { title: '환경 습관', answer: '일회용 비닐봉투 절약 노력 없음', date: '2025.01.02' },
  ],
  'P****002': [
    { title: '직업/학력', answer: '충남 28세 여성, 사무직(경영·인사·총무), 대졸 1인 가구', date: '2025.01.15' },
    { title: '소득', answer: '개인 200~299만원, 가구 200~299만원', date: '2025.01.14' },
    { title: '소비/스트레스', answer: '스트레스 해소는 음식 섭취, 맛있는 음식 소비 선호, 배달 선호', date: '2025.01.13' },
    { title: '도구/앱', answer: 'ChatGPT 업무 보조, 메신저 앱 최다 사용, 동남아 여행 계획', date: '2025.01.12' },
    { title: '배송/중고', answer: '패션·뷰티 구매 시 빠른 배송, 버리기 아까운 물건은 중고 판매', date: '2025.01.11' },
    { title: '기상 습관', answer: '여러 개 알람을 짧게 설정', date: '2025.01.10' },
    { title: '운동/뷰티', answer: '유산소 운동, 스킨케어 월 3~5만원, 리뷰/후기 중시', date: '2025.01.09' },
    { title: '성향/여행', answer: '맥시멀리스트, 큰 틀 후 현지 세부 결정', date: '2025.01.08' },
    { title: '음주/흡연', answer: '음용: 소주/맥주/막걸리/양주/와인/사케, 흡연: 일반·궐련형 전자담배 경험(레종/에쎄/더원/아이스볼트 GT/말보로/팔리아멘트/아이코스)', date: '2025.01.07' },
  ],
  'P****003': [
    { title: '직업/소득', answer: '충남 24세 여성, 사무직(경영·인사·총무), 개인/가구 200~299만원', date: '2025.01.06' },
    { title: '자산/디바이스', answer: '아이폰 14 Pro, 냉장고/세탁기/에어컨/전기레인지/노트북/무선이어폰/스마트워치 보유', date: '2025.01.05' },
    { title: '건강/음주', answer: '흡연 無, 최근 1년 금주', date: '2025.01.04' },
    { title: '취향', answer: '물놀이 비선호, 1인 가구 사무직 라이프스타일', date: '2025.01.03' },
  ],
  'P****004': [
    { title: '직업/소득', answer: '충남 29세 남성, 경영/관리직(무역·영업·판매·매장관리), 개인 300~399 / 가구 500~599만원', date: '2025.01.09' },
    { title: '자산/디바이스', answer: '지프 패트리어트, 아이폰 11, 세탁기 보유', date: '2025.01.08' },
    { title: '취향', answer: '여름철 최애 간식: 아이스크림', date: '2025.01.07' },
    { title: '음주', answer: '막걸리/탁주 경험', date: '2025.01.06' },
  ],
};

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
      // 고유 응답 이력 주입
      responses: PANEL_RESPONSE_HISTORY[panelId] || [
        { title: '최근 활동', answer: 'OTT 시청과 가벼운 운동을 주 3회 이상 수행', date: '2025.01.09' },
        { title: '소비 성향', answer: '필요 시 빠른 배송 옵션을 선호', date: '2024.12.29' },
        { title: '기기 사용', answer: '스마트폰·노트북 중심의 멀티 디바이스 사용', date: '2024.12.18' },
      ],
      // 패널별 요약 (하드코딩)
      aiSummary: (
        panelId === 'P****001' ? '충남 거주 기반의 합리적 소비 성향. 이동 편의·디바이스 활용도 높음.' :
        panelId === 'P****002' ? '업무 스트레스 해소를 위해 맛·편의를 중시. 배달·빠른 배송 선호.' :
        panelId === 'P****003' ? '뷰티·리뷰 중심 탐색이 강하고 신제품 수용도가 높음.' :
        panelId === 'P****004' ? '건강관리 루틴 확립. 여행·콘텐츠 소비에서 자기주도성이 강함.' :
        '콘텐츠 소비와 일상 관리의 균형형 패턴. 편의성에 우호적.'
      ),
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
            
            {activeTab === 'cluster' && <ClusterLabPage locatedPanelId={locatedPanelId} searchResults={searchResults} query={query} />}
            
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
