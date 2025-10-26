import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, Copy, Clock, BarChart3, Users, GitCompare, Maximize2, Minimize2 } from 'lucide-react';
import { PIButton } from './PIButton';
import { PIBadge } from './PIBadge';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
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

  useEffect(() => {
    if (isOpen) {
      setHistoryItems(historyManager.getAll());
    }
  }, [isOpen]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`relative bg-white shadow-2xl transition-all duration-300 flex flex-col ${
        isFullscreen 
          ? 'w-full h-full' 
          : 'w-[80vw] max-w-4xl h-[60vw] max-h-[600px]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--neutral-200)]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--accent-blue)]" />
            <h2 className="text-lg font-semibold text-[var(--primary-500)]">
              히스토리
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
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
            >
              <X className="w-5 h-5 text-[var(--neutral-600)]" />
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex-shrink-0 p-6 border-b border-[var(--neutral-200)] space-y-4">
          <Input
            placeholder="히스토리 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
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
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedType === option.value
                    ? 'bg-[var(--accent-blue)] text-white'
                    : 'bg-[var(--neutral-100)] text-[var(--neutral-600)] hover:bg-[var(--neutral-200)]'
                }`}
              >
                {option.label}
                <span className="text-xs opacity-75">({option.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-hidden min-h-0">
          <ScrollArea className="h-full p-6">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-[var(--neutral-400)] mx-auto mb-4" />
                <p className="text-[var(--neutral-600)]">
                  {searchQuery ? '검색 결과가 없습니다' : '히스토리가 없습니다'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border border-[var(--neutral-200)] hover:border-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/5 cursor-pointer transition-all group"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg ${getTypeColor(item.type)}`}>
                          {getTypeIcon(item.type)}
                        </div>
                        <PIBadge variant="secondary" size="sm">
                          {getTypeLabel(item.type)}
                        </PIBadge>
                        <span className="text-xs text-[var(--neutral-500)]">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-[var(--primary-500)] mb-1 truncate">
                        {item.title}
                      </h3>

                      {/* Description */}
                      {item.description && (
                        <p className="text-sm text-[var(--neutral-600)] mb-2 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {/* Special info based on type */}
                      {item.type === 'query' && (
                        <div className="text-xs text-[var(--neutral-500)]">
                          쿼리: "{item.query}" • {item.resultCount.toLocaleString()}개 결과
                        </div>
                      )}
                      {item.type === 'panel' && (
                        <div className="text-xs text-[var(--neutral-500)]">
                          ID: {item.panelId}
                        </div>
                      )}
                      {item.type === 'cluster' && (
                        <div className="text-xs text-[var(--neutral-500)]">
                          {item.clusterData.count.toLocaleString()}명 ({item.clusterData.percentage}%)
                        </div>
                      )}
                      {item.type === 'comparison' && (
                        <div className="text-xs text-[var(--neutral-500)]">
                          {item.groupA.name} vs {item.groupB.name} • {item.analysisType} 분석
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleCopy(item, e)}
                        className="p-1.5 hover:bg-[var(--neutral-100)] rounded transition-colors"
                        title="복사"
                      >
                        <Copy className="w-3.5 h-3.5 text-[var(--neutral-600)]" />
                      </button>
                      <button
                        onClick={(e) => handleRemove(item.id, e)}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors"
                        title="제거"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
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
        <div className="flex-shrink-0 p-6 border-t border-[var(--neutral-200)]">
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
      </div>
    </div>
  );
}