import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { PIBadge } from '../pi/PIBadge';
import { PIChip } from '../pi/PIChip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { searchApi } from '../../lib/utils';

interface PanelDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  panelId: string;
}

interface PanelResponse {
  key: string;
  title: string;
  answer: string;
  date: string;
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
  coverage: 'qw' | 'w';
  tags: string[];
  responses: PanelResponse[];
  evidence: PanelEvidence[];
  aiSummary: string;
  created_at: string;
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

  // 초기 크기 및 위치를 중앙 모달로 설정
  useEffect(() => {
    if (isOpen) {
      setSize({
        width: Math.min(900, Math.floor(window.innerWidth * 0.7)),
        height: Math.min(700, Math.floor(window.innerHeight * 0.8)),
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
      const panelData = await searchApi.getPanel(panelId);
      setPanel(panelData);
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
          minWidth: '400px',
          minHeight: '500px',
          maxWidth: '90vw',
          maxHeight: '90vh',
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
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 hover:bg-[rgba(37,99,235,0.2)] transition-colors"
          data-resize-handle="true"
          onMouseDown={(e) => handleMouseDown(e, 'right')}
          style={{
            backgroundColor: isResizing && resizeDirection.includes('right') ? 'rgba(37, 99, 235, 0.3)' : 'transparent',
          }}
        />
        {/* 하단 */}
        <div
          className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize z-20 hover:bg-[rgba(37,99,235,0.2)] transition-colors"
          data-resize-handle="true"
          onMouseDown={(e) => handleMouseDown(e, 'bottom')}
          style={{
            backgroundColor: isResizing && resizeDirection.includes('bottom') ? 'rgba(37, 99, 235, 0.3)' : 'transparent',
          }}
        />
        {/* 오른쪽 하단 모서리 */}
        <div
          className="absolute right-0 bottom-0 w-6 h-6 cursor-nwse-resize z-30 hover:bg-[rgba(37,99,235,0.3)] transition-colors rounded-tl-lg"
          data-resize-handle="true"
          onMouseDown={(e) => handleMouseDown(e, 'right-bottom')}
          style={{
            backgroundColor: isResizing && resizeDirection.includes('right-bottom') ? 'rgba(37, 99, 235, 0.4)' : 'transparent',
          }}
        />
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
          }}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {panel.name || panel.id}
                </h2>
                <PIBadge kind={`coverage-${panel.coverage}`}>
                  {panel.coverage.toUpperCase()}
                </PIBadge>
              </div>
              <p 
                className="text-sm"
                style={{ color: 'var(--text-tertiary)' }}
              >
                ID: {panel.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="btn--ghost p-2 rounded-lg transition-fast"
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
              style={{
                color: 'var(--text-tertiary)',
              }}
            >
              개요
            </TabsTrigger>
            <TabsTrigger 
              value="responses"
              style={{
                color: 'var(--text-tertiary)',
              }}
            >
              응답이력
            </TabsTrigger>
            <TabsTrigger 
              value="tags"
              style={{
                color: 'var(--text-tertiary)',
              }}
            >
              태그/근거
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent 
            value="overview" 
            className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
            style={{ height: 'calc(100% - 120px)', overflowY: 'auto' }}
          >
            {/* AI Summary */}
            {panel.aiSummary && (
              <div 
                className="p-4 rounded-xl"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <h3 
                  className="font-semibold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  AI 요약
                </h3>
                <p 
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {panel.aiSummary}
                </p>
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 
                className="font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                기본 정보
              </h3>
              <div className="flex flex-wrap gap-2">
                {panel.gender && (
                  <PIChip type="tag">{panel.gender}</PIChip>
                )}
                {panel.age > 0 && (
                  <PIChip type="tag">{panel.age}세</PIChip>
                )}
                {panel.region && (
                  <PIChip type="tag">{panel.region}</PIChip>
                )}
                {panel.income && (
                  <PIChip type="tag">소득: {panel.income}</PIChip>
                )}
                <PIChip type="tag">
                  생성일: {new Date(panel.created_at).toLocaleDateString('ko-KR')}
                </PIChip>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div 
                className="p-4 rounded-lg"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <div 
                  className="text-xs mb-1"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  응답 수
                </div>
                <div 
                  className="text-lg font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {panel.responses?.length || 0}개
                </div>
              </div>
              <div 
                className="p-4 rounded-lg"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <div 
                  className="text-xs mb-1"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  태그 수
                </div>
                <div 
                  className="text-lg font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {panel.tags?.length || 0}개
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Responses Tab */}
          <TabsContent 
            value="responses" 
            className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
            style={{ height: 'calc(100% - 120px)', overflowY: 'auto' }}
          >
            <h3 
              className="font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              응답 이력
            </h3>
            
            {panel.responses && panel.responses.length > 0 ? (
              panel.responses.map((response, i) => (
                <div 
                  key={i} 
                  className="p-4 rounded-xl border transition-fast hover-lift"
                  style={{
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border-primary)',
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 
                      className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {response.title}
                    </h4>
                    <span 
                      className="text-xs"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {response.date}
                    </span>
                  </div>
                  <p 
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {response.answer}
                  </p>
                </div>
              ))
            ) : (
              <div 
                className="text-center py-8"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <p>응답 이력이 없습니다.</p>
              </div>
            )}
          </TabsContent>

          {/* Tags/Evidence Tab */}
          <TabsContent 
            value="tags" 
            className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
            style={{ height: 'calc(100% - 120px)', overflowY: 'auto' }}
          >
            {/* Tags */}
            {panel.tags && panel.tags.length > 0 && (
              <div className="space-y-4">
                <h3 
                  className="font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  태그
                </h3>
                <div className="flex flex-wrap gap-2">
                  {panel.tags.map((tag, i) => (
                    <PIChip key={i} type="tag" selected>
                      #{tag}
                    </PIChip>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence */}
            {panel.evidence && panel.evidence.length > 0 && (
              <div className="space-y-4">
                <h3 
                  className="font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  근거 데이터
                </h3>
                <div className="space-y-3">
                  {panel.evidence.map((evidence, i) => (
                    <div 
                      key={i}
                      className="p-4 rounded-xl border"
                      style={{
                        background: 'var(--surface-2)',
                        borderColor: 'var(--border-primary)',
                      }}
                    >
                      <div 
                        className="text-xs mb-2"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        출처: {evidence.source}
                      </div>
                      <p 
                        className="text-sm leading-relaxed whitespace-pre-wrap"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {evidence.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!panel.tags || panel.tags.length === 0) && (!panel.evidence || panel.evidence.length === 0) && (
              <div 
                className="text-center py-8"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <p>태그 및 근거 데이터가 없습니다.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
