/**
 * Radar Chart Component
 * 두 클러스터의 주요 특성을 다차원으로 비교하는 라다 차트
 */

import { useMemo, useState } from 'react';
import { ContinuousComparison, BinaryComparison } from './types';
import { prepareRadarData } from './dataPrep';
import { getFeatureNameKR, formatFeatureValue, getClusterColor } from './utils';
import { useDarkMode } from '../../../../lib/DarkModeSystem';

interface PIRadarChartProps {
  data: (ContinuousComparison | BinaryComparison)[];
  groupALabel: string;
  groupBLabel: string;
  maxFeatures?: number;
  showOnlyMeaningful?: boolean;
  clusterAId?: number; // 클러스터 A ID (색상 매칭용)
  clusterBId?: number; // 클러스터 B ID (색상 매칭용)
}

export function PIRadarChart({
  data,
  groupALabel,
  groupBLabel,
  maxFeatures = 8,
  showOnlyMeaningful = true,
  clusterAId,
  clusterBId
}: PIRadarChartProps) {
  const { isDark } = useDarkMode();
  const [hoveredCluster, setHoveredCluster] = useState<'A' | 'B' | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // 툴팁 크기 계산 (텍스트 길이에 따라 동적 조정)
  const tooltipText = hoveredCluster === 'A' ? groupALabel : groupBLabel;
  const tooltipWidth = Math.max(120, tooltipText.length * 8 + 40); // 최소 120px, 텍스트 길이에 따라 조정
  const tooltipHeight = 30;

  // 데이터 준비
  const radarData = useMemo(() => {
    return prepareRadarData(data, maxFeatures, showOnlyMeaningful);
  }, [data, maxFeatures, showOnlyMeaningful]);

  // 정규화를 위한 최대값 계산 (각 변수별로) - early return 전에 호출
  const maxValues = useMemo(() => {
    if (radarData.length === 0) return {};
    const maxes: Record<string, number> = {};
    radarData.forEach(item => {
      const max = Math.max(
        item.type === 'continuous' 
          ? Math.max(item.group_a_mean, item.group_b_mean)
          : Math.max(item.group_a_ratio, item.group_b_ratio),
        1 // 최소값 1로 설정하여 0으로 나누기 방지
      );
      maxes[item.feature] = max;
    });
    return maxes;
  }, [radarData]);

  // 클러스터 색상 결정 (ID가 있으면 해당 색상 사용, 없으면 기본값)
  const clusterAColor = clusterAId !== undefined ? getClusterColor(clusterAId) : '#2563EB';
  const clusterBColor = clusterBId !== undefined ? getClusterColor(clusterBId) : '#8B5CF6';
  
  // 투명도가 적용된 색상 (hex를 rgba로 변환)
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  const clusterAFill = hexToRgba(clusterAColor, 0.2);
  const clusterBFill = hexToRgba(clusterBColor, 0.2);

  // early return은 모든 hooks 호출 후에
  if (radarData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 rounded-xl border" style={{
        background: isDark ? 'rgba(17, 24, 39, 0.5)' : 'rgba(249, 250, 251, 0.8)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.1)',
      }}>
        <p style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
          표시할 데이터가 없습니다.
        </p>
      </div>
    );
  }

  // SVG 크기 설정 (레이블 공간 확보를 위해 크기 증가)
  const size = 500;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 150;
  const numAxes = radarData.length;
  const angleStep = (2 * Math.PI) / numAxes;

  // 각 축의 끝점 계산
  const getAxisPoint = (index: number, value: number, maxValue: number) => {
    const angle = index * angleStep - Math.PI / 2; // 시작점을 위쪽으로
    const normalizedValue = value / maxValue;
    const r = radius * normalizedValue;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      angle
    };
  };

  // 그리드 원 생성
  const gridCircles = [0.25, 0.5, 0.75, 1.0].map(level => (
    <circle
      key={level}
      cx={centerX}
      cy={centerY}
      r={radius * level}
      fill="none"
      stroke={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.1)'}
      strokeWidth="1"
    />
  ));

  // 축 라인 생성
  const axes = radarData.map((item, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const endX = centerX + radius * Math.cos(angle);
    const endY = centerY + radius * Math.sin(angle);
    
    return (
      <line
        key={`axis-${index}`}
        x1={centerX}
        y1={centerY}
        x2={endX}
        y2={endY}
        stroke={isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(17, 24, 39, 0.15)'}
        strokeWidth="1"
      />
    );
  });

  // 클러스터 A 폴리곤 생성
  const clusterAPoints = radarData.map((item, index) => {
    const value = item.type === 'continuous' ? item.group_a_mean : item.group_a_ratio;
    const maxValue = maxValues[item.feature];
    return getAxisPoint(index, value, maxValue);
  });
  const clusterAPath = `M ${clusterAPoints.map(p => `${p.x},${p.y}`).join(' L ')} Z`;

  // 클러스터 B 폴리곤 생성
  const clusterBPoints = radarData.map((item, index) => {
    const value = item.type === 'continuous' ? item.group_b_mean : item.group_b_ratio;
    const maxValue = maxValues[item.feature];
    return getAxisPoint(index, value, maxValue);
  });
  const clusterBPath = `M ${clusterBPoints.map(p => `${p.x},${p.y}`).join(' L ')} Z`;

  // 축 레이블 위치 계산
  const axisLabels = radarData.map((item, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const labelRadius = radius + 50; // 레이블 거리 증가
    const x = centerX + labelRadius * Math.cos(angle);
    const y = centerY + labelRadius * Math.sin(angle);
    const featureName = getFeatureNameKR(item.feature);
    
    // 텍스트 앵커 위치 계산 (각도에 따라 조정)
    // 각도를 0~2π 범위로 정규화
    const normalizedAngle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    
    let textAnchor: 'start' | 'middle' | 'end' = 'middle';
    let rectX = x;
    const textWidth = featureName.length * 7 + 12; // 텍스트 너비 추정
    
    // 12시 방향 (위쪽, -Math.PI/2 = 3*Math.PI/2, 270도)
    // normalizedAngle이 3*Math.PI/2 근처 (±15도 = π/12)
    // 단, 0도 근처는 제외 (3시 방향이므로)
    const isTop = normalizedAngle >= 3 * Math.PI / 2 - Math.PI / 12 && normalizedAngle <= 2 * Math.PI;
    
    // 6시 방향 (아래쪽, Math.PI/2, 90도)
    // normalizedAngle이 Math.PI/2 근처 (±15도)
    const isBottom = normalizedAngle >= Math.PI / 2 - Math.PI / 12 && normalizedAngle <= Math.PI / 2 + Math.PI / 12;
    
    // 3시 방향 (오른쪽, 0도 또는 2*Math.PI)
    const isRight = normalizedAngle <= Math.PI / 12 || normalizedAngle >= 2 * Math.PI - Math.PI / 12;
    
    if (isTop && !isRight) {
      // 12시 방향: 중앙 정렬
      textAnchor = 'middle';
      rectX = x - textWidth / 2;
    } else if (isBottom) {
      // 6시 방향: 중앙 정렬
      textAnchor = 'middle';
      rectX = x - textWidth / 2;
    } else if (normalizedAngle > Math.PI / 2 + Math.PI / 12 && normalizedAngle < 3 * Math.PI / 2 - Math.PI / 12) {
      // 왼쪽 영역 (9시 방향 포함): 오른쪽 정렬
      textAnchor = 'end';
      rectX = x - textWidth;
    } else {
      // 오른쪽 영역 (3시 방향 포함): 왼쪽 정렬
      textAnchor = 'start';
      rectX = x;
    }
    
    return (
      <g key={`label-${index}`}>
        {/* 배경 사각형 (가독성 향상) */}
        <rect
          x={rectX}
          y={y - 10}
          width={textWidth}
          height={20}
          fill={isDark ? 'rgba(17, 24, 39, 0.8)' : 'rgba(249, 250, 251, 0.9)'}
          rx="4"
          opacity="0.9"
        />
        <text
          x={x}
          y={y}
          textAnchor={textAnchor}
          dominantBaseline="middle"
          fill={isDark ? '#D1D5DB' : '#374151'}
          fontSize="12"
          fontWeight="500"
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {featureName}
        </text>
      </g>
    );
  });

  return (
    <div className="space-y-4">
      {/* 차트 */}
      <div className="flex justify-center p-6 rounded-xl border overflow-visible" style={{
        background: isDark ? 'rgba(17, 24, 39, 0.5)' : 'rgba(249, 250, 251, 0.8)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.1)',
      }}>
        <svg 
          width={size} 
          height={size} 
          viewBox={`0 0 ${size} ${size}`}
          style={{ overflow: 'visible' }}
        >
          {/* 그리드 원 */}
          {gridCircles}
          
          {/* 축 라인 */}
          {axes}
          
          {/* 클러스터 B 폴리곤 (뒤에) */}
          <path
            d={clusterBPath}
            fill={clusterBFill}
            stroke={clusterBColor}
            strokeWidth="2"
            opacity={hoveredCluster === 'B' ? 0.8 : 0.6}
            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
            onMouseEnter={(e) => {
              setHoveredCluster('B');
              const rect = e.currentTarget.getBoundingClientRect();
              const svg = e.currentTarget.ownerSVGElement;
              if (svg) {
                const svgRect = svg.getBoundingClientRect();
                setTooltipPosition({
                  x: e.clientX - svgRect.left,
                  y: e.clientY - svgRect.top,
                });
              }
            }}
            onMouseMove={(e) => {
              const svg = e.currentTarget.ownerSVGElement;
              if (svg) {
                const svgRect = svg.getBoundingClientRect();
                setTooltipPosition({
                  x: e.clientX - svgRect.left,
                  y: e.clientY - svgRect.top,
                });
              }
            }}
            onMouseLeave={() => setHoveredCluster(null)}
          >
            <title>{groupBLabel}</title>
          </path>
          
          {/* 클러스터 A 폴리곤 (앞에) */}
          <path
            d={clusterAPath}
            fill={clusterAFill}
            stroke={clusterAColor}
            strokeWidth="2"
            opacity={hoveredCluster === 'A' ? 0.8 : 0.6}
            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
            onMouseEnter={(e) => {
              setHoveredCluster('A');
              const svg = e.currentTarget.ownerSVGElement;
              if (svg) {
                const svgRect = svg.getBoundingClientRect();
                setTooltipPosition({
                  x: e.clientX - svgRect.left,
                  y: e.clientY - svgRect.top,
                });
              }
            }}
            onMouseMove={(e) => {
              const svg = e.currentTarget.ownerSVGElement;
              if (svg) {
                const svgRect = svg.getBoundingClientRect();
                setTooltipPosition({
                  x: e.clientX - svgRect.left,
                  y: e.clientY - svgRect.top,
                });
              }
            }}
            onMouseLeave={() => setHoveredCluster(null)}
          >
            <title>{groupALabel}</title>
          </path>
          
          {/* 호버 툴팁 */}
          {hoveredCluster && (
            <g>
              <rect
                x={tooltipPosition.x - tooltipWidth / 2}
                y={tooltipPosition.y - tooltipHeight - 10}
                width={tooltipWidth}
                height={tooltipHeight}
                fill={isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(31, 41, 55, 0.95)'}
                rx="6"
                style={{
                  filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))',
                  pointerEvents: 'none',
                }}
              />
              <text
                x={tooltipPosition.x}
                y={tooltipPosition.y - tooltipHeight / 2 - 5}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#FFFFFF"
                fontSize="13"
                fontWeight="600"
                style={{ pointerEvents: 'none' }}
              >
                {tooltipText}
              </text>
              <circle
                cx={tooltipPosition.x}
                cy={tooltipPosition.y - tooltipHeight - 5}
                r="4"
                fill={hoveredCluster === 'A' ? clusterAColor : clusterBColor}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          )}
          
          {/* 데이터 포인트 */}
          {clusterAPoints.map((point, index) => {
            const item = radarData[index];
            const value = item.type === 'continuous' ? item.group_a_mean : item.group_a_ratio;
            return (
              <g key={`point-a-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={clusterAColor}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <title>
                  {getFeatureNameKR(item.feature)}: {formatFeatureValue(item.feature, value)}
                </title>
              </g>
            );
          })}
          
          {clusterBPoints.map((point, index) => {
            const item = radarData[index];
            const value = item.type === 'continuous' ? item.group_b_mean : item.group_b_ratio;
            return (
              <g key={`point-b-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={clusterBColor}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <title>
                  {getFeatureNameKR(item.feature)}: {formatFeatureValue(item.feature, value)}
                </title>
              </g>
            );
          })}
          
          {/* 축 레이블 */}
          {axisLabels}
        </svg>
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded"
            style={{ background: clusterAColor }}
          />
          <span style={{ 
            fontSize: '13px', 
            fontWeight: 500,
            color: isDark ? '#D1D5DB' : '#374151'
          }}>
            {groupALabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded"
            style={{ background: clusterBColor }}
          />
          <span style={{ 
            fontSize: '13px', 
            fontWeight: 500,
            color: isDark ? '#D1D5DB' : '#374151'
          }}>
            {groupBLabel}
          </span>
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="mt-4 rounded-lg border overflow-hidden" style={{
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.1)',
      }}>
        <table className="w-full text-sm">
          <thead style={{
            background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(17, 24, 39, 0.02)',
          }}>
            <tr>
              <th className="px-4 py-2 text-left" style={{ color: isDark ? '#D1D5DB' : '#374151' }}>
                변수
              </th>
              <th className="px-4 py-2 text-right" style={{ color: isDark ? '#D1D5DB' : '#374151' }}>
                {groupALabel}
              </th>
              <th className="px-4 py-2 text-right" style={{ color: isDark ? '#D1D5DB' : '#374151' }}>
                {groupBLabel}
              </th>
              <th className="px-4 py-2 text-right" style={{ color: isDark ? '#D1D5DB' : '#374151' }}>
                차이
              </th>
            </tr>
          </thead>
          <tbody>
            {radarData.map((item, index) => {
              const featureName = getFeatureNameKR(item.feature);
              const valueA = item.type === 'continuous' ? item.group_a_mean : item.group_a_ratio;
              const valueB = item.type === 'continuous' ? item.group_b_mean : item.group_b_ratio;
              const diff = item.difference;
              
              return (
                <tr 
                  key={index}
                  style={{
                    borderTop: index > 0 ? (isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(17, 24, 39, 0.05)') : 'none',
                  background: index % 2 === 0 
                    ? (isDark ? 'rgba(255, 255, 255, 0.02)' : 'transparent')
                    : 'transparent',
                  color: isDark ? '#E5E7EB' : '#111827',
                }}
                >
                  <td className="px-4 py-2 font-medium">{featureName}</td>
                  <td className="px-4 py-2 text-right">{formatFeatureValue(item.feature, valueA)}</td>
                  <td className="px-4 py-2 text-right">{formatFeatureValue(item.feature, valueB)}</td>
                  <td className="px-4 py-2 text-right" style={{
                    color: diff > 0 ? '#10B981' : diff < 0 ? '#EF4444' : (isDark ? '#9CA3AF' : '#6B7280'),
                    fontWeight: 600,
                  }}>
                    {diff > 0 ? '+' : ''}{formatFeatureValue(item.feature, diff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
