import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { BinaryComparison } from './types';
import { getFeatureDisplayName } from './utils';
import { prepareBinaryHeatmapData } from './dataPrep';
import { BINARY_HEATMAP_GROUPS } from './featureSets';
import { useDarkMode } from '../../../../lib/DarkModeSystem';

interface PIBinaryHeatmapProps {
  data: BinaryComparison[];
  clusterLabels: string[];
  maxFeatures?: number;
  showOnlyMeaningful?: boolean;
}

// 그룹 이름 한글 매핑
const GROUP_NAMES: Record<keyof typeof BINARY_HEATMAP_GROUPS, string> = {
  demographic: '인구·사회',
  drinking: '음주',
  smoking: '흡연',
  digital: '디지털/브랜드',
  vehicle: '차량',
  region: '지역',
};

export function PIBinaryHeatmap({ 
  data, 
  clusterLabels,
  maxFeatures = 12,
  showOnlyMeaningful = true
}: PIBinaryHeatmapProps) {
  const { isDark } = useDarkMode();
  const [expandedGroups, setExpandedGroups] = useState<Set<keyof typeof BINARY_HEATMAP_GROUPS>>(
    new Set(['demographic', 'drinking', 'smoking', 'digital', 'vehicle', 'region'])
  );
  
  // 새로운 데이터 준비 함수 사용
  const preparedData = prepareBinaryHeatmapData(data);
  
  // "의미 있는 차이만 보기" 필터링
  const filteredData = showOnlyMeaningful
    ? preparedData.filter(item => {
        const absDiff = Math.abs(item.abs_diff_pct ?? 0);
        const absLift = Math.abs(item.lift_pct ?? 0);
        return absDiff >= 3 || absLift >= 20;
      })
    : preparedData;
  
  // 그룹별로 데이터 분류
  const groupedData = useMemo(() => {
    const groups: Record<string, BinaryComparison[]> = {};
    const ungrouped: BinaryComparison[] = [];
    
    // 모든 그룹의 변수 목록 (타입 안전하게)
    const allGroupFeatures: string[] = [];
    Object.values(BINARY_HEATMAP_GROUPS).forEach(features => {
      allGroupFeatures.push(...(features as readonly string[]));
    });
    
    // 각 그룹에 속한 변수 찾기
    Object.entries(BINARY_HEATMAP_GROUPS).forEach(([groupKey, features]) => {
      const featureList = features as readonly string[];
      groups[groupKey] = filteredData.filter(item => 
        featureList.includes(item.feature)
      );
    });
    
    // 그룹에 속하지 않은 변수
    ungrouped.push(...filteredData.filter(item => 
      !allGroupFeatures.includes(item.feature)
    ));
    
    return { groups, ungrouped };
  }, [filteredData]);
  
  const toggleGroup = (groupKey: keyof typeof BINARY_HEATMAP_GROUPS) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // 데이터가 없으면 빈 상태 표시 (정말 데이터가 전혀 없는 경우만)
  if (filteredData.length === 0) {
    return (
      <div
        className="flex flex-col p-6 rounded-2xl relative"
        style={{
          background: isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(16px)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(17, 24, 39, 0.10)',
          boxShadow: isDark ? '0 6px 16px rgba(0, 0, 0, 0.3)' : '0 6px 16px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div className="text-center py-12">
          <p style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#D1D5DB' : '#64748B' }}>
            비교 데이터가 없습니다.
          </p>
        </div>
      </div>
    );
  }

  // Get color for value (0-1 range)
  const getColor = (value: number) => {
    // Blue-White-Red scale (RdYlBu_r reversed)
    if (value < 0.33) {
      const intensity = Math.round((value / 0.33) * 255);
      return `rgb(${255 - intensity * 0.3}, ${255 - intensity * 0.5}, 255)`;
    } else if (value < 0.67) {
      const t = (value - 0.33) / 0.34;
      return `rgb(${Math.round(255 - t * 100)}, ${Math.round(255 - t * 50)}, ${Math.round(255 - t * 100)})`;
    } else {
      const intensity = Math.round(((value - 0.67) / 0.33) * 255);
      return `rgb(255, ${255 - intensity * 0.6}, ${255 - intensity * 0.8})`;
    }
  };

  const getTextColor = (value: number) => {
    return value > 0.5 ? '#FFFFFF' : '#0F172A';
  };

  return (
    <div
      className="flex flex-col p-6 rounded-2xl relative"
      style={{
        background: isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(17, 24, 39, 0.10)',
        boxShadow: isDark ? '0 6px 16px rgba(0, 0, 0, 0.3)' : '0 6px 16px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Gradient Hairline */}
      <div 
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{
          background: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)',
          opacity: 0.5,
        }}
      />

      {/* Header */}
      <div className="mb-6">
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          color: isDark ? '#F9FAFB' : '#0F172A',
          marginBottom: '6px',
        }}>
          이진 변수 비율 히트맵
        </h3>
        <p style={{ 
          fontSize: '12px', 
          fontWeight: 400, 
          color: isDark ? '#D1D5DB' : '#64748B',
        }}>
          각 클러스터에서 이진 변수의 평균 비율 (0%~100%)
        </p>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: '600px' }}>
          {/* Column Headers */}
          <div className="flex items-end mb-3" style={{ marginLeft: '180px' }}>
            {clusterLabels.map((label, idx) => (
              <div 
                key={idx}
                className="flex-1 text-center"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isDark ? '#D1D5DB' : '#64748B',
                  minWidth: '100px',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* 그룹별 Rows */}
          {Object.keys(BINARY_HEATMAP_GROUPS).map((groupKey) => {
            const groupItems = groupedData.groups[groupKey] || [];
            if (groupItems.length === 0) return null;
            
            const isExpanded = expandedGroups.has(groupKey as keyof typeof BINARY_HEATMAP_GROUPS);
            
            return (
              <div key={groupKey} className="mb-4">
                {/* 그룹 헤더 */}
                <button
                  onClick={() => toggleGroup(groupKey as keyof typeof BINARY_HEATMAP_GROUPS)}
                  className="flex items-center gap-2 mb-2 p-2 rounded-lg hover:bg-black/5 transition-colors w-full text-left"
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(17, 24, 39, 0.05)',
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown size={16} color={isDark ? '#D1D5DB' : '#64748B'} />
                  ) : (
                    <ChevronRight size={16} color={isDark ? '#D1D5DB' : '#64748B'} />
                  )}
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isDark ? '#F9FAFB' : '#0F172A',
                  }}>
                    {GROUP_NAMES[groupKey as keyof typeof BINARY_HEATMAP_GROUPS]} ({groupItems.length}개)
                  </span>
                </button>
                
                {/* 그룹 내 변수들 */}
                {isExpanded && groupItems.map((item, rowIdx) => (
                  <div 
                    key={`${groupKey}-${rowIdx}`} 
                    className="flex items-center mb-2 group"
                    style={{ marginLeft: '24px' }}
                  >
                    {/* Row Label */}
                    <div 
                      style={{
                        width: '180px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: isDark ? '#F9FAFB' : '#0F172A',
                        paddingRight: '16px',
                        textAlign: 'right',
                      }}
                    >
                      {getFeatureDisplayName(item.feature, (item as any).feature_name_kr)}
                    </div>

                    {/* Cells */}
                    <div className="flex-1 flex gap-2">
                      {[item.group_a_ratio, item.group_b_ratio].map((value, colIdx) => (
                        <div
                          key={colIdx}
                          className="flex-1 transition-all duration-200 hover:scale-105 cursor-pointer"
                          style={{
                            background: getColor(value),
                            minWidth: '100px',
                            height: '48px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                          }}
                          title={`${clusterLabels[colIdx]}: ${(value * 100).toFixed(1)}%`}
                        >
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: getTextColor(value),
                          }}>
                            {(value * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          
          {/* 그룹에 속하지 않은 변수들 */}
          {groupedData.ungrouped.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 p-2" style={{
                fontSize: '14px',
                fontWeight: 600,
                color: isDark ? '#F9FAFB' : '#0F172A',
              }}>
                기타 ({groupedData.ungrouped.length}개)
              </div>
              {groupedData.ungrouped.map((item, rowIdx) => (
                <div 
                  key={`ungrouped-${rowIdx}`} 
                  className="flex items-center mb-2 group"
                  style={{ marginLeft: '24px' }}
                >
                  <div 
                    style={{
                      width: '180px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: isDark ? '#F9FAFB' : '#0F172A',
                      paddingRight: '16px',
                      textAlign: 'right',
                    }}
                  >
                    {getFeatureDisplayName(item.feature, (item as any).feature_name_kr)}
                  </div>
                  <div className="flex-1 flex gap-2">
                    {[item.group_a_ratio, item.group_b_ratio].map((value, colIdx) => (
                      <div
                        key={colIdx}
                        className="flex-1 transition-all duration-200 hover:scale-105 cursor-pointer"
                        style={{
                          background: getColor(value),
                          minWidth: '100px',
                          height: '48px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        }}
                        title={`${clusterLabels[colIdx]}: ${(value * 100).toFixed(1)}%`}
                      >
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: getTextColor(value),
                        }}>
                          {(value * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.08)' }}>
        <div className="flex items-center gap-4">
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 500, 
            color: isDark ? '#D1D5DB' : '#64748B',
          }}>
            범례:
          </span>
          <div className="flex items-center gap-2">
            <div 
              style={{
                width: '120px',
                height: '20px',
                borderRadius: '4px',
                background: 'linear-gradient(90deg, rgb(200, 220, 255) 0%, rgb(255, 255, 255) 50%, rgb(255, 200, 180) 100%)',
              }}
            />
            <div className="flex items-center gap-4" style={{ fontSize: '10px', color: isDark ? '#D1D5DB' : '#64748B' }}>
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredData.length === 0 && (
        <div className="text-center py-12">
          <p style={{ 
            fontSize: '13px', 
            fontWeight: 400, 
            color: isDark ? '#9CA3AF' : '#94A3B8',
          }}>
            이진 변수 데이터가 없습니다
          </p>
        </div>
      )}
    </div>
  );
}
