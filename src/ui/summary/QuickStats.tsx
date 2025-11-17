import React from 'react';
import type { SummaryData } from './types';
import { Calendar, MapPin, Users, DollarSign, Briefcase, Heart } from 'lucide-react';

interface QuickStatsProps {
  data: SummaryData;
}

export function QuickStats({ data }: QuickStatsProps) {
  const { 
    total, 
    qCount, 
    avgAge, 
    femaleRate, 
    regionsTop,
    avgPersonalIncome,
    avgHouseholdIncome,
    occupationTop,
    marriedRate,
    avgChildrenCount,
  } = data;

  const qCoverage = total > 0 ? Math.round((qCount / total) * 100) : 0;
  const topRegion = regionsTop && regionsTop.length > 0 ? regionsTop[0] : null;
  const femalePercent = femaleRate != null ? Math.round(femaleRate * 100) : null;
  const malePercent = femalePercent != null ? 100 - femalePercent : null;
  const topOccupation = occupationTop && occupationTop.length > 0 ? occupationTop[0] : null;
  const marriedPercent = marriedRate != null ? Math.round(marriedRate * 100) : null;

  // 지역 Top-5 (주요 지역 + 하위 4개)
  const topRegions = regionsTop && regionsTop.length > 0 ? regionsTop.slice(0, 5) : [];
  const regionListText = topRegions.length > 0 
    ? topRegions.map((r, idx) => idx === 0 ? `${r.name} ${r.rate}%` : `${r.name} ${r.rate}%`).join(', ')
    : '-';

  const stats = [
    {
      icon: Calendar,
      label: '평균 연령',
      value: avgAge != null ? `${avgAge}세` : '-',
      gradient: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
      bgColor: 'rgba(59, 130, 246, 0.08)',
      iconColor: '#3B82F6',
    },
    {
      icon: MapPin,
      label: '주요 지역',
      value: topRegion ? topRegion.name : '-',
      subValue: topRegions.length > 1 ? topRegions.slice(1).map(r => `${r.name} ${r.rate}%`).join(', ') : '',
      gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
      bgColor: 'rgba(245, 158, 11, 0.08)',
      iconColor: '#F59E0B',
    },
    {
      icon: Users,
      label: '성비',
      value: femalePercent != null ? `${femalePercent}:${malePercent}` : '-',
      subValue: femalePercent != null ? `여${femalePercent}%` : '',
      gradient: 'linear-gradient(135deg, #EC4899, #F43F5E)',
      bgColor: 'rgba(236, 72, 153, 0.08)',
      iconColor: '#EC4899',
    },
    // 신규 추가
    ...(avgPersonalIncome || avgHouseholdIncome ? [{
      icon: DollarSign,
      label: '평균 소득',
      value: avgPersonalIncome ? `${avgPersonalIncome}만원` : avgHouseholdIncome ? `${avgHouseholdIncome}만원` : '-',
      subValue: avgPersonalIncome ? '개인' : avgHouseholdIncome ? '가구' : '',
      gradient: 'linear-gradient(135deg, #10B981, #059669)',
      bgColor: 'rgba(16, 185, 129, 0.08)',
      iconColor: '#10B981',
    }] : []),
    ...(topOccupation ? [{
      icon: Briefcase,
      label: '주요 직업',
      value: topOccupation.name,
      subValue: `${topOccupation.rate}%`,
      gradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
      bgColor: 'rgba(99, 102, 241, 0.08)',
      iconColor: '#6366F1',
    }] : []),
    ...(marriedPercent != null ? [{
      icon: Heart,
      label: '기혼 비율',
      value: `${marriedPercent}%`,
      subValue: avgChildrenCount != null ? `자녀 ${avgChildrenCount}명` : '',
      gradient: 'linear-gradient(135deg, #F97316, #EA580C)',
      bgColor: 'rgba(249, 115, 22, 0.08)',
      iconColor: '#F97316',
    }] : []),
  ];

  return (
    <div className="quick-stats">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="quick-stat-card"
            style={{ backgroundColor: stat.bgColor }}
          >
            <div className="quick-stat-icon-wrapper">
              <div
                className="quick-stat-icon"
                style={{ color: stat.iconColor }}
              >
                <Icon size={20} strokeWidth={2.5} />
              </div>
            </div>
            <div className="quick-stat-content">
              <div className="quick-stat-label">{stat.label}</div>
              <div className="quick-stat-value" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.3' }}>{stat.value}</div>
              {stat.subValue && (
                <div className="quick-stat-sub" style={{ fontSize: '11px', lineHeight: '1.4', marginTop: '2px' }}>{stat.subValue}</div>
              )}
            </div>
            <div
              className="quick-stat-gradient"
              style={{ background: stat.gradient }}
            />
          </div>
        );
      })}
    </div>
  );
}

