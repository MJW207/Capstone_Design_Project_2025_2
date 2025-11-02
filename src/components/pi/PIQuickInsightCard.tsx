import { Info, Sparkles, TrendingUp, Users } from 'lucide-react';
import { PICard } from './PICard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface QuickInsightData {
  total: number;
  q_cnt: number;
  q_ratio: number;
  w_cnt: number;
  w_ratio: number;
  gender_top: number;
  top_regions: [string, string, string];
  top_tags: [string, string, string];
  recent_30d?: number;
  age_med?: number;
}

interface PIQuickInsightCardProps {
  data: QuickInsightData;
  isEmpty?: boolean;
  insight?: string; // LLM 인사이트 텍스트
  loading?: boolean; // 로딩 상태
}

export function PIQuickInsightCard({ data, isEmpty = false }: PIQuickInsightCardProps) {
  if (isEmpty) {
    return (
      <PICard variant="summary" className="relative overflow-hidden card flex items-center justify-center">
        <div className="text-center space-y-2 p-6">
          <Sparkles className="w-6 h-6 mx-auto" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>검색 결과가 없습니다. 필터를 조정해 보세요.</p>
        </div>
      </PICard>
    );
  }

  return (
    <div
      className="relative overflow-hidden card rounded-xl"
      style={{ 
        background: 'linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%)',
        border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-1), 0 0 0 1px rgba(124, 58, 237, 0.05)'
      }}
    >
      <PICard variant="summary" className="relative overflow-hidden">
      <div className="h-full flex flex-col justify-center p-6 relative">
        {/* 배경 장식 */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{
          background: 'radial-gradient(circle, var(--brand-purple-600), transparent)',
          filter: 'blur(24px)'
        }} />
        
        <div className="space-y-4 relative z-10">
          {/* Header with Icon and Tooltip */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand-blue-500)] to-[#7C3AED] flex items-center justify-center shadow-lg" style={{
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
              }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 style={{ 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  color: 'var(--text-secondary)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.1em',
                  marginBottom: '2px'
                }}>
                  퀵 인사이트
                </h3>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  AI 요약 정보
                </p>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="btn--ghost w-6 h-6 p-0 flex items-center justify-center transition-fast rounded-lg hover:bg-[rgba(37,99,235,0.1)]" style={{ color: 'var(--muted-foreground)' }}>
                    <Info className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">위 수치는 현재 필터 기준 요약입니다.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Body - Insight Text with Icons */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg" style={{
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.15)'
            }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                background: 'rgba(37, 99, 235, 0.2)'
              }}>
                <Users className="w-4 h-4" style={{ color: 'var(--brand-blue-300)' }} />
              </div>
              <div className="flex-1">
                <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.6', color: 'var(--text-primary)' }}>
                  이번 검색 결과 <span style={{ fontWeight: 700, color: 'var(--brand-blue-300)' }}>{data.total.toLocaleString()}명</span>. 
                  Quickpoll 응답 <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.q_cnt.toLocaleString()}명</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}> ({data.q_ratio}%)</span>, 
                  W-only <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.w_cnt.toLocaleString()}명</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}> ({data.w_ratio}%)</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg" style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.15)'
            }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                background: 'rgba(16, 185, 129, 0.2)'
              }}>
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--success-300)' }} />
              </div>
              <div className="flex-1">
                <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.6', color: 'var(--text-primary)' }}>
                  여성 <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.gender_top}%</span>, 상위 지역{' '}
                  <span style={{ fontWeight: 700, color: 'var(--success-300)' }}>{data.top_regions[0]}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>·</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.top_regions[1]}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>·</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.top_regions[2]}</span>
                  {'. '}
                  주요 태그{' '}
                  <span className="inline-flex items-center gap-1">
                    <span style={{ color: 'var(--brand-blue-300)', fontWeight: 700 }}>#{data.top_tags[0]}</span>{' '}
                    <span style={{ color: 'var(--brand-blue-300)', fontWeight: 700 }}>#{data.top_tags[1]}</span>{' '}
                    <span style={{ color: 'var(--brand-blue-300)', fontWeight: 700 }}>#{data.top_tags[2]}</span>
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Mini KPI Chips */}
          {(data.q_ratio !== undefined || data.recent_30d !== undefined || data.age_med !== undefined) && (
            <div className="flex gap-2 flex-wrap mt-2">
              {data.q_ratio !== undefined && (
                <div className="px-3 py-1.5 rounded-lg text-sm font-semibold relative overflow-hidden" style={{
                  background: 'rgba(37, 99, 235, 0.12)',
                  border: '1px solid rgba(37, 99, 235, 0.25)',
                }}>
                  <div className="absolute inset-0 opacity-10" style={{
                    background: 'linear-gradient(135deg, var(--brand-blue-500), transparent)'
                  }} />
                  <span 
                    className="relative z-10"
                    style={{
                      // 화이트 모드에서도 잘 보이도록 어두운 블루 사용
                      color: 'var(--brand-blue-500)',
                    }}
                  >
                    Q응답률 {data.q_ratio}%
                  </span>
                </div>
              )}
              {data.recent_30d !== undefined && (
                <div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: 'var(--success-300)'
                }}>
                  최근 30일 응답 {data.recent_30d.toLocaleString()}명
                </div>
              )}
              {data.age_med !== undefined && (
                <div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{
                  background: 'rgba(251, 146, 60, 0.12)',
                  border: '1px solid rgba(251, 146, 60, 0.25)',
                  color: 'var(--warning-300)'
                }}>
                  평균 연령 {data.age_med}세
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </PICard>
    </div>
  );
}
