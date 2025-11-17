import { useState } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import { PIButton } from './PIButton';
import { Checkbox } from '../base/checkbox';

interface Cluster {
  id: string;
  label: string;
  count: number;
  color: string;
}

interface PIClusterFilterProps {
  clusters?: Cluster[];
  selectedClusters?: string[];
  onSelectionChange?: (selected: string[]) => void;
  onViewSelected?: () => void;
  onSendToCompare?: () => void;
}

const defaultClusters: Cluster[] = [
  { id: 'C1', label: 'C1', count: 542, color: '#2563EB' },
  { id: 'C2', label: 'C2', count: 398, color: '#16A34A' },
  { id: 'C3', label: 'C3', count: 467, color: '#F59E0B' },
  { id: 'C4', label: 'C4', count: 321, color: '#EF4444' },
  { id: 'C5', label: 'C5', count: 230, color: '#8B5CF6' },
];

export function PIClusterFilter({
  clusters = defaultClusters,
  selectedClusters = [],
  onSelectionChange,
  onViewSelected,
  onSendToCompare,
}: PIClusterFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'size' | 'label'>('size');

  const handleToggleCluster = (clusterId: string) => {
    const newSelection = selectedClusters.includes(clusterId)
      ? selectedClusters.filter(id => id !== clusterId)
      : [...selectedClusters, clusterId];
    onSelectionChange?.(newSelection);
  };

  const handleToggleAll = () => {
    if (selectedClusters.length === filteredClusters.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(filteredClusters.map(c => c.id));
    }
  };

  const filteredClusters = clusters
    .filter(c => c.label.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'size') {
        return b.count - a.count;
      }
      return a.label.localeCompare(b.label);
    });

  const allSelected = selectedClusters.length === filteredClusters.length && filteredClusters.length > 0;

  return (
    <div
      className="flex flex-col rounded-2xl"
      style={{
        height: '320px',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(17, 24, 39, 0.10)',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b relative flex-shrink-0"
        style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}
      >
        {/* Gradient Hairline */}
        <div 
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)',
            opacity: 0.5,
          }}
        />
        
        <div className="flex items-center justify-between">
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
            군집 필터
          </h3>
          
          <button
            onClick={() => setSortBy(sortBy === 'size' ? 'label' : 'size')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-black/5 transition-colors"
          >
            <ArrowUpDown className="w-3 h-3" style={{ color: '#64748B' }} />
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>
              {sortBy === 'size' ? '크기순' : '라벨명'}
            </span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#64748B' }} />
          <input
            type="text"
            placeholder="군집 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border transition-colors"
            style={{
              fontSize: '12px',
              fontWeight: 400,
              color: '#0F172A',
              background: 'rgba(255, 255, 255, 0.8)',
              borderColor: 'rgba(17, 24, 39, 0.10)',
            }}
          />
        </div>
      </div>

      {/* Cluster List - Scrollable with fixed max-height */}
      <div className="px-4 py-3 space-y-1.5 flex-1 overflow-y-auto" style={{ maxHeight: '140px' }}>
        {/* Select All */}
        <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-black/5 cursor-pointer transition-colors">
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleToggleAll}
          />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
            전체
          </span>
        </label>

        {/* Cluster Items */}
        {filteredClusters.map((cluster) => (
          <label
            key={cluster.id}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-black/5 cursor-pointer transition-colors"
          >
            <Checkbox
              checked={selectedClusters.includes(cluster.id)}
              onCheckedChange={() => handleToggleCluster(cluster.id)}
            />
            
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: cluster.color }}
            />
            
            <div className="flex-1 flex items-center justify-between min-w-0">
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#0F172A' }}>
                {cluster.label}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748B' }}>
                {cluster.count.toLocaleString()}
              </span>
            </div>
          </label>
        ))}

        {filteredClusters.length === 0 && (
          <div className="text-center py-4">
            <p style={{ fontSize: '11px', fontWeight: 400, color: '#94A3B8' }}>
              검색 결과 없음
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t space-y-2 flex-shrink-0"
        style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}
      >
        <PIButton 
          variant="primary" 
          size="small" 
          onClick={onViewSelected}
          disabled={selectedClusters.length === 0}
          className="w-full"
        >
          이 군집만 보기 ({selectedClusters.length})
        </PIButton>
        
        <PIButton 
          variant="secondary" 
          size="small" 
          onClick={onSendToCompare}
          disabled={selectedClusters.length === 0}
          className="w-full"
        >
          비교 보드로
        </PIButton>
      </div>
    </div>
  );
}
