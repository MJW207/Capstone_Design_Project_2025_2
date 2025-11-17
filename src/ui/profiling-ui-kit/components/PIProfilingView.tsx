import { Users, Calendar, User, MapPin, Heart, GraduationCap, Car, Cigarette, Wine } from 'lucide-react';
import { ProfilingData } from '../types';
import { PIProfilingBanner } from './PIProfilingBanner';
import { PIProfilingKPICard } from './PIProfilingKPICard';
import { PIProfilingDistribution } from './PIProfilingDistribution';
import { PIProfilingStats } from './PIProfilingStats';
import { PIProfilingFooter } from './PIProfilingFooter';
import { PIProfilingEmptyState } from './PIProfilingEmptyState';
import { PIProfilingLoadingState } from './PIProfilingLoadingState';

interface PIProfilingViewProps {
  data: ProfilingData | null;
  minimumRequired?: number;
  loading?: boolean;
}

// Variable name mappings
const variableLabels: Record<string, { label: string; icon: any }> = {
  'Q1_label_distribution': { label: '결혼 상태', icon: Heart },
  'Q4_label_distribution': { label: '학력', icon: GraduationCap },
  'Q6_category_distribution': { label: '소득 수준', icon: MapPin },
  'Q10_label_distribution': { label: '차량 보유', icon: Car },
  'Q12_distribution': { label: '흡연 경험', icon: Cigarette },
  'drinking_distribution': { label: '음주 경험', icon: Wine },
  'age_group_distribution': { label: '연령대', icon: Calendar },
  'gender_distribution': { label: '성별', icon: User },
  'region_lvl1_distribution': { label: '지역 (시도)', icon: MapPin },
  'region_lvl2_distribution': { label: '지역 (시군구)', icon: MapPin },
};

export function PIProfilingView({ 
  data, 
  minimumRequired = 100,
  loading = false,
}: PIProfilingViewProps) {
  // Loading state
  if (loading) {
    return <PIProfilingLoadingState />;
  }

  // Empty state
  if (!data || data.count === 0) {
    return <PIProfilingEmptyState />;
  }

  // Prepare KPI data
  const kpiData = [
    {
      icon: Users,
      label: '분석 대상',
      value: `${data.count.toLocaleString()}명`,
      color: '#2563EB',
    },
    ...(data.age_mean !== undefined ? [{
      icon: Calendar,
      label: '평균 연령',
      value: `${data.age_mean.toFixed(1)}세`,
      subtitle: data.age_std !== undefined ? `표준편차 ±${data.age_std.toFixed(1)}세` : undefined,
      color: '#7C3AED',
    }] : []),
  ];

  // Add gender KPI if available
  if (data.gender_distribution) {
    const genderEntries = Object.entries(data.gender_distribution);
    const genderText = genderEntries
      .map(([key, value]) => {
        const label = key === 'M' ? '남성' : key === 'F' ? '여성' : key;
        const pct = ((value / data.count) * 100).toFixed(0);
        return `${label} ${pct}%`;
      })
      .join(' / ');
    
    kpiData.push({
      icon: User,
      label: '성별 분포',
      value: <span style={{ fontSize: '18px' }}>{genderText}</span>,
      color: '#DB2777',
    });
  }

  // Add top region KPI if available
  if (data.region_lvl1_distribution) {
    const regions = Object.entries(data.region_lvl1_distribution)
      .sort(([, a], [, b]) => b - a);
    
    if (regions.length > 0) {
      const [topRegion, topCount] = regions[0];
      const pct = ((topCount / data.count) * 100).toFixed(1);
      
      kpiData.push({
        icon: MapPin,
        label: '주요 지역',
        value: topRegion,
        subtitle: `${topCount}명 (${pct}%)`,
        color: '#16A34A',
      });
    }
  }

  // Prepare categorical distributions
  const categoricalDistributions: Array<{ key: string; title: string; data: any[] }> = [];

  // Process each categorical variable
  Object.keys(variableLabels).forEach((key) => {
    const dist = (data as any)[key];
    if (dist && typeof dist === 'object') {
      const entries = Object.entries(dist).map(([label, value]) => ({
        label,
        value: value as number,
      }));

      if (entries.length > 0) {
        categoricalDistributions.push({
          key,
          title: variableLabels[key].label,
          data: entries,
        });
      }
    }
  });

  // Add custom categorical distributions
  if (data.categorical_distributions) {
    Object.entries(data.categorical_distributions).forEach(([key, dist]) => {
      const entries = Object.entries(dist).map(([label, value]) => ({
        label,
        value,
      }));

      if (entries.length > 0) {
        categoricalDistributions.push({
          key,
          title: key,
          data: entries,
        });
      }
    });
  }

  // Prepare continuous stats
  const continuousStats = [];
  if (data.age_mean !== undefined) {
    continuousStats.push({
      label: '연령',
      mean: data.age_mean,
      std: data.age_std,
      min: data.age_min,
      max: data.age_max,
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Banner */}
      <div className="animate-in slide-in-from-top duration-300">
        <PIProfilingBanner 
          sampleCount={data.count}
          minimumRequired={minimumRequired}
          variant="warning"
        />
      </div>

      {/* KPI Cards */}
      <div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom duration-500"
        style={{ animationDelay: '100ms' }}
      >
        {kpiData.map((kpi, index) => (
          <div
            key={index}
            style={{
              animation: `fadeIn 0.5s ease-out ${0.15 + index * 0.05}s both`,
            }}
          >
            <PIProfilingKPICard {...kpi} />
          </div>
        ))}
      </div>

      {/* Distributions Grid */}
      {categoricalDistributions.length > 0 && (
        <div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in slide-in-from-bottom duration-500"
          style={{ animationDelay: '200ms' }}
        >
          {categoricalDistributions.map((dist, index) => (
            <div
              key={dist.key}
              style={{
                animation: `fadeIn 0.5s ease-out ${0.3 + index * 0.05}s both`,
              }}
            >
              <PIProfilingDistribution
                title={dist.title}
                data={dist.data}
                totalCount={data.count}
              />
            </div>
          ))}
        </div>
      )}

      {/* Continuous Stats */}
      {continuousStats.length > 0 && (
        <div 
          className="animate-in slide-in-from-bottom duration-500"
          style={{ animationDelay: '400ms' }}
        >
          <PIProfilingStats stats={continuousStats} />
        </div>
      )}

      {/* Footer */}
      <div 
        className="animate-in slide-in-from-bottom duration-500"
        style={{ animationDelay: '500ms' }}
      >
        <PIProfilingFooter />
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slideInFromTop {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slideInFromBottom {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}
