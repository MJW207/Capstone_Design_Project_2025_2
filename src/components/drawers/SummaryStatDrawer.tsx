import { useMemo, useState, useEffect, useRef } from 'react';
import { X, MapPin, Car, Smartphone, Briefcase, DollarSign, Calendar, Heart, GripVertical } from 'lucide-react';
import type { SummaryProfileChip } from '../../ui/summary/SummaryBarNew';
import type { Panel } from '../../utils/statistics';
import {
  calculateRegionDistribution,
  calculateCarOwnership,
  calculatePhoneBrandDistribution,
  calculateOccupationDistribution,
  calculateIncomeDistribution,
  calculateAgeDistribution,
  calculateChildrenDistribution,
} from '../../utils/statistics';
import { RegionBarChart } from '../charts/RegionBarChart';
import { CarBarChart } from '../charts/CarDonutChart';
import { PhoneBarChart } from '../charts/PhoneBarChart';
import { OccupationBarChart } from '../charts/OccupationBarChart';
import { IncomeBarChart } from '../charts/IncomeBarChart';
import { AgeBarChart } from '../charts/AgeBarChart';
import { ChildrenBarChart } from '../charts/ChildrenBarChart';

interface SummaryStatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chip: SummaryProfileChip | null;
  allSearchResults: Panel[];
}

export function SummaryStatDrawer({
  isOpen,
  onClose,
  chip,
  allSearchResults,
}: SummaryStatDrawerProps) {
  // Drawer 리사이즈 상태 (기본값: 최대 크기)
  const [drawerWidth, setDrawerWidth] = useState(1200);
  const [isResizing, setIsResizing] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // 리사이즈 핸들러
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!drawerRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      // 최소/최대 너비 제한
      const minWidth = 400;
      const maxWidth = 1200;
      setDrawerWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // 칩 타입별 아이콘 및 제목 매핑
  const chipConfig = useMemo(() => {
    if (!chip) return null;

    const configs: Record<string, { icon: typeof MapPin; title: string }> = {
      region: { icon: MapPin, title: '주요지역 분포' },
      car: { icon: Car, title: '차량 브랜드 분포' },
      phone: { icon: Smartphone, title: '스마트폰 브랜드 분포' },
      job: { icon: Briefcase, title: '주요 직업 분포' },
      income: { icon: DollarSign, title: '소득 분포' },
      age: { icon: Calendar, title: '연령 분포' },
      marriage: { icon: Heart, title: '기혼인 사람의 자녀 분포' },
    };

    return configs[chip.key] || null;
  }, [chip]);

  // 통계 데이터 계산
  const chartData = useMemo(() => {
    if (!chip || !allSearchResults || allSearchResults.length === 0) {
      return null;
    }

    switch (chip.key) {
      case 'region':
        return {
          type: 'region' as const,
          data: calculateRegionDistribution(allSearchResults),
          totalCount: allSearchResults.length,
        };
      case 'car':
        return {
          type: 'car' as const,
          data: calculateCarOwnership(allSearchResults),
          totalCount: allSearchResults.length,
        };
      case 'phone':
        return {
          type: 'phone' as const,
          data: calculatePhoneBrandDistribution(allSearchResults),
          totalCount: allSearchResults.length,
        };
      case 'job':
        return {
          type: 'occupation' as const,
          data: calculateOccupationDistribution(allSearchResults),
          totalCount: allSearchResults.length,
        };
      case 'income':
        return {
          type: 'income' as const,
          data: calculateIncomeDistribution(allSearchResults),
          totalCount: allSearchResults.length,
        };
      case 'age':
        return {
          type: 'age' as const,
          data: calculateAgeDistribution(allSearchResults),
          totalCount: allSearchResults.length,
        };
      case 'marriage':
        return {
          type: 'children' as const,
          data: calculateChildrenDistribution(allSearchResults),
          totalCount: allSearchResults.length,
        };
      default:
        return null;
    }
  }, [chip, allSearchResults]);

  if (!isOpen || !chip || !chipConfig) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        style={{ backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 h-full drawer-content z-50 flex flex-col animate-in slide-in-from-right duration-[var(--duration-base)]"
        style={{
          width: `${drawerWidth}px`,
          background: 'var(--surface-1)',
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-3)',
        }}
      >
        {/* 리사이즈 핸들 - 넓은 클릭 영역 */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 group"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          style={{
            background: isResizing ? 'var(--brand-blue-500)' : 'transparent',
          }}
        >
          {/* 호버 시 시각적 피드백을 위한 배경 */}
          <div 
            className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/30 transition-colors"
            style={{
              background: isResizing ? 'var(--brand-blue-500)' : undefined,
            }}
          />
          {/* 그립 아이콘 */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <GripVertical className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
          </div>
        </div>
        {/* Header */}
        <div
          className="relative px-6 py-5 border-b drawer-header"
          style={{
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--brand-blue-500)] to-transparent opacity-50" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <chipConfig.icon className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {chipConfig.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="btn--ghost p-2 rounded-lg transition-fast"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col min-h-0">
          {!chartData || !chartData.data || chartData.data.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              데이터가 없습니다.
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              {/* 그래프 렌더링 */}
              {chartData.type === 'region' && (
                <RegionBarChart data={chartData.data} totalCount={chartData.totalCount} />
              )}
              {chartData.type === 'car' && (
                <CarBarChart data={chartData.data} totalCount={chartData.totalCount} />
              )}
              {chartData.type === 'phone' && (
                <PhoneBarChart data={chartData.data} totalCount={chartData.totalCount} />
              )}
              {chartData.type === 'occupation' && (
                <OccupationBarChart data={chartData.data} totalCount={chartData.totalCount} />
              )}
              {chartData.type === 'income' && (
                <IncomeBarChart data={chartData.data} totalCount={chartData.totalCount} />
              )}
              {chartData.type === 'age' && (
                <AgeBarChart data={chartData.data} totalCount={chartData.totalCount} />
              )}
              {chartData.type === 'children' && (
                <ChildrenBarChart data={chartData.data} totalCount={chartData.totalCount} />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

