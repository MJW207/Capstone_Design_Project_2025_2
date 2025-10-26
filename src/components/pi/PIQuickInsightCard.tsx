import React from 'react';
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

export function PIQuickInsightCard({ data, isEmpty = false, insight, loading = false }: PIQuickInsightCardProps) {
  if (isEmpty) {
    return (
      <PICard variant="summary" className="relative overflow-hidden h-full flex items-center justify-center">
        {/* Top Gradient Hairline */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#C7B6FF] to-[#A5C8FF]" />
        <div className="text-center space-y-2">
          <Sparkles className="w-8 h-8 mx-auto text-[var(--neutral-400)]" />
          <p className="text-sm text-[var(--neutral-600)]">검색 결과가 없습니다. 필터를 조정해 보세요.</p>
        </div>
      </PICard>
    );
  }

  return (
    <PICard variant="summary" className="relative overflow-hidden h-full bg-gradient-to-br from-white via-white to-blue-50/30">
      {/* Top Gradient Hairline */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#C7B6FF] to-[#A5C8FF]" />
      
      {/* Decorative Orb */}
      <div 
        className="absolute -right-12 -top-12 w-40 h-40 rounded-full opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.4) 0%, rgba(124, 58, 237, 0.2) 100%)',
        }}
      />
      
      <div className="space-y-5 h-full flex flex-col relative z-10">
        {/* Header with Icon and Tooltip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-[#7C3AED] flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary-500)' }}>퀵 인사이트</h3>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-[var(--neutral-600)] hover:text-[var(--accent-blue)] transition-colors">
                  <Info className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">위 수치는 현재 필터 기준 요약입니다.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* LLM 인사이트 텍스트 */}
        {insight && (
          <div className="bg-white/60 rounded-lg p-3 border border-[var(--neutral-200)]">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--accent-blue)] to-[#7C3AED] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--primary-500)] font-medium leading-relaxed">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
                      인사이트 생성 중...
                    </span>
                  ) : (
                    insight
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Body - Insight Text with Icons */}
        <div className="flex-1 space-y-4">
          <div className="flex items-start gap-2.5">
            <Users className="w-4.5 h-4.5 text-[var(--accent-blue)] flex-shrink-0 mt-0.5" />
            <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.65', color: 'var(--primary-500)' }}>
              이번 검색 결과 <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{data.total.toLocaleString()}명</span>. 
              Quickpoll 응답 <span style={{ fontWeight: 600 }}>{data.q_cnt.toLocaleString()}명</span>
              <span className="text-[var(--neutral-600)]">({data.q_ratio}%)</span>, 
              W-only <span style={{ fontWeight: 600 }}>{data.w_cnt.toLocaleString()}명</span>
              <span className="text-[var(--neutral-600)]">({data.w_ratio}%)</span>
            </p>
          </div>
          
          <div className="flex items-start gap-2.5">
            <TrendingUp className="w-4.5 h-4.5 text-[var(--accent-green)] flex-shrink-0 mt-0.5" />
            <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.65', color: 'var(--primary-500)' }}>
              여성 <span style={{ fontWeight: 600 }}>{data.gender_top}%</span>, 상위 지역{' '}
              <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{data.top_regions[0]}</span>
              <span className="text-[var(--neutral-600)]">·</span>
              <span style={{ fontWeight: 600 }}>{data.top_regions[1]}</span>
              <span className="text-[var(--neutral-600)]">·</span>
              <span style={{ fontWeight: 600 }}>{data.top_regions[2]}</span>
              {'. '}
              주요 태그{' '}
              <span className="inline-flex items-center gap-1">
                <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>#{data.top_tags[0]}</span>{' '}
                <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>#{data.top_tags[1]}</span>{' '}
                <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>#{data.top_tags[2]}</span>
              </span>
            </p>
          </div>
        </div>

        {/* Mini KPI Chips */}
        {(data.q_ratio !== undefined || data.recent_30d !== undefined || data.age_med !== undefined) && (
          <div className="flex gap-2 flex-wrap pt-2">
            {data.q_ratio !== undefined && (
              <div className="px-3 py-2 rounded-full bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20" style={{ fontSize: '12px', fontWeight: 600 }}>
                <span className="text-[var(--accent-blue)]">Q응답률 {data.q_ratio}%</span>
              </div>
            )}
            {data.recent_30d !== undefined && (
              <div className="px-3 py-2 rounded-full bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20" style={{ fontSize: '12px', fontWeight: 600 }}>
                <span className="text-[var(--accent-green)]">최근 30일 응답 {data.recent_30d.toLocaleString()}명</span>
              </div>
            )}
            {data.age_med !== undefined && (
              <div className="px-3 py-2 rounded-full bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/20" style={{ fontSize: '12px', fontWeight: 600 }}>
                <span className="text-[var(--accent-amber)]">평균 연령 {data.age_med}세</span>
              </div>
            )}
          </div>
        )}
      </div>
    </PICard>
  );
}
