import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Trash2, Copy, Clock, BarChart3, Users, GitCompare, Maximize2, Minimize2, Move } from 'lucide-react';
import { PIButton } from './PIButton';
import { PIBadge } from './PIBadge';
import { Input } from '../base/input';
import { ScrollArea } from '../base/scroll-area';
import { historyManager } from '../../lib/history';
import { HistoryItem, HistoryType } from '../../types/history';
import { toast } from 'sonner';

interface PIHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (type: HistoryType, data: any) => void;
}

export function PIHistoryDrawer({
  isOpen,
  onClose,
  onNavigate,
}: PIHistoryDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<HistoryType | 'all'>('all');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [drawerSize, setDrawerSize] = useState({ width: 1000, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHistoryItems(historyManager.getAll());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && drawerRef.current) {
        const rect = drawerRef.current.getBoundingClientRect();
        const newWidth = Math.max(600, Math.min(window.innerWidth - 100, e.clientX - rect.left));
        const newHeight = Math.max(400, Math.min(window.innerHeight - 100, e.clientY - rect.top));
        setDrawerSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!isOpen) return null;

  const filteredItems = historyItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || item.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: HistoryType) => {
    switch (type) {
      case 'query': return <Search className="w-4 h-4" />;
      case 'panel': return <Users className="w-4 h-4" />;
      case 'cluster': return <BarChart3 className="w-4 h-4" />;
      case 'comparison': return <GitCompare className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: HistoryType) => {
    switch (type) {
      case 'query': return 'bg-blue-100 text-blue-700';
      case 'panel': return 'bg-green-100 text-green-700';
      case 'cluster': return 'bg-purple-100 text-purple-700';
      case 'comparison': return 'bg-orange-100 text-orange-700';
    }
  };

  const getTypeLabel = (type: HistoryType) => {
    switch (type) {
      case 'query': return '검색';
      case 'panel': return '패널';
      case 'cluster': return '군집';
      case 'comparison': return '비교';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  };

  const handleItemClick = (item: HistoryItem) => {
    onNavigate?.(item.type, item);
    onClose();
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (historyManager.remove(id)) {
      setHistoryItems(historyManager.getAll());
      toast.success('히스토리에서 제거되었습니다');
    }
  };

  const handleCopy = (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${item.title} - ${item.description}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('클립보드에 복사되었습니다');
    });
  };

  const typeCounts = {
    all: historyItems.length,
    query: historyItems.filter(item => item.type === 'query').length,
    panel: historyItems.filter(item => item.type === 'panel').length,
    cluster: historyItems.filter(item => item.type === 'cluster').length,
    comparison: historyItems.filter(item => item.type === 'comparison').length,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        ref={drawerRef}
        className={`relative rounded-xl shadow-2xl transition-all duration-300 flex flex-col ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : ''
        }`}
        style={{
          ...(!isFullscreen ? {
            width: `${drawerSize.width}px`,
            height: `${drawerSize.height}px`
          } : {}),
          background: 'var(--surface-1)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: 'var(--brand-blue-300)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              히스토리
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsFullscreen(!isFullscreen);
                if (!isFullscreen) {
                  // 전체화면으로 전환할 때 현재 크기 저장
                  setDrawerSize({ width: 1000, height: 600 });
                }
              }}
              className="p-2 hover:bg-[var(--neutral-100)] rounded-lg transition-colors"
              title={isFullscreen ? '창 모드' : '전체화면'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-[var(--neutral-600)]" />
              ) : (
                <Maximize2 className="w-5 h-5 text-[var(--neutral-600)]" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--neutral-100)] rounded-lg transition-colors"
              title="닫기"
            >
              <X className="w-5 h-5 text-[var(--neutral-600)]" />
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex-shrink-0 p-6 border-b space-y-4" style={{ borderColor: 'var(--border-primary)' }}>
          <Input
            placeholder="히스토리 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          />
          
          <div className="flex gap-1 overflow-x-auto">
            {[
              { value: 'all', label: '전체', count: typeCounts.all },
              { value: 'query', label: '검색', count: typeCounts.query },
              { value: 'panel', label: '패널', count: typeCounts.panel },
              { value: 'cluster', label: '군집', count: typeCounts.cluster },
              { value: 'comparison', label: '비교', count: typeCounts.comparison },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedType(option.value as any)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  background: selectedType === option.value 
                    ? 'rgba(37, 99, 235, 0.2)' 
                    : 'var(--surface-2)',
                  color: selectedType === option.value 
                    ? 'var(--text-primary)' 
                    : 'var(--text-secondary)',
                  border: `1px solid ${selectedType === option.value 
                    ? 'rgba(37, 99, 235, 0.4)' 
                    : 'var(--border-primary)'}`,
                }}
                onMouseEnter={(e) => {
                  if (selectedType !== option.value) {
                    e.currentTarget.style.background = 'var(--surface-3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedType !== option.value) {
                    e.currentTarget.style.background = 'var(--surface-2)';
                  }
                }}
              >
                {option.label}
                <span style={{ color: selectedType === option.value ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>({option.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-hidden min-h-0">
          <ScrollArea className="h-full p-6">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
                <p style={{ color: 'var(--text-secondary)' }}>
                  {searchQuery ? '검색 결과가 없습니다' : '히스토리가 없습니다'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border cursor-pointer transition-all group"
                  style={{
                    borderColor: 'var(--border-primary)',
                    background: 'var(--surface-1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.4)';
                    e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                    e.currentTarget.style.background = 'var(--surface-1)';
                  }}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg" style={{ 
                          background: 'rgba(37, 99, 235, 0.15)',
                          color: 'var(--brand-blue-300)'
                        }}>
                          {getTypeIcon(item.type)}
                        </div>
                        <PIBadge variant="secondary" size="sm">
                          {getTypeLabel(item.type)}
                        </PIBadge>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold mb-1 truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.title}
                      </h3>

                      {/* Description */}
                      {item.description && (
                        <p className="text-sm mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                          {item.description}
                        </p>
                      )}

                      {/* Special info based on type */}
                      {item.type === 'query' && (
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          쿼리: "{item.query}" • {item.resultCount.toLocaleString()}개 결과
                        </div>
                      )}
                      {item.type === 'panel' && (
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          ID: {item.panelId}
                        </div>
                      )}
                      {item.type === 'cluster' && (
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {item.clusterData.count.toLocaleString()}명 ({item.clusterData.percentage}%)
                        </div>
                      )}
                      {item.type === 'comparison' && (
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {item.groupA.name} vs {item.groupB.name} • {item.analysisType} 분석
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleCopy(item, e)}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--surface-2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title="복사"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleRemove(item.id, e)}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: 'var(--error-500)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title="제거"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          <PIButton
            variant="ghost"
            size="small"
            className="w-full"
            onClick={() => {
              if (historyManager.clear()) {
                setHistoryItems([]);
                toast.success('히스토리가 모두 삭제되었습니다');
              }
            }}
          >
            전체 히스토리 삭제
          </PIButton>
        </div>
        
        {/* Resize Handle */}
        {!isFullscreen && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-[var(--neutral-200)] hover:bg-[var(--neutral-300)] transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
            style={{
              borderBottomRightRadius: '12px',
              borderTopLeftRadius: '4px'
            }}
          >
            <Move className="w-3 h-3 text-[var(--neutral-500)] absolute bottom-0.5 right-0.5" />
          </div>
        )}
      </div>
    </div>
  );
}