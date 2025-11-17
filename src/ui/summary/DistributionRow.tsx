import type { SummaryData } from './types';
import { Users, MapPin, Calendar, DollarSign, Briefcase, Home } from 'lucide-react';

interface DistributionRowProps {
  data: SummaryData;
}

export function DistributionRow({ data }: DistributionRowProps) {
  const { 
    femaleRate, 
    regionsTop, 
    ageDistribution,
    incomeDistribution,
    occupationTop,
    educationDistribution,
    householdSizeDistribution,
  } = data;

  const femalePercent = femaleRate != null ? Math.round(femaleRate * 100) : null;
  const malePercent = femalePercent != null ? 100 - femalePercent : null;

  // 연령대 분포 (데이터에서 전달받음)
  const ageGroups = ageDistribution || [
    { label: '10대', count: 0, rate: 0 },
    { label: '20대', count: 0, rate: 0 },
    { label: '30대', count: 0, rate: 0 },
    { label: '40대', count: 0, rate: 0 },
    { label: '50대', count: 0, rate: 0 },
    { label: '60대+', count: 0, rate: 0 },
  ];

  // 도넛 차트를 위한 원주 계산
  const circumference = 2 * Math.PI * 50; // 반지름 50 (더 큰 크기)

  // 성비 도넛 차트
  const genderSegments = femalePercent != null && malePercent != null ? [
    { value: femalePercent, color: '#EC4899', label: '여성' },
    { value: malePercent, color: '#3B82F6', label: '남성' }
  ] : null;

  // 지역 Top-3 도넛 차트
  const regionSegments = regionsTop && regionsTop.length > 0 
    ? regionsTop.slice(0, 3).map((region, index) => ({
        value: region.rate,
        color: index === 0 ? '#3B82F6' : index === 1 ? '#F59E0B' : '#10B981',
        label: region.name,
        count: region.count
      }))
    : null;

  // 연령대 도넛 차트
  const ageSegments = ageGroups.filter(g => g.rate > 0).map((group, index) => {
    const colors = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', '#F5F3FF'];
    return {
      value: group.rate,
      color: colors[index % colors.length],
      label: group.label
    };
  });

  const renderDonutChart = (
    segments: Array<{ value: number; color: string; label: string; count?: number }> | null,
    centerText?: string,
    centerSubtext?: string
  ) => {
    if (!segments || segments.length === 0) {
      return <div className="distribution-empty">데이터 없음</div>;
    }

    const total = segments.reduce((sum, seg) => sum + seg.value, 0);
    let currentOffset = 0;

    return (
      <div className="donut-chart">
        <svg width="160" height="160" viewBox="0 0 120 120" className="donut-svg">
          {/* 배경 원 */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="12"
            opacity="0.15"
          />
          {/* 세그먼트들 */}
          {segments.map((segment, index) => {
            const percentage = total > 0 ? segment.value / total : 0;
            const segmentLength = circumference * percentage;
            const strokeDasharray = `${segmentLength} ${circumference}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += segmentLength;

            return (
              <circle
                key={index}
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={segment.color}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                className="donut-segment"
                style={{ 
                  transition: 'stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                }}
              />
            );
          })}
        </svg>
        <div className="donut-text">
          {centerText && <div className="donut-value">{centerText}</div>}
          {centerSubtext && <div className="donut-label">{centerSubtext}</div>}
        </div>
        <div className="donut-legend">
          {segments.map((segment, index) => (
            <div key={index} className="donut-legend-item">
              <div 
                className="donut-legend-color" 
                style={{ backgroundColor: segment.color }}
              />
              <span className="donut-legend-label">{segment.label}</span>
              <span className="donut-legend-value">{segment.value}%</span>
              {segment.count !== undefined && (
                <span className="donut-legend-count">({segment.count}명)</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 소득 분포 도넛 차트
  const incomeSegments = incomeDistribution && incomeDistribution.length > 0
    ? incomeDistribution.map((item, index) => {
        const colors = ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'];
        return {
          value: item.rate,
          color: colors[index % colors.length],
          label: item.label,
          count: item.count
        };
      })
    : null;

  // 직업 Top-5 도넛 차트
  const occupationSegments = occupationTop && occupationTop.length > 0
    ? occupationTop.slice(0, 5).map((occ, index) => {
        const colors = ['#6366F1', '#818CF8', '#A78BFA', '#C4B5FD', '#DDD6FE'];
        return {
          value: occ.rate,
          color: colors[index % colors.length],
          label: occ.name,
          count: occ.count
        };
      })
    : null;

  // 학력 분포 도넛 차트
  const educationSegments = educationDistribution && educationDistribution.length > 0
    ? educationDistribution.map((edu, index) => {
        const colors = ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7'];
        return {
          value: edu.rate,
          color: colors[index % colors.length],
          label: edu.label,
          count: edu.count
        };
      })
    : null;

  // 가구원 수 분포 도넛 차트
  const householdSizeSegments = householdSizeDistribution && householdSizeDistribution.length > 0
    ? householdSizeDistribution.map((size, index) => {
        const colors = ['#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#FFEDD5'];
        return {
          value: size.rate,
          color: colors[index % colors.length],
          label: size.label,
          count: size.count
        };
      })
    : null;

  return (
    <div className="summary-distribution-row">
      {/* 1. 지역 Top-3 도넛 차트 */}
      <div className="distribution-block distribution-block--region">
        <h6 className="distribution-label">
          <MapPin size={16} strokeWidth={2.5} style={{ marginRight: '6px', color: '#3B82F6' }} />
          지역 Top-3
        </h6>
        {renderDonutChart(regionSegments)}
      </div>

      {/* 2. 직업 Top-5 도넛 차트 */}
      {occupationSegments && (
        <div className="distribution-block distribution-block--occupation">
          <h6 className="distribution-label">
            <Briefcase size={16} strokeWidth={2.5} style={{ marginRight: '6px', color: '#6366F1' }} />
            직업 Top-5
          </h6>
          {renderDonutChart(occupationSegments)}
        </div>
      )}

      {/* 3. 학력 분포 도넛 차트 */}
      {educationSegments && (
        <div className="distribution-block distribution-block--education">
          <h6 className="distribution-label">
            <Briefcase size={16} strokeWidth={2.5} style={{ marginRight: '6px', color: '#F59E0B' }} />
            학력 분포
          </h6>
          {renderDonutChart(educationSegments)}
        </div>
      )}
    </div>
  );
}
