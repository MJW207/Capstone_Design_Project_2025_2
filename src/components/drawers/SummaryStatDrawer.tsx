import { useMemo } from 'react';
import { X, MapPin, Car, Smartphone, Briefcase, DollarSign } from 'lucide-react';
import type { SummaryProfileChip } from '../../ui/summary/SummaryBarNew';
import type { Panel } from '../../utils/statistics';
import {
  calculateRegionDistribution,
  calculateCarOwnership,
  calculatePhoneBrandDistribution,
  calculateOccupationDistribution,
  calculateIncomeDistribution,
} from '../../utils/statistics';
import { RegionBarChart } from '../charts/RegionBarChart';
import { CarBarChart } from '../charts/CarDonutChart';
import { PhoneBarChart } from '../charts/PhoneBarChart';
import { OccupationBarChart } from '../charts/OccupationBarChart';
import { IncomeBarChart } from '../charts/IncomeBarChart';

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
  // 칩 타입별 아이콘 및 제목 매핑
  const chipConfig = useMemo(() => {
    if (!chip) return null;

    const configs: Record<string, { icon: typeof MapPin; title: string }> = {
      region: { icon: MapPin, title: '주요지역 분포' },
      car: { icon: Car, title: '차량 브랜드 분포' },
      phone: { icon: Smartphone, title: '스마트폰 브랜드 분포' },
      job: { icon: Briefcase, title: '주요 직업 분포' },
      income: { icon: DollarSign, title: '소득 분포' },
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
        className="fixed right-0 top-0 h-full w-[480px] drawer-content z-50 flex flex-col animate-in slide-in-from-right duration-[var(--duration-base)]"
        style={{
          background: 'var(--surface-1)',
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-3)',
        }}
      >
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
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {!chartData || !chartData.data || chartData.data.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              데이터가 없습니다.
            </div>
          ) : (
            <div className="space-y-6">
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}

