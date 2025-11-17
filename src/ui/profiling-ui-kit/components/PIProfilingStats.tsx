import { StatItem } from '../types';

interface PIProfilingStatsProps {
  stats: StatItem[];
}

export function PIProfilingStats({ stats }: PIProfilingStatsProps) {
  return (
    <div
      className="flex flex-col rounded-2xl relative overflow-hidden transition-all duration-300 hover:shadow-xl"
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
      <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}>
        <h3 style={{ 
          fontSize: '15px', 
          fontWeight: 600, 
          color: '#0F172A',
        }}>
          연속형 변수 통계
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'rgba(241, 245, 249, 0.5)' }}>
              <th 
                className="px-6 py-4 text-left"
                style={{ 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                변수명
              </th>
              <th 
                className="px-4 py-4 text-right"
                style={{ 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                평균
              </th>
              <th 
                className="px-4 py-4 text-right"
                style={{ 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                표준편차
              </th>
              <th 
                className="px-4 py-4 text-right"
                style={{ 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                최소값
              </th>
              <th 
                className="px-6 py-4 text-right"
                style={{ 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                최대값
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat, index) => (
              <tr 
                key={index} 
                className="border-t hover:bg-slate-50/50 transition-colors"
                style={{ borderColor: 'rgba(17, 24, 39, 0.06)' }}
              >
                <td 
                  className="px-6 py-4"
                  style={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#0F172A',
                  }}
                >
                  {stat.label}
                </td>
                <td 
                  className="px-4 py-4 text-right font-mono"
                  style={{ 
                    fontSize: '13px', 
                    fontWeight: 600, 
                    color: '#0F172A',
                  }}
                >
                  {stat.mean !== undefined ? stat.mean.toFixed(2) : '—'}
                </td>
                <td 
                  className="px-4 py-4 text-right font-mono"
                  style={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#64748B',
                  }}
                >
                  {stat.std !== undefined ? `±${stat.std.toFixed(2)}` : '—'}
                </td>
                <td 
                  className="px-4 py-4 text-right font-mono"
                  style={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#64748B',
                  }}
                >
                  {stat.min !== undefined ? stat.min.toFixed(2) : '—'}
                </td>
                <td 
                  className="px-6 py-4 text-right font-mono"
                  style={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#64748B',
                  }}
                >
                  {stat.max !== undefined ? stat.max.toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {stats.length === 0 && (
        <div className="text-center py-12">
          <p style={{ 
            fontSize: '13px', 
            fontWeight: 400, 
            color: '#94A3B8',
          }}>
            통계 데이터가 없습니다
          </p>
        </div>
      )}
    </div>
  );
}
