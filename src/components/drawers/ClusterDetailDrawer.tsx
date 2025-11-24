import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Loader2, Users, TrendingUp, Tag, Sparkles, BarChart3,
  PieChart, Target, Award, Zap, Info, CheckCircle2, Table, User, MapPin, Calendar
} from 'lucide-react';
import { PIBadge } from '../../ui/pi/PIBadge';
import { PIChip } from '../../ui/pi/PIChip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/base/tabs';
import { useDarkMode, useThemeColors } from '../../lib/DarkModeSystem';

interface ClusterDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clusterData: {
    id: number;
    name: string;
    size: number;
    percentage: number;
    color: string;
    tags: string[];
    snippets: string[];
    insights?: string[];
    features?: Array<{feature: string, value: number, avg: number, diff: number}>;
    silhouette?: number;
    description?: string;
    // 새로운 필드들
    name_main?: string;
    name_sub?: string;
    tags_hierarchical?: {
      primary?: Array<{label: string; icon?: string; color?: string; category?: string}>;
      secondary?: Array<{label: string; icon?: string; category?: string}>;
      lifestyle?: Array<{label: string; icon?: string; category?: string}>;
    };
    insights_storytelling?: {
      who?: Array<{message: string}>;
      why?: Array<{message: string}>;
      what?: Array<{message: string}>;
      how_different?: Array<{message: string}>;
    };
  } | null;
  searchedPanels?: Array<{
    panelId: string;
    cluster: number;
    umap_x: number;
    umap_y: number;
    isSearchResult?: boolean;
    gender?: string;
    age?: number;
    region?: string;
  }>;
  onPanelClick?: (panelId: string) => void;
}

export function ClusterDetailDrawer({ isOpen, onClose, clusterData, searchedPanels = [], onPanelClick }: ClusterDetailDrawerProps) {
  const [size, setSize] = useState({ width: 900, height: 700 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');
  const drawerRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const { isDark } = useDarkMode();
  const colors = useThemeColors();

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
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

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

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-resize-handle="true"]')) return;
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
    if (!isResizing && !isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && resizeStartRef.current) {
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;
        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;

        const maxWidth = window.innerWidth * 0.95;
        const minWidth = 600;
        const maxHeight = window.innerHeight * 0.95;
        const minHeight = 500;
        
        if (resizeDirection.includes('right')) {
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.width + deltaX));
        }
        if (resizeDirection.includes('left')) {
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.width - deltaX));
          setPosition(prev => ({ ...prev, x: prev.x + deltaX }));
        }
        if (resizeDirection.includes('bottom')) {
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartRef.current.height + deltaY));
        }
        if (resizeDirection.includes('top')) {
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartRef.current.height - deltaY));
          setPosition(prev => ({ ...prev, y: prev.y + deltaY }));
        }
        
        if (resizeDirection.includes('right-bottom')) {
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.width + deltaX));
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartRef.current.height + deltaY));
        }

        setSize({ width: newWidth, height: newHeight });
      }

      if (isDragging && dragStartRef.current) {
        const newX = e.clientX - dragStartRef.current.offsetX - window.innerWidth / 2;
        const newY = e.clientY - dragStartRef.current.offsetY - window.innerHeight / 2;
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setIsDragging(false);
      setResizeDirection('');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isDragging, resizeDirection]);

  if (!isOpen || !clusterData) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 modal-backdrop"
        onClick={onClose}
      />
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
          background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          color: colors.text.secondary,
          boxShadow: isDark 
            ? '0 20px 60px rgba(0, 0, 0, 0.5)' 
            : '0 20px 60px rgba(0, 0, 0, 0.15)',
          border: isDark
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(17, 24, 39, 0.1)',
          cursor: isResizing ? (resizeDirection.includes('right') ? 'ew-resize' : resizeDirection.includes('left') ? 'ew-resize' : resizeDirection.includes('bottom') ? 'ns-resize' : resizeDirection.includes('top') ? 'ns-resize' : 'nwse-resize') : isDragging ? 'move' : 'default',
          transition: isResizing || isDragging ? 'none' : 'all 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Resize Handles */}
        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-20 transition-colors"
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
        <div
          className="absolute left-0 right-0 bottom-0 h-3 cursor-ns-resize z-20 transition-colors"
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

        {/* Header */}
        <div 
          className="drawer-header relative px-6 py-5 border-b"
          style={{
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.1)',
            cursor: isDragging ? 'move' : 'default',
            background: `linear-gradient(135deg, ${clusterData.color}15 0%, ${clusterData.color}08 100%)`,
          }}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="p-2 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${clusterData.color}, ${clusterData.color}CC)`,
                    color: 'white',
                  }}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h2 
                    className="text-lg font-semibold"
                    style={{ color: colors.text.primary }}
                  >
                    {clusterData.name_main || clusterData.name}
                  </h2>
                  {clusterData.name_sub && (
                    <p 
                      className="text-xs mt-0.5"
                      style={{ color: colors.text.secondary }}
                    >
                      {clusterData.name_sub}
                    </p>
                  )}
                  <p 
                    className="text-xs mt-0.5"
                    style={{ color: colors.text.tertiary }}
                  >
                    군집 ID: C{clusterData.id + 1}
                  </p>
                </div>
                <PIBadge kind="cluster">C{clusterData.id + 1}</PIBadge>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn--ghost p-2 rounded-lg transition-fast hover:bg-red-50 dark:hover:bg-red-900/20"
              style={{ color: colors.text.tertiary }}
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
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.1)',
              background: 'transparent',
            }}
          >
            <TabsTrigger 
              value="overview"
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              개요
            </TabsTrigger>
            <TabsTrigger 
              value="panels"
              className="flex items-center gap-2"
            >
              <Table className="w-4 h-4" />
              검색된 패널 목록
              {searchedPanels && searchedPanels.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full" style={{
                  background: clusterData?.color + '20',
                  color: clusterData?.color,
                }}>
                  {searchedPanels.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="insights"
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              인사이트
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent 
            value="overview" 
            className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
            style={{ height: 'calc(100% - 120px)', overflowY: 'auto' }}
          >
            {/* Basic Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div 
                className="p-4 rounded-xl relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${clusterData.color}15, ${clusterData.color}20)`,
                  border: `1px solid ${clusterData.color}40`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div 
                    className="p-2 rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, ${clusterData.color}, ${clusterData.color}CC)`,
                      color: 'white',
                    }}
                  >
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xs mb-1 font-medium" style={{ color: colors.text.tertiary }}>
                  패널 수
                </div>
                <div className="text-2xl font-bold" style={{ color: clusterData.color }}>
                  {clusterData.size.toLocaleString()}
                </div>
                <div className="text-xs mt-1" style={{ color: colors.text.tertiary }}>명</div>
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
                    <PieChart className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xs mb-1 font-medium" style={{ color: colors.text.tertiary }}>
                  비율
                </div>
                <div className="text-2xl font-bold" style={{ color: '#8B5CF6' }}>
                  {clusterData.percentage.toFixed(2)}%
                </div>
              </div>

              {clusterData.silhouette !== undefined && (
                <div 
                  className="p-4 rounded-xl relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.12))',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div 
                      className="p-2 rounded-lg"
                      style={{
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        color: 'white',
                      }}
                    >
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xs mb-1 font-medium" style={{ color: colors.text.tertiary }}>
                    실루엣 점수
                  </div>
                  <div className="text-2xl font-bold" style={{ color: '#10B981' }}>
                    {clusterData.silhouette.toFixed(3)}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {clusterData.description && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" style={{ color: colors.text.secondary }} />
                  <h3 className="font-semibold" style={{ color: colors.text.primary }}>
                    설명
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: colors.text.secondary }}>
                  {clusterData.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {clusterData.tags && clusterData.tags.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" style={{ color: colors.text.secondary }} />
                  <h3 className="font-semibold" style={{ color: colors.text.primary }}>
                    태그
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {clusterData.tags.map((tag, idx) => (
                    <PIChip key={idx} type="tag">{tag}</PIChip>
                  ))}
                </div>
              </div>
            )}

            {/* Snippets */}
            {clusterData.snippets && clusterData.snippets.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: colors.text.secondary }} />
                  <h3 className="font-semibold" style={{ color: colors.text.primary }}>
                    대표 스니펫
                  </h3>
                </div>
                <div className="space-y-2">
                  {clusterData.snippets.map((snippet, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-lg text-sm"
                      style={{
                        background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
                        color: colors.text.secondary,
                      }}
                    >
                      {snippet}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Searched Panels Tab */}
          <TabsContent 
            value="panels" 
            className="flex-1 overflow-y-auto px-6 py-6"
            style={{ height: 'calc(100% - 120px)', overflowY: 'auto' }}
          >
            {searchedPanels && searchedPanels.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Table className="w-5 h-5" style={{ color: clusterData?.color }} />
                    <h3 className="font-semibold" style={{ color: colors.text.primary }}>
                      검색된 패널 목록
                    </h3>
                    <span className="text-sm px-2 py-1 rounded-full" style={{
                      background: clusterData?.color + '20',
                      color: clusterData?.color,
                    }}>
                      {searchedPanels.length}개
                    </span>
                  </div>
                </div>
                
                <div className="rounded-xl border overflow-hidden" style={{
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.1)',
                }}>
                  <table className="w-full">
                    <thead style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.text.secondary }}>이름</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.text.secondary }}>성별</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.text.secondary }}>나이</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.text.secondary }}>지역</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchedPanels.map((panel, idx) => (
                        <tr
                          key={idx}
                          onClick={() => onPanelClick?.(panel.panelId)}
                          className="cursor-pointer transition-colors hover:bg-opacity-50"
                          style={{
                            borderTop: idx > 0 ? (isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(17, 24, 39, 0.05)') : 'none',
                            background: 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = isDark 
                              ? 'rgba(255, 255, 255, 0.05)' 
                              : 'rgba(0, 0, 0, 0.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ background: clusterData?.color }}
                              />
                              <span className="text-sm font-medium" style={{ color: colors.text.primary }}>
                                {panel.panelId}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" style={{ color: colors.text.tertiary }} />
                              <span className="text-sm" style={{ color: colors.text.secondary }}>
                                {panel.gender || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" style={{ color: colors.text.tertiary }} />
                              <span className="text-sm" style={{ color: colors.text.secondary }}>
                                {panel.age ? `${panel.age}세` : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" style={{ color: colors.text.tertiary }} />
                              <span className="text-sm" style={{ color: colors.text.secondary }}>
                                {panel.region || '-'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: colors.text.tertiary }}>
                <Table className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>검색된 패널이 없습니다.</p>
                <p className="text-xs mt-2" style={{ color: colors.text.tertiary }}>
                  검색 결과가 있는 경우에만 표시됩니다.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent 
            value="insights" 
            className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
            style={{ height: 'calc(100% - 120px)', overflowY: 'auto' }}
          >
            {/* 스토리텔링 인사이트가 있으면 우선 표시 */}
            {clusterData.insights_storytelling && 
             Object.keys(clusterData.insights_storytelling).length > 0 ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5" style={{ color: clusterData.color }} />
                    <h3 className="font-semibold" style={{ color: colors.text.primary }}>
                      스토리텔링 인사이트
                    </h3>
                  </div>
                  
                  {/* Who */}
                  {clusterData.insights_storytelling.who && clusterData.insights_storytelling.who.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.text.primary }}>
                        <User className="w-4 h-4" style={{ color: clusterData.color }} />
                        Who (누구인가)
                      </h4>
                      {clusterData.insights_storytelling.who.map((item, idx) => (
                        <div 
                          key={idx}
                          className="p-4 rounded-lg text-sm"
                          style={{
                            background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
                            color: colors.text.secondary,
                          }}
                        >
                          {item.message}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Why */}
                  {clusterData.insights_storytelling.why && clusterData.insights_storytelling.why.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.text.primary }}>
                        <Target className="w-4 h-4" style={{ color: clusterData.color }} />
                        Why (왜 그런가)
                      </h4>
                      {clusterData.insights_storytelling.why.map((item, idx) => (
                        <div 
                          key={idx}
                          className="p-4 rounded-lg text-sm"
                          style={{
                            background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
                            color: colors.text.secondary,
                          }}
                        >
                          {item.message}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* What */}
                  {clusterData.insights_storytelling.what && clusterData.insights_storytelling.what.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.text.primary }}>
                        <BarChart3 className="w-4 h-4" style={{ color: clusterData.color }} />
                        What (무엇이 다른가)
                      </h4>
                      {clusterData.insights_storytelling.what.map((item, idx) => (
                        <div 
                          key={idx}
                          className="p-4 rounded-lg text-sm"
                          style={{
                            background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
                            color: colors.text.secondary,
                          }}
                        >
                          {item.message}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* How Different */}
                  {clusterData.insights_storytelling.how_different && clusterData.insights_storytelling.how_different.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.text.primary }}>
                        <Zap className="w-4 h-4" style={{ color: clusterData.color }} />
                        How Different (어떻게 다른가)
                      </h4>
                      {clusterData.insights_storytelling.how_different.map((item, idx) => (
                        <div 
                          key={idx}
                          className="p-4 rounded-lg text-sm"
                          style={{
                            background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
                            color: colors.text.secondary,
                          }}
                        >
                          {item.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null
            }
            
            {/* 기존 insights가 있으면 표시 (스토리텔링이 없을 때만) */}
            {(!clusterData.insights_storytelling || Object.keys(clusterData.insights_storytelling).length === 0) && 
             clusterData.insights && clusterData.insights.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5" style={{ color: clusterData.color }} />
                  <h3 className="font-semibold" style={{ color: colors.text.primary }}>
                    인사이트
                  </h3>
                </div>
                {clusterData.insights.map((insight, idx) => (
                  <div 
                    key={idx}
                    className="p-5 rounded-xl relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${clusterData.color}10, ${clusterData.color}05)`,
                      border: `1px solid ${clusterData.color}30`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="p-2 rounded-lg flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${clusterData.color}, ${clusterData.color}CC)`,
                          color: 'white',
                        }}
                      >
                        <Award className="w-4 h-4" />
                      </div>
                      <p className="text-sm leading-relaxed flex-1" style={{ color: colors.text.secondary }}>
                        {insight}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              (!clusterData.insights_storytelling || Object.keys(clusterData.insights_storytelling).length === 0) && 
              (!clusterData.insights || clusterData.insights.length === 0) && (
                <div className="text-center py-12" style={{ color: colors.text.tertiary }}>
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>인사이트가 없습니다.</p>
                </div>
              )
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

