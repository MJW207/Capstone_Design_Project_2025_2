import { CategoricalComparison } from './types';
import { getFeatureDisplayName, getCategoryValueKR } from './utils';
import { useDarkMode } from '../../../../lib/DarkModeSystem';

interface PIStackedBarChartProps {
  data: CategoricalComparison[];
  clusterLabels: string[];
}

export function PIStackedBarChart({ data, clusterLabels }: PIStackedBarChartProps) {
  const { isDark } = useDarkMode();
  const colors = [
    '#2563EB', '#7C3AED', '#16A34A', '#F59E0B', '#EC4899',
    '#10B981', '#F97316', '#8B5CF6', '#06B6D4', '#EF4444'
  ];

  if (data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 rounded-2xl"
        style={{
          background: isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(16px)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(17, 24, 39, 0.10)',
          boxShadow: isDark ? '0 6px 16px rgba(0, 0, 0, 0.3)' : '0 6px 16px rgba(0, 0, 0, 0.08)',
        }}
      >
        <p style={{ 
          fontSize: '13px', 
          fontWeight: 400, 
          color: isDark ? '#9CA3AF' : '#94A3B8',
        }}>
          범주형 변수 데이터가 없습니다
        </p>
      </div>
    );
  }

  // 전달받은 데이터를 그대로 사용 (이미 필터링 및 정렬 완료)
  // prepareStackedBarData를 호출하지 않음 (사용자가 선택한 변수를 유지하기 위해)
  const filteredData = data;
  
  if (filteredData.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 rounded-2xl"
        style={{
          background: isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(16px)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(17, 24, 39, 0.10)',
          boxShadow: isDark ? '0 6px 16px rgba(0, 0, 0, 0.3)' : '0 6px 16px rgba(0, 0, 0, 0.08)',
        }}
      >
        <p style={{ 
          fontSize: '13px', 
          fontWeight: 400, 
          color: isDark ? '#9CA3AF' : '#94A3B8',
        }}>
          범주형 변수 데이터가 없습니다
        </p>
      </div>
    );
  }
  
  const getTextColor = (bgColor: string) => {
    // Simple luminance check
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#0F172A' : '#FFFFFF';
  };

  // 각 변수별로 스택바 렌더링
  const renderStackedBar = (feature: CategoricalComparison, featureIdx: number) => {
    // null/undefined 체크 추가
    if (!feature.group_a_distribution || !feature.group_b_distribution) {
      console.warn(`[PIStackedBarChart] 범주형 변수 데이터 누락: ${feature.feature}`, {
        feature,
        hasGroupA: !!feature.group_a_distribution,
        hasGroupB: !!feature.group_b_distribution,
      });
      return null;
    }
    
    // Get all unique categories (원본 키)
    const allCategoryKeys = Array.from(new Set([
      ...Object.keys(feature.group_a_distribution || {}),
      ...Object.keys(feature.group_b_distribution || {})
    ]));
    
    // 한글 변환된 카테고리명 (표시용)
    const allCategories = allCategoryKeys.map(cat => getCategoryValueKR(feature.feature, cat) || cat);

    // Assign colors to categories (원본 키로 매핑)
    const categoryColors: Record<string, string> = {};
    allCategoryKeys.forEach((cat, idx) => {
      categoryColors[cat] = colors[idx % colors.length];
    });
    
    // 원본 키 → 한글명 매핑
    const categoryKeyToKR: Record<string, string> = {};
    allCategoryKeys.forEach((key, idx) => {
      categoryKeyToKR[key] = allCategories[idx];
    });

    // Prepare data for both clusters (원본 키 사용)
    const clusters = [
      { 
        label: clusterLabels[0], 
        distribution: feature.group_a_distribution 
      },
      { 
        label: clusterLabels[1], 
        distribution: feature.group_b_distribution 
      }
    ];

    return (
      <div key={featureIdx} className="mb-10">
        {/* Feature Header */}
        <div className="mb-6">
          <h4 style={{ 
            fontSize: '15px', 
            fontWeight: 600, 
            color: isDark ? '#F9FAFB' : '#0F172A',
            marginBottom: '4px',
          }}>
            {getFeatureDisplayName(feature.feature, (feature as any).feature_name_kr)}
          </h4>
          <p style={{ 
            fontSize: '12px', 
            fontWeight: 400, 
            color: isDark ? '#D1D5DB' : '#64748B',
          }}>
            클러스터별 카테고리 구성 비율
          </p>
        </div>

        {/* Stacked Bars */}
        <div className="space-y-6">
          {clusters.map((cluster, clusterIdx) => (
            <div key={clusterIdx}>
              {/* Cluster Label */}
              <div className="flex items-center justify-between mb-3">
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: isDark ? '#F9FAFB' : '#0F172A',
                }}>
                  {cluster.label}
                </span>
              </div>

              {/* Stacked Bar */}
              <div 
                className="flex rounded-xl overflow-hidden"
                style={{
                  height: '72px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                }}
              >
                {allCategoryKeys.map((categoryKey, catIdx) => {
                  const value = cluster.distribution[categoryKey] || 0;
                  const percentage = value * 100;
                  const categoryKR = categoryKeyToKR[categoryKey] || categoryKey;
                  
                  if (percentage < 1) return null; // Skip very small values

                  return (
                    <div
                      key={catIdx}
                      className="flex items-center justify-center transition-all duration-200 hover:brightness-110 cursor-pointer"
                      style={{
                        width: `${percentage}%`,
                        background: categoryColors[categoryKey],
                        position: 'relative',
                      }}
                      title={`${categoryKR}: ${percentage.toFixed(1)}%`}
                    >
                      {percentage >= 5 && (
                        <div className="text-center px-2">
                          <div style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: getTextColor(categoryColors[categoryKey]),
                            marginBottom: '2px',
                          }}>
                            {categoryKR}
                          </div>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: getTextColor(categoryColors[categoryKey]),
                          }}>
                            {percentage.toFixed(0)}%
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.08)' }}>
          <div className="flex flex-wrap gap-4">
            {allCategoryKeys.map((categoryKey, idx) => {
              const categoryKR = categoryKeyToKR[categoryKey] || categoryKey;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ background: categoryColors[categoryKey] }}
                  />
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 500, 
                    color: isDark ? '#D1D5DB' : '#64748B',
                  }}>
                    {categoryKR}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
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
      <div className="mb-8">
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          color: isDark ? '#F9FAFB' : '#0F172A',
          marginBottom: '6px',
        }}>
          범주형 변수 분포 (100% 스택)
        </h3>
        <p style={{ 
          fontSize: '12px', 
          fontWeight: 400, 
          color: isDark ? '#D1D5DB' : '#64748B',
        }}>
          {filteredData.length}개 변수
        </p>
      </div>

      {/* Multiple Stacked Bars */}
      <div>
        {filteredData.map((feature, idx) => renderStackedBar(feature, idx))}
      </div>
    </div>
  );
}
