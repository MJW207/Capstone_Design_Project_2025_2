import { Info, TrendingUp } from 'lucide-react';

interface PIProfilingFooterProps {
  message?: string;
  suggestion?: string;
}

export function PIProfilingFooter({ 
  message = "이 프로파일은 클러스터링이 불가능한 소규모 샘플에 대한 요약 통계입니다.",
  suggestion = "더 정확한 분석을 원하시면 검색 조건을 완화하여 더 많은 패널을 포함해주세요.",
}: PIProfilingFooterProps) {
  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-2xl relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%)',
        border: '1px solid rgba(37, 99, 235, 0.2)',
      }}
    >
      {/* Gradient Top Line */}
      <div 
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, #2563EB 0%, #7C3AED 100%)',
          opacity: 0.4,
        }}
      />

      {/* Main Message */}
      <div className="flex items-start gap-3">
        <div 
          className="p-2 rounded-lg flex-shrink-0"
          style={{
            background: 'rgba(37, 99, 235, 0.12)',
          }}
        >
          <Info className="w-4 h-4" style={{ color: '#2563EB' }} />
        </div>
        <div className="flex-1">
          <p style={{ 
            fontSize: '13px', 
            fontWeight: 500, 
            color: '#1E40AF', 
            lineHeight: '1.6',
          }}>
            {message}
          </p>
        </div>
      </div>

      {/* Suggestion */}
      <div className="flex items-start gap-3">
        <div 
          className="p-2 rounded-lg flex-shrink-0"
          style={{
            background: 'rgba(124, 58, 237, 0.12)',
          }}
        >
          <TrendingUp className="w-4 h-4" style={{ color: '#7C3AED' }} />
        </div>
        <div className="flex-1">
          <p style={{ 
            fontSize: '13px', 
            fontWeight: 500, 
            color: '#5B21B6', 
            lineHeight: '1.6',
          }}>
            {suggestion}
          </p>
        </div>
      </div>
    </div>
  );
}
