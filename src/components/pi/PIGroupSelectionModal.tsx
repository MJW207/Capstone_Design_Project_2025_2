import React, { useState } from 'react';
import { X, Search, Filter, Check } from 'lucide-react';
import { PICard } from './PICard';
import { PIButton } from './PIButton';
import { PIBadge } from './PIBadge';
import { PITextField } from './PITextField';
import { PIHashtag, getHashtagColor } from './PIHashtag';

interface CompareGroup {
  id: string;
  type: 'cluster' | 'segment';
  label: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
  tags: string[];
  evidence?: string[];
  qualityWarnings?: Array<'low-sample' | 'low-coverage' | 'high-noise'>;
}

interface PIGroupSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (group: CompareGroup) => void;
  groups: CompareGroup[];
  title: string;
  selectedGroup?: CompareGroup | null;
}

export function PIGroupSelectionModal({
  isOpen,
  onClose,
  onSelect,
  groups,
  title,
  selectedGroup
}: PIGroupSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'cluster' | 'segment'>('all');

  if (!isOpen) return null;

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterType === 'all' || group.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getQualityBadge = (warning: string) => {
    switch (warning) {
      case 'low-sample':
        return { label: '표본<50', variant: 'warning' as const };
      case 'low-coverage':
        return { label: 'Coverage<30%', variant: 'warning' as const };
      case 'high-noise':
        return { label: 'Noise↑', variant: 'error' as const };
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--neutral-200)]">
          <h2 className="text-lg font-semibold text-[var(--primary-500)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--neutral-100)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--neutral-600)]" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-6 border-b border-[var(--neutral-200)] space-y-4">
          <PITextField
            placeholder="그룹명, 설명, 태그로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leadingIcons={[<Search className="w-4 h-4" />]}
          />
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--neutral-600)]" />
            <span className="text-sm text-[var(--neutral-600)]">타입:</span>
            <div className="flex gap-1">
              {[
                { value: 'all', label: '전체' },
                { value: 'cluster', label: '군집' },
                { value: 'segment', label: '세그먼트' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setFilterType(option.value as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterType === option.value
                      ? 'bg-[var(--accent-blue)] text-white'
                      : 'bg-[var(--neutral-100)] text-[var(--neutral-600)] hover:bg-[var(--neutral-200)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Groups List */}
        <div className="max-h-96 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4">
            {filteredGroups.map((group) => (
              <PICard
                key={group.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedGroup?.id === group.id 
                    ? 'ring-2 ring-[var(--accent-blue)] bg-[var(--accent-blue)]/5' 
                    : 'hover:bg-[var(--neutral-50)]'
                }`}
                onClick={() => onSelect(group)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: group.color }}
                      />
                      <h3 className="font-semibold text-[var(--primary-500)]">
                        {group.label}
                      </h3>
                      <span className="text-sm text-[var(--neutral-600)]">
                        {group.count.toLocaleString()}명
                      </span>
                      <span 
                        className="text-sm font-semibold"
                        style={{ color: group.color }}
                      >
                        {group.percentage}%
                      </span>
                      {group.qualityWarnings?.map((warning, idx) => {
                        const badge = getQualityBadge(warning);
                        return badge ? (
                          <PIBadge key={idx} variant={badge.variant} size="sm">
                            {badge.label}
                          </PIBadge>
                        ) : null;
                      })}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-[var(--neutral-600)] mb-3 line-clamp-2">
                      {group.description}
                    </p>

                    {/* Tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {group.tags.slice(0, 6).map((tag, idx) => (
                        <PIHashtag key={idx} color={getHashtagColor(tag)}>
                          {tag}
                        </PIHashtag>
                      ))}
                      {group.tags.length > 6 && (
                        <span className="text-xs text-[var(--neutral-500)]">
                          +{group.tags.length - 6}개
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {selectedGroup?.id === group.id && (
                    <div className="ml-4 flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-[var(--accent-blue)] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </PICard>
            ))}
          </div>

          {filteredGroups.length === 0 && (
            <div className="text-center py-12">
              <div className="text-[var(--neutral-400)] mb-2">
                <Search className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-[var(--neutral-600)]">
                검색 조건에 맞는 그룹이 없습니다
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--neutral-200)]">
          <PIButton variant="ghost" onClick={onClose}>
            취소
          </PIButton>
          <PIButton 
            variant="primary" 
            onClick={() => {
              if (selectedGroup) {
                onSelect(selectedGroup);
                onClose();
              }
            }}
            disabled={!selectedGroup}
          >
            선택
          </PIButton>
        </div>
      </div>
    </div>
  );
}

