import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Loader2, User, MapPin, Calendar, DollarSign, Briefcase, 
  GraduationCap, Home, Car, Smartphone, Heart, Users, 
  MessageSquare, Tag, Sparkles, FileText, CheckCircle2 
} from 'lucide-react';
import { PIBadge } from '../../ui/pi/PIBadge';
import { PIChip } from '../../ui/pi/PIChip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/base/tabs';
import { searchApi } from '../../lib/utils';
import { historyManager } from '../../lib/history';

interface PanelDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  panelId: string;
}

interface PanelResponse {
  key: string;
  title: string;
  question?: string;  // qpoll 질문
  answer: string;
  date?: string;
  index?: string | number;  // 커버리지 표시용
  is_quick_answer?: boolean;
  [key: string]: any;  // 추가 속성 허용
}

interface PanelEvidence {
  text: string;
  source: string;
  similarity?: number | null;
}

interface PanelData {
  id: string;
  name: string;
  gender: string;
  age: number;
  region: string;
  income: string;
  coverage?: 'qw' | 'w' | 'qw1' | 'qw2' | 'q' | 'w1' | 'w2';
  tags: string[];
  responses: PanelResponse[];
  evidence: PanelEvidence[];
  aiSummary: string;
  created_at: string;
  welcome1_info?: {
    gender?: string;
    age?: number | string;
    region?: string;
    detail_location?: string;
    age_group?: string;
    marriage?: string;
    children?: number;
    family?: string;
    education?: string;
  };
  welcome2_info?: {
    job?: string;
    job_role?: string;
    personal_income?: string;
    household_income?: string;
  };
  responses_by_topic?: {
    [key: string]: Array<{
      key: string;
      title: string;
      question?: string;
      answer: string;
      date?: string;
      index?: string | number;
      is_quick_answer?: boolean;
    }>;
  };
  metadata?: {
    결혼여부?: string;
    자녀수?: number;
    가족수?: string;
    최종학력?: string;
    직업?: string;
    직무?: string;
    "월평균 개인소득"?: string;
    "월평균 가구소득"?: string;
    보유전제품?: string[];
    "보유 휴대폰 단말기 브랜드"?: string;
    "보유 휴대폰 모델명"?: string;
    보유차량여부?: string;
    "자동차 제조사"?: string;
    "자동차 모델"?: string;
    자동차제조사?: string;
    자동차모델?: string;
    흡연경험?: string[];
    "흡연경험 담배브랜드"?: string[] | string;
    "궐련형 전자담배/가열식 전자담배 이용경험"?: string[] | string;
    "음용경험 술"?: string[];
    [key: string]: any;
  };
}

export function PanelDetailDrawer({ isOpen, onClose, panelId }: PanelDetailDrawerProps) {
  const [panel, setPanel] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 리사이즈 및 드래그 상태
  const [size, setSize] = useState({ width: 520, height: window.innerHeight });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');
  const drawerRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  // 초기 크기 및 위치를 중앙 모달로 설정 (4:3 비율)
  useEffect(() => {
    if (isOpen) {
      // 4:3 비율로 계산 (더 큰 기본 사이즈)
      const baseWidth = Math.min(1200, Math.floor(window.innerWidth * 0.85));
      const baseHeight = Math.floor(baseWidth * 0.75); // 4:3 비율
      const maxHeight = Math.floor(window.innerHeight * 0.9);
      
      setSize({
        width: baseWidth,
        height: Math.min(baseHeight, maxHeight),
      });
      setPosition({ x: 0, y: 0 }); // 중앙 정렬이므로 x, y는 0
    }
  }, [isOpen]);

  // 리사이즈 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    if (drawerRef.current) {
      const rect = drawerRef.current.getBoundingClientRect();
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      };
    }
  }, []);

  // 드래그 핸들러
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // 리사이즈 핸들 클릭 시 드래그 방지
    if ((e.target as HTMLElement).closest('[class*="resize"]') || 
        (e.target as HTMLElement).closest('[data-resize-handle]')) {
      return;
    }
    
    // 헤더 영역에서만 드래그 가능
    if (!(e.target as HTMLElement).closest('.panel-detail-header')) {
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    if (drawerRef.current) {
      const rect = drawerRef.current.getBoundingClientRect();
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      };
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 리사이즈 처리
      if (isResizing && resizeStartRef.current) {
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;
        
        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;
        
        const maxWidth = window.innerWidth * 0.95;
        const minWidth = 400;
        const maxHeight = window.innerHeight * 0.95;
        const minHeight = 500;
        
        if (resizeDirection.includes('right')) {
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.width + deltaX));
        }
        if (resizeDirection.includes('left')) {
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.width - deltaX));
        }
        if (resizeDirection.includes('bottom')) {
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartRef.current.height + deltaY));
        }
        if (resizeDirection.includes('top')) {
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartRef.current.height - deltaY));
        }
        
        if (resizeDirection.includes('right-bottom')) {
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.width + deltaX));
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartRef.current.height + deltaY));
        }
        
        setSize({ width: newWidth, height: newHeight });
      }
      
      // 드래그 처리
      if (isDragging && dragStartRef.current && drawerRef.current) {
        const rect = drawerRef.current.getBoundingClientRect();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // 중앙 기준으로 위치 계산
        const newX = e.clientX - centerX - (dragStartRef.current.offsetX - rect.width / 2);
        const newY = e.clientY - centerY - (dragStartRef.current.offsetY - rect.height / 2);
        
        // 화면 밖으로 나가지 않도록 제한
        const maxX = (window.innerWidth - rect.width) / 2;
        const maxY = (window.innerHeight - rect.height) / 2;
        
        setPosition({
          x: Math.max(-maxX, Math.min(maxX, newX)),
          y: Math.max(-maxY, Math.min(maxY, newY)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setIsDragging(false);
      setResizeDirection('');
      resizeStartRef.current = null;
      dragStartRef.current = null;
    };

    if (isResizing || isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, isDragging, resizeDirection]);

  // 패널 데이터 로드
  useEffect(() => {
    if (isOpen && panelId) {
      loadPanel();
    }
  }, [isOpen, panelId]);

  const loadPanel = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // API에서 패널 데이터 로드
      const panelData = await searchApi.getPanel(panelId);
      
      // 데이터 검증 및 기본값 설정
      const processedData: PanelData = {
        id: panelData.id || panelData.mb_sn || panelId,
        name: panelData.name || panelData.mb_sn || panelId,
        gender: panelData.gender || panelData.welcome1_info?.gender || '',
        age: panelData.age || panelData.welcome1_info?.age || 0,
        region: panelData.region || panelData.welcome1_info?.region || '',
        income: panelData.income || panelData.welcome2_info?.personal_income || panelData.welcome2_info?.household_income || '',
        coverage: panelData.coverage,
        tags: panelData.tags || [],
        responses: panelData.responses || [],
        evidence: panelData.evidence || [],
        aiSummary: panelData.aiSummary || '',
        created_at: panelData.created_at || new Date().toISOString(),
        welcome1_info: panelData.welcome1_info,
        welcome2_info: panelData.welcome2_info,
        responses_by_topic: panelData.responses_by_topic,
        metadata: panelData.metadata || {},
      };
      
      console.log('[PanelDetailDrawer] 로드된 패널 데이터:', {
        id: processedData.id,
        name: processedData.name,
        gender: processedData.gender,
        age: processedData.age,
        region: processedData.region,
        hasWelcome1: !!processedData.welcome1_info,
        hasWelcome2: !!processedData.welcome2_info,
        metadataKeys: Object.keys(processedData.metadata || {}),
      });
      
      setPanel(processedData);
      
      // AI 요약 로드 (비동기로 별도 호출)
      if (!processedData.aiSummary) {
        try {
          const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8004';
          const aiSummaryResponse = await fetch(`${apiBaseUrl}/api/panels/${panelId}/ai-summary`);
          if (aiSummaryResponse.ok) {
            const aiData = await aiSummaryResponse.json();
            if (aiData.aiSummary) {
              setPanel(prev => prev ? { ...prev, aiSummary: aiData.aiSummary } : prev);
            }
          }
        } catch (aiErr) {
          console.warn('AI 요약 로드 실패:', aiErr);
          // AI 요약 실패는 무시 (필수 기능 아님)
        }
      }
      
      // 패널 상세정보 히스토리 저장
      const panelName = processedData.name || processedData.id || panelId;
      const historyItem = historyManager.createPanelHistory(panelId, panelName, processedData);
      historyManager.save(historyItem);
    } catch (err: any) {
      setError(err.message || '패널 정보를 불러오는데 실패했습니다.');
      console.error('Panel load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Loading State
  if (loading) {
    return (
      <>
        <div 
          className="fixed inset-0 z-40 modal-backdrop"
          onClick={onClose}
        />
        <div 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 drawer-content z-50 flex items-center justify-center rounded-2xl"
          style={{
            width: `${size.width}px`,
            height: `${size.height}px`,
            background: 'var(--surface-1)',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-3)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand-blue-300)' }} />
            <span>패널 정보 로딩 중...</span>
          </div>
        </div>
      </>
    );
  }

  // Error State
  if (error || !panel) {
    return (
      <>
        <div 
          className="fixed inset-0 z-40 modal-backdrop"
          onClick={onClose}
        />
        <div 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 drawer-content z-50 flex items-center justify-center rounded-2xl"
          style={{
            width: `${size.width}px`,
            height: `${size.height}px`,
            background: 'var(--surface-1)',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-3)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
            <p style={{ color: 'var(--error-500)', marginBottom: '16px' }}>
              {error || '패널을 찾을 수 없습니다.'}
            </p>
            <button 
              onClick={onClose}
              className="btn"
            >
              닫기
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 modal-backdrop"
        onClick={onClose}
      />

      {/* Modal - 중앙에 위치, 드래그 가능 */}
      <div 
        ref={drawerRef}
        className="fixed drawer-content z-50 flex flex-col rounded-2xl overflow-hidden"
        style={{
          left: `calc(50% + ${position.x}px)`,
          top: `calc(50% + ${position.y}px)`,
          transform: 'translate(-50%, -50%)',
          width: `${size.width}px`,
          height: `${size.height}px`,
          minWidth: '600px',
          minHeight: '500px',
          maxWidth: '95vw',
          maxHeight: '95vh',
          background: 'var(--surface-1)',
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-3)',
          border: '1px solid var(--border-primary)',
          cursor: isResizing ? (resizeDirection.includes('right') ? 'ew-resize' : resizeDirection.includes('left') ? 'ew-resize' : resizeDirection.includes('bottom') ? 'ns-resize' : resizeDirection.includes('top') ? 'ns-resize' : 'nwse-resize') : isDragging ? 'move' : 'default',
          transition: isResizing || isDragging ? 'none' : 'all 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 리사이즈 핸들들 - 모서리 및 가장자리 */}
        {/* 오른쪽 */}
        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-20 transition-colors group"
          data-resize-handle="true"
          onMouseDown={(e) => handleMouseDown(e, 'right')}
          style={{
            backgroundColor: isResizing && resizeDirection.includes('right') ? 'rgba(37, 99, 235, 0.4)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        />
        {/* 하단 */}
        <div
          className="absolute left-0 right-0 bottom-0 h-3 cursor-ns-resize z-20 transition-colors group"
          data-resize-handle="true"
          onMouseDown={(e) => handleMouseDown(e, 'bottom')}
          style={{
            backgroundColor: isResizing && resizeDirection.includes('bottom') ? 'rgba(37, 99, 235, 0.4)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        />
        {/* 오른쪽 하단 모서리 */}
        <div
          className="absolute right-0 bottom-0 w-8 h-8 cursor-nwse-resize z-30 transition-colors rounded-tl-lg"
          data-resize-handle="true"
          onMouseDown={(e) => handleMouseDown(e, 'right-bottom')}
          style={{
            backgroundColor: isResizing && resizeDirection.includes('right-bottom') ? 'rgba(37, 99, 235, 0.5)' : 'transparent',
            backgroundImage: !isResizing ? 'linear-gradient(135deg, transparent 0%, transparent 40%, rgba(37, 99, 235, 0.3) 50%, transparent 60%, transparent 100%)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {/* 모서리 리사이즈 인디케이터 */}
          {!isResizing && (
            <div className="absolute right-1 bottom-1 w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-blue-500 opacity-50" />
          )}
        </div>
        {/* 시각적 리사이즈 인디케이터 */}
        {isResizing && (
          <div className="absolute right-2 bottom-2 z-40 px-2 py-1 rounded text-xs font-mono" style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            pointerEvents: 'none'
          }}>
            {size.width} × {size.height}
          </div>
        )}
        {/* Header - 드래그 가능 */}
        <div 
          className="drawer-header panel-detail-header relative px-6 py-5 border-b"
          style={{
            borderColor: 'var(--border-primary)',
            cursor: isDragging ? 'move' : 'default',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
          }}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="p-2 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                    color: 'white',
                  }}
                >
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h2 
                    className="text-lg font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {panel.name || panel.id}
                  </h2>
                  <p 
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    ID: {panel.id}
                  </p>
                </div>
                {panel.coverage && (
                  <PIBadge kind={panel.coverage === 'qw' ? 'coverage-qw' : 
                                panel.coverage === 'w' ? 'coverage-w' :
                                panel.coverage === 'q' ? 'coverage-q' : 'coverage-qw'}>
                    {panel.coverage === 'qw' ? 'W1+W2+Q' : 
                     panel.coverage === 'qw1' ? 'W1+Q' :
                     panel.coverage === 'qw2' ? 'W2+Q' :
                     panel.coverage === 'q' ? 'Q' :
                     panel.coverage === 'w' ? 'W1+W2' :
                     panel.coverage === 'w1' ? 'W1' :
                     panel.coverage === 'w2' ? 'W2' :
                     String(panel.coverage).toUpperCase()}
                  </PIBadge>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn--ghost p-2 rounded-lg transition-fast hover:bg-red-50 dark:hover:bg-red-900/20"
              style={{
                color: 'var(--muted-foreground)',
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList 
            className="w-full justify-start px-6 border-b"
            style={{
              borderColor: 'var(--border-primary)',
              background: 'transparent',
            }}
          >
            <TabsTrigger 
              value="overview"
              className="flex items-center gap-2"
              style={{
                color: 'var(--text-tertiary)',
              }}
            >
              <FileText className="w-4 h-4" />
              개요
            </TabsTrigger>
            <TabsTrigger 
              value="responses"
              className="flex items-center gap-2"
              style={{
                color: 'var(--text-tertiary)',
              }}
            >
              <MessageSquare className="w-4 h-4" />
              응답이력
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent 
            value="overview" 
            className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
            style={{ height: 'calc(100% - 120px)', overflowY: 'auto' }}
          >
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="p-1.5 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
                    color: '#3B82F6',
                  }}
                >
                  <User className="w-4 h-4" />
                </div>
                <h3 
                  className="font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  기본 정보
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {(panel.gender || panel.welcome1_info?.gender) && (
                  <PIChip type="tag" className="flex items-center gap-1.5 px-3 py-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">{panel.gender || panel.welcome1_info?.gender}</span>
                  </PIChip>
                )}
                {((panel.age && panel.age > 0) || panel.welcome1_info?.age) && (
                  <PIChip type="tag" className="flex items-center gap-1.5 px-3 py-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">
                      {panel.age || panel.welcome1_info?.age}
                      {typeof (panel.age || panel.welcome1_info?.age) === 'number' ? '세' : ''}
                    </span>
                  </PIChip>
                )}
                {(panel.region || panel.welcome1_info?.region) && (
                  <PIChip type="tag" className="flex items-center gap-1.5 px-3 py-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">
                      {panel.region || panel.welcome1_info?.region}
                      {panel.welcome1_info?.detail_location && ` ${panel.welcome1_info.detail_location}`}
                    </span>
                  </PIChip>
                )}
                {(panel.income || panel.metadata?.["월평균 개인소득"] || panel.metadata?.["월평균 가구소득"] || panel.welcome2_info?.personal_income || panel.welcome2_info?.household_income) && (
                  <PIChip type="tag" className="flex items-center gap-1.5 px-3 py-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">
                      {panel.metadata?.["월평균 개인소득"] || panel.metadata?.["월평균 가구소득"] || panel.welcome2_info?.personal_income || panel.welcome2_info?.household_income || panel.income}
                    </span>
                  </PIChip>
                )}
                {panel.created_at && (
                  <PIChip type="tag" className="flex items-center gap-1.5 px-3 py-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">{new Date(panel.created_at).toLocaleDateString('ko-KR')}</span>
                  </PIChip>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div 
                className="p-4 rounded-xl relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(37, 99, 235, 0.12))',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div 
                    className="p-2 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                      color: 'white',
                    }}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </div>
                </div>
                <div 
                  className="text-xs mb-1 font-medium"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  응답 수
                </div>
                <div 
                  className="text-2xl font-bold"
                  style={{ color: '#3B82F6' }}
                >
                  {(panel.responses_by_topic ? Object.values(panel.responses_by_topic).reduce((acc, arr) => acc + arr.length, 0) : 0) || 
                   (panel.responses?.length || 0)}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>개</div>
              </div>
              <div 
                className="p-4 rounded-xl relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(124, 58, 237, 0.12))',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div 
                    className="p-2 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                      color: 'white',
                    }}
                  >
                    <Tag className="w-4 h-4" />
                  </div>
                </div>
                <div 
                  className="text-xs mb-1 font-medium"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  태그 수
                </div>
                <div 
                  className="text-2xl font-bold"
                  style={{ color: '#8B5CF6' }}
                >
                  {panel.tags?.length || 0}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>개</div>
              </div>
            </div>

            {/* Welcome1 정보 */}
            {panel.welcome1_info && Object.keys(panel.welcome1_info).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="p-2 rounded-xl shadow-sm"
                    style={{
                      background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                      color: 'white',
                    }}
                  >
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 
                      className="text-lg font-bold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Welcome 1차 정보
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      기본 인구통계 정보
                    </p>
                  </div>
                </div>
                <div 
                  className="p-6 rounded-2xl space-y-4 shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(37, 99, 235, 0.1))',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                  }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    {panel.welcome1_info.gender && (
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                          <User className="w-4 h-4" style={{ color: '#3B82F6' }} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>성별</div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{panel.welcome1_info.gender}</div>
                        </div>
                      </div>
                    )}
                    {panel.welcome1_info.age && (
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                          <Calendar className="w-4 h-4" style={{ color: '#3B82F6' }} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>나이</div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {panel.welcome1_info.age}{typeof panel.welcome1_info.age === 'number' ? '세' : ''}
                          </div>
                        </div>
                      </div>
                    )}
                    {panel.welcome1_info.region && (
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                          <MapPin className="w-4 h-4" style={{ color: '#3B82F6' }} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>지역</div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {panel.welcome1_info.region}{panel.welcome1_info.detail_location ? ` ${panel.welcome1_info.detail_location}` : ''}
                          </div>
                        </div>
                      </div>
                    )}
                    {panel.welcome1_info.age_group && (
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                          <Calendar className="w-4 h-4" style={{ color: '#3B82F6' }} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>연령대</div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{panel.welcome1_info.age_group}</div>
                        </div>
                      </div>
                    )}
                    {panel.welcome1_info.marriage && (
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(236, 72, 153, 0.05)' }}>
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(236, 72, 153, 0.15)' }}>
                          <Heart className="w-4 h-4" style={{ color: '#EC4899' }} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>결혼여부</div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{panel.welcome1_info.marriage}</div>
                        </div>
                      </div>
                    )}
                    {panel.welcome1_info.children !== undefined && (
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                          <Users className="w-4 h-4" style={{ color: '#F59E0B' }} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>자녀수</div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{panel.welcome1_info.children}명</div>
                        </div>
                      </div>
                    )}
                    {panel.welcome1_info.family && (
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                          <Home className="w-4 h-4" style={{ color: '#10B981' }} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>가족수</div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{panel.welcome1_info.family}</div>
                        </div>
                      </div>
                    )}
                    {panel.welcome1_info.education && (
                      <div className="flex items-center gap-3 p-3 rounded-lg col-span-2" style={{ background: 'rgba(99, 102, 241, 0.05)' }}>
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
                          <GraduationCap className="w-4 h-4" style={{ color: '#6366F1' }} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>최종학력</div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{panel.welcome1_info.education}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Welcome2 정보 */}
            {panel.welcome2_info && Object.keys(panel.welcome2_info).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="p-2 rounded-xl shadow-sm"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                      color: 'white',
                    }}
                  >
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 
                      className="text-lg font-bold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Welcome 2차 정보
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      직업 및 소득 정보
                    </p>
                  </div>
                </div>
                <div 
                  className="p-6 rounded-2xl space-y-4 shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(124, 58, 237, 0.1))',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                  }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    {panel.welcome2_info.job && (
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
                          <Briefcase className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>직업</div>
                          <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }} title={panel.welcome2_info.job}>
                            {panel.welcome2_info.job}
                          </div>
                        </div>
                      </div>
                    )}
                    {panel.welcome2_info.job_role && (
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
                          <Briefcase className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>직무</div>
                          <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }} title={panel.welcome2_info.job_role}>
                            {panel.welcome2_info.job_role}
                          </div>
                        </div>
                      </div>
                    )}
                    {panel.welcome2_info.personal_income && (
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                          <DollarSign className="w-4 h-4" style={{ color: '#10B981' }} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>개인소득</div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{panel.welcome2_info.personal_income}</div>
                        </div>
                      </div>
                    )}
                    {panel.welcome2_info.household_income && (
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                          <DollarSign className="w-4 h-4" style={{ color: '#10B981' }} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>가구소득</div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{panel.welcome2_info.household_income}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 상세 메타데이터 */}
            {panel.metadata && Object.keys(panel.metadata).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="p-1.5 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.1))',
                      color: '#8B5CF6',
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 
                    className="font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    상세 정보
                  </h3>
                </div>
                
                {/* 인구통계 정보 - Welcome 1차 정보와 중복 제거 */}
                {(() => {
                  // Welcome 1차 정보에 이미 표시된 필드 제외
                  const hasMarriage = panel.metadata.결혼여부 && !panel.welcome1_info?.marriage;
                  const hasChildren = panel.metadata.자녀수 !== undefined && panel.welcome1_info?.children === undefined;
                  const hasFamily = panel.metadata.가족수 && !panel.welcome1_info?.family;
                  const hasEducation = panel.metadata.최종학력 && !panel.welcome1_info?.education;
                  const hasJob = panel.metadata.직업 && !panel.welcome2_info?.job;
                  const hasJobRole = panel.metadata.직무 && !panel.welcome2_info?.job_role;
                  
                  // 표시할 필드가 있는지 확인
                  const hasAnyField = hasMarriage || hasChildren || hasFamily || hasEducation || hasJob || hasJobRole;
                  
                  if (!hasAnyField) return null;
                  
                  return (
                    <div 
                      className="p-4 rounded-xl space-y-3"
                      style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.08))',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div 
                          className="p-1.5 rounded-lg"
                          style={{
                            background: 'linear-gradient(135deg, #10B981, #059669)',
                            color: 'white',
                          }}
                        >
                          <Users className="w-4 h-4" />
                        </div>
                        <h4 
                          className="text-sm font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          인구통계
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {hasMarriage && (
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4" style={{ color: '#EC4899' }} />
                            <span style={{ color: 'var(--text-tertiary)' }}>결혼여부: </span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{panel.metadata.결혼여부}</span>
                          </div>
                        )}
                        {hasChildren && (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" style={{ color: '#F59E0B' }} />
                            <span style={{ color: 'var(--text-tertiary)' }}>자녀수: </span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{panel.metadata.자녀수}명</span>
                          </div>
                        )}
                        {hasFamily && (
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4" style={{ color: '#10B981' }} />
                            <span style={{ color: 'var(--text-tertiary)' }}>가족수: </span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{panel.metadata.가족수}</span>
                          </div>
                        )}
                        {hasEducation && (
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4" style={{ color: '#6366F1' }} />
                            <span style={{ color: 'var(--text-tertiary)' }}>최종학력: </span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{panel.metadata.최종학력}</span>
                          </div>
                        )}
                        {hasJob && (
                          <div className="col-span-2 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" style={{ color: '#3B82F6' }} />
                            <span style={{ color: 'var(--text-tertiary)' }}>직업: </span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{panel.metadata.직업}</span>
                          </div>
                        )}
                        {hasJobRole && (
                          <div className="col-span-2 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                            <span style={{ color: 'var(--text-tertiary)' }}>직무: </span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{panel.metadata.직무}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 보유 제품 정보 */}
                {panel.metadata.보유전제품 && panel.metadata.보유전제품.length > 0 && (
                  <div 
                    className="p-4 rounded-xl space-y-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.08))',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="p-1.5 rounded-lg"
                        style={{
                          background: 'linear-gradient(135deg, #10B981, #059669)',
                          color: 'white',
                        }}
                      >
                        <FileText className="w-4 h-4" />
                      </div>
                      <h4 
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        보유 전자제품 ({panel.metadata.보유전제품.length}개)
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {panel.metadata.보유전제품.map((item, idx) => (
                        <PIChip key={idx} type="tag">{item}</PIChip>
                      ))}
                    </div>
                  </div>
                )}

                {/* 휴대폰 정보 */}
                {(panel.metadata["보유 휴대폰 단말기 브랜드"] || panel.metadata["보유 휴대폰 모델명"]) && (
                  <div 
                    className="p-4 rounded-xl space-y-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(37, 99, 235, 0.08))',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="p-1.5 rounded-lg"
                        style={{
                          background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                          color: 'white',
                        }}
                      >
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <h4 
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        휴대폰
                      </h4>
                    </div>
                    <div className="text-sm space-y-1">
                      {panel.metadata["보유 휴대폰 단말기 브랜드"] && (
                        <div>
                          <span style={{ color: 'var(--text-tertiary)' }}>브랜드: </span>
                          <span style={{ color: 'var(--text-secondary)' }}>{panel.metadata["보유 휴대폰 단말기 브랜드"]}</span>
                        </div>
                      )}
                      {panel.metadata["보유 휴대폰 모델명"] && (
                        <div>
                          <span style={{ color: 'var(--text-tertiary)' }}>모델: </span>
                          <span style={{ color: 'var(--text-secondary)' }}>{panel.metadata["보유 휴대폰 모델명"]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 차량 정보 */}
                {panel.metadata.보유차량여부 && (
                  <div 
                    className="p-4 rounded-xl space-y-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(217, 119, 6, 0.08))',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="p-1.5 rounded-lg"
                        style={{
                          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                          color: 'white',
                        }}
                      >
                        <Car className="w-4 h-4" />
                      </div>
                      <h4 
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        차량
                      </h4>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>보유여부: </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{panel.metadata.보유차량여부}</span>
                      </div>
                      {panel.metadata.보유차량여부 === "있다" && (
                        <>
                          {(panel.metadata["자동차 제조사"] || panel.metadata.자동차제조사) && 
                           (panel.metadata["자동차 제조사"] || panel.metadata.자동차제조사) !== "무응답" && (
                            <div>
                              <span style={{ color: 'var(--text-tertiary)' }}>제조사: </span>
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {panel.metadata["자동차 제조사"] || panel.metadata.자동차제조사}
                              </span>
                            </div>
                          )}
                          {(panel.metadata["자동차 모델"] || panel.metadata.자동차모델) && 
                           (panel.metadata["자동차 모델"] || panel.metadata.자동차모델) !== "무응답" && (
                            <div>
                              <span style={{ color: 'var(--text-tertiary)' }}>모델: </span>
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {panel.metadata["자동차 모델"] || panel.metadata.자동차모델}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 흡연 경험 */}
                {panel.metadata.흡연경험 && panel.metadata.흡연경험.length > 0 && (
                  <div 
                    className="p-4 rounded-xl space-y-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(220, 38, 38, 0.08))',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="p-1.5 rounded-lg"
                        style={{
                          background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                          color: 'white',
                        }}
                      >
                        <X className="w-4 h-4 rotate-45" />
                      </div>
                      <h4 
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        흡연 경험
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(panel.metadata.흡연경험) ? (
                        panel.metadata.흡연경험.map((item, idx) => (
                          <PIChip key={idx} type="tag">{item}</PIChip>
                        ))
                      ) : (
                        <PIChip type="tag">{panel.metadata.흡연경험}</PIChip>
                      )}
                    </div>
                    {panel.metadata["흡연경험 담배브랜드"] && 
                     panel.metadata["흡연경험 담배브랜드"] !== "무응답" && (
                      <div className="mt-2">
                        <span 
                          className="text-xs"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          담배 브랜드: 
                        </span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {Array.isArray(panel.metadata["흡연경험 담배브랜드"]) ? (
                            panel.metadata["흡연경험 담배브랜드"].map((brand, idx) => (
                              <PIChip key={idx} type="tag">{brand}</PIChip>
                            ))
                          ) : (
                            <PIChip type="tag">{panel.metadata["흡연경험 담배브랜드"]}</PIChip>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 음용 경험 */}
                {panel.metadata["음용경험 술"] && panel.metadata["음용경험 술"].length > 0 && (
                  <div 
                    className="p-4 rounded-xl space-y-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(217, 119, 6, 0.08))',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="p-1.5 rounded-lg"
                        style={{
                          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                          color: 'white',
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <h4 
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        음용 경험 (술)
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {panel.metadata["음용경험 술"].map((item, idx) => (
                        <PIChip key={idx} type="tag">{item}</PIChip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI 인사이트 - 개요 탭 맨 하단 */}
            {panel.aiSummary && (
              <div 
                className="p-5 rounded-xl relative overflow-hidden mt-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(124, 58, 237, 0.12))',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                {/* 배경 장식 아이콘 - 더 작고 덜 방해되도록 개선 */}
                <div className="absolute top-2 right-2 w-16 h-16 opacity-5 pointer-events-none">
                  <Sparkles className="w-full h-full" style={{ color: '#8B5CF6' }} />
                </div>
                
                {/* 헤더 영역 */}
                <div className="flex items-start gap-3 mb-4 relative z-10">
                  <div 
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                      color: 'white',
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="font-semibold text-base mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      AI 인사이트
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      라이프스타일 분석 기반 패널 특성 요약
                    </p>
                  </div>
                  {panel.tags && panel.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                      {panel.tags.slice(0, 5).map((tag, idx) => (
                        <PIBadge key={idx} variant="outline">{tag}</PIBadge>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* 인사이트 텍스트 - 아이콘이 가리지 않도록 충분한 여백 확보 */}
                <div className="relative z-10 pr-4">
                  <p 
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {panel.aiSummary}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Responses Tab */}
          <TabsContent 
            value="responses" 
            className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
            style={{ height: 'calc(100% - 120px)', overflowY: 'auto' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div 
                className="p-1.5 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
                  color: '#3B82F6',
                }}
              >
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 
                className="font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                응답 이력
              </h3>
              {((panel.responses && panel.responses.length > 0) || 
                (panel.responses_by_topic && Object.keys(panel.responses_by_topic).length > 0)) && (
                <span 
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: '#3B82F6',
                  }}
                >
                  {(panel.responses?.length || 0) + 
                   (panel.responses_by_topic ? Object.values(panel.responses_by_topic).reduce((acc, arr) => acc + arr.length, 0) : 0)}개
                </span>
              )}
            </div>

            {/* 모든 응답 이력 (topic별로 표시) */}
            {panel.responses_by_topic && Object.keys(panel.responses_by_topic).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(panel.responses_by_topic).map(([topic, responses]) => {
                  // 각 topic별로 응답 표시
                  if (!responses || responses.length === 0) {
                    return null;
                  }
                  
                  return (
                    <div key={topic} className="space-y-3">
                      {responses.map((response, idx) => {
                        const isQuickAnswer = response.is_quick_answer || false;
                        // quick_answer인 경우 항상 질문-답변 형식으로 표시 (질문이 없으면 topic을 질문으로 사용)
                        const displayQuestion = isQuickAnswer ? (response.question || response.title || topic) : null;
                        // qpoll 응답 없음 메시지인 경우 특별 처리
                        const isNoQpoll = response.key === 'no_qpoll';
                        
                        return (
                          <div 
                            key={`${topic}-${idx}`}
                            className="p-5 rounded-xl border transition-all hover:shadow-md"
                            style={{
                              background: isNoQpoll
                                ? 'linear-gradient(135deg, rgba(156, 163, 175, 0.05), rgba(107, 114, 128, 0.08))'
                                : isQuickAnswer 
                                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.03), rgba(5, 150, 105, 0.05))'
                                  : 'linear-gradient(135deg, rgba(59, 130, 246, 0.03), rgba(139, 92, 246, 0.05))',
                              borderColor: isNoQpoll
                                ? 'rgba(156, 163, 175, 0.2)'
                                : isQuickAnswer 
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : 'rgba(59, 130, 246, 0.2)',
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div 
                                className="p-2 rounded-lg flex-shrink-0"
                                style={{
                                  background: isNoQpoll
                                    ? 'rgba(156, 163, 175, 0.2)'
                                    : isQuickAnswer
                                      ? 'linear-gradient(135deg, #10B981, #059669)'
                                      : 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                                  color: isNoQpoll ? '#9CA3AF' : 'white',
                                }}
                              >
                                {isNoQpoll ? (
                                  <MessageSquare className="w-4 h-4" />
                                ) : isQuickAnswer ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <FileText className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <h4 
                                        className="font-semibold text-sm"
                                        style={{ color: 'var(--text-primary)' }}
                                      >
                                        {response.title || topic}
                                      </h4>
                                      {panel.coverage && (
                                        <PIBadge kind={panel.coverage === 'qw' ? 'coverage-qw' : 
                                                          panel.coverage === 'w' ? 'coverage-w' :
                                                          panel.coverage === 'q' ? 'coverage-q' : 'coverage-qw'}>
                                          {panel.coverage === 'qw' ? 'W1+W2+Q' : 
                                           panel.coverage === 'qw1' ? 'W1+Q' :
                                           panel.coverage === 'qw2' ? 'W2+Q' :
                                           panel.coverage === 'q' ? 'Q' :
                                           panel.coverage === 'w' ? 'W1+W2' :
                                           panel.coverage === 'w1' ? 'W1' :
                                           panel.coverage === 'w2' ? 'W2' :
                                           String(panel.coverage).toUpperCase()}
                                        </PIBadge>
                                      )}
                                    </div>
                                    {/* 질문 표시 (quick_answer인 경우 항상 표시, no_qpoll 제외) */}
                                    {displayQuestion && !isNoQpoll && (
                                      <div 
                                        className="p-3 rounded-lg mb-2"
                                        style={{
                                          background: 'rgba(16, 185, 129, 0.08)',
                                          borderLeft: '3px solid #10B981',
                                        }}
                                      >
                                        <div className="text-xs font-medium mb-1" style={{ color: '#10B981' }}>
                                          질문
                                        </div>
                                        <p 
                                          className="text-sm font-medium"
                                          style={{ color: 'var(--text-primary)' }}
                                        >
                                          {displayQuestion}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  {response.date && (
                                    <span 
                                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                                      style={{
                                        background: isQuickAnswer
                                          ? 'rgba(16, 185, 129, 0.1)'
                                          : 'rgba(59, 130, 246, 0.1)',
                                        color: isQuickAnswer ? '#10B981' : '#3B82F6',
                                      }}
                                    >
                                      {response.date}
                                    </span>
                                  )}
                                </div>
                                {/* 답변 표시 - quick_answer인 경우 항상 질문-답변 형식 */}
                                {isNoQpoll ? (
                                  <div 
                                    className="p-4 rounded-lg text-center"
                                    style={{
                                      background: 'rgba(156, 163, 175, 0.05)',
                                    }}
                                  >
                                    <p 
                                      className="text-sm"
                                      style={{ color: 'var(--text-tertiary)' }}
                                    >
                                      {response.answer}
                                    </p>
                                  </div>
                                ) : displayQuestion ? (
                                  <div 
                                    className="p-3 rounded-lg"
                                    style={{
                                      background: 'rgba(0, 0, 0, 0.02)',
                                    }}
                                  >
                                    <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                                      답변
                                    </div>
                                    <p 
                                      className="text-sm leading-relaxed"
                                      style={{ color: 'var(--text-secondary)' }}
                                    >
                                      {response.answer}
                                    </p>
                                  </div>
                                ) : (
                                  <p 
                                    className="text-sm leading-relaxed"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    {response.answer}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div 
                className="text-center py-12"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{
                    background: 'rgba(156, 163, 175, 0.1)',
                    color: '#9CA3AF',
                  }}
                >
                  <MessageSquare className="w-8 h-8" />
                </div>
                <p>응답 이력이 없습니다.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
