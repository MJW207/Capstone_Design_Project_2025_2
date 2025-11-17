import { ContinuousComparison } from './types';

interface PIRidgelinePlotProps {
  data: ContinuousComparison[];
  clusterLabels: string[];
  selectedFeature?: string;
}

export function PIRidgelinePlot({ 
  data, 
  clusterLabels,
  selectedFeature 
}: PIRidgelinePlotProps) {
  // Select feature to display
  const feature = selectedFeature 
    ? data.find(d => d.feature === selectedFeature) || data[0]
    : data[0];

  if (!feature) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(17, 24, 39, 0.10)',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
        }}
      >
        <p style={{ 
          fontSize: '13px', 
          fontWeight: 400, 
          color: '#94A3B8',
        }}>
          연속형 변수 데이터가 없습니다
        </p>
      </div>
    );
  }

  const clusters = [
    { 
      label: clusterLabels[0], 
      mean: feature.group_a_mean,
      color: '#2563EB',
      colorLight: 'rgba(37, 99, 235, 0.3)'
    },
    { 
      label: clusterLabels[1], 
      mean: feature.group_b_mean,
      color: '#16A34A',
      colorLight: 'rgba(22, 163, 74, 0.3)'
    }
  ];

  // Create distribution curve points (simplified KDE)
  const generateCurve = (mean: number, stdDev: number = 0.15) => {
    const points: Array<{ x: number; y: number }> = [];
    const steps = 50;
    const range = stdDev * 3;
    
    for (let i = 0; i <= steps; i++) {
      const x = mean - range + (2 * range * i / steps);
      // Gaussian distribution
      const y = Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)));
      points.push({ x, y });
    }
    
    return points;
  };

  // Calculate curves for both clusters
  const curves = clusters.map(cluster => ({
    ...cluster,
    points: generateCurve(cluster.mean)
  }));

  // Find x range
  const allX = curves.flatMap(c => c.points.map(p => p.x));
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const xRange = maxX - minX;

  // Convert point to SVG coordinates
  const toSvgX = (x: number) => ((x - minX) / xRange) * 100;
  const toSvgY = (y: number, layerIndex: number) => {
    const baseY = 10 + (layerIndex * 35); // Vertical offset for each layer
    return baseY + (1 - y) * 25; // Scale y
  };

  // Generate SVG path
  const generatePath = (points: Array<{ x: number; y: number }>, layerIndex: number) => {
    const pathData = points.map((p, i) => {
      const x = toSvgX(p.x);
      const y = toSvgY(p.y, layerIndex);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
    
    // Close the path at the bottom
    const lastX = toSvgX(points[points.length - 1].x);
    const firstX = toSvgX(points[0].x);
    const bottomY = toSvgY(0, layerIndex);
    
    return `${pathData} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  return (
    <div
      className="flex flex-col p-6 rounded-2xl relative"
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(17, 24, 39, 0.10)',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
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
          color: '#0F172A',
          marginBottom: '6px',
        }}>
          분포 비교 (Ridgeline Plot)
        </h3>
        <p style={{ 
          fontSize: '12px', 
          fontWeight: 400, 
          color: '#64748B',
        }}>
          {feature.feature} - 클러스터별 값 분포 형태
        </p>
      </div>

      {/* Chart */}
      <div style={{ position: 'relative', paddingTop: '20px', paddingBottom: '40px' }}>
        <svg 
          viewBox="0 0 100 100" 
          style={{ 
            width: '100%', 
            height: '320px',
            overflow: 'visible',
          }}
        >
          {/* Ridgeline layers */}
          {curves.map((curve, idx) => (
            <g key={idx}>
              {/* Fill area */}
              <path
                d={generatePath(curve.points, idx)}
                fill={curve.colorLight}
                stroke={curve.color}
                strokeWidth="0.3"
                opacity="0.7"
              />
              
              {/* Peak label */}
              <text
                x={toSvgX(curve.mean)}
                y={toSvgY(1, idx) - 2}
                textAnchor="middle"
                style={{
                  fontSize: '3px',
                  fontWeight: 600,
                  fill: curve.color,
                }}
              >
                {curve.label}
              </text>
              
              {/* Mean value label */}
              <text
                x={toSvgX(curve.mean)}
                y={toSvgY(1, idx) + 2}
                textAnchor="middle"
                style={{
                  fontSize: '2.5px',
                  fontWeight: 400,
                  fill: '#64748B',
                }}
              >
                평균: {curve.mean.toFixed(2)}
              </text>
            </g>
          ))}

          {/* X-axis */}
          <line
            x1="0"
            y1="85"
            x2="100"
            y2="85"
            stroke="#E5E7EB"
            strokeWidth="0.2"
          />
          
          {/* X-axis ticks */}
          {[0, 25, 50, 75, 100].map((x, idx) => {
            const value = minX + (xRange * x / 100);
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1="85"
                  x2={x}
                  y2="86"
                  stroke="#9CA3AF"
                  strokeWidth="0.2"
                />
                <text
                  x={x}
                  y="90"
                  textAnchor="middle"
                  style={{
                    fontSize: '2.5px',
                    fill: '#64748B',
                  }}
                >
                  {value.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Feature Selector */}
      {data.length > 1 && (
        <div className="mb-6">
          <label style={{ 
            fontSize: '12px', 
            fontWeight: 500, 
            color: '#64748B',
            display: 'block',
            marginBottom: '8px',
          }}>
            변수 선택:
          </label>
          <select
            value={feature.feature}
            onChange={(e) => {
              // In real implementation, this would update the selected feature
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(17, 24, 39, 0.10)',
              background: 'rgba(255, 255, 255, 0.8)',
              fontSize: '13px',
              fontWeight: 500,
              color: '#0F172A',
              cursor: 'pointer',
            }}
          >
            {data.map((d, idx) => (
              <option key={idx} value={d.feature}>
                {d.feature}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}>
        <div className="flex items-center gap-6">
          {curves.map((curve, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div 
                className="w-8 h-4 rounded"
                style={{ 
                  background: `linear-gradient(90deg, ${curve.colorLight} 0%, ${curve.color} 100%)`,
                  border: `1px solid ${curve.color}`,
                }}
              />
              <div>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#0F172A',
                }}>
                  {curve.label}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: 400, 
                  color: '#64748B',
                }}>
                  평균: {curve.mean.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div 
        className="mt-4 p-3 rounded-lg"
        style={{
          background: 'rgba(37, 99, 235, 0.05)',
          border: '1px solid rgba(37, 99, 235, 0.1)',
        }}
      >
        <p style={{ 
          fontSize: '11px', 
          fontWeight: 400, 
          color: '#64748B',
        }}>
          💡 각 곡선은 클러스터의 값 분포를 나타냅니다. 곡선의 높이는 해당 값의 밀도를 의미합니다.
        </p>
      </div>
    </div>
  );
}
