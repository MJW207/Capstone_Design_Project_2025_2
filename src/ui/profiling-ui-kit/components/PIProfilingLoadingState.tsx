import { Loader2 } from 'lucide-react';

export function PIProfilingLoadingState() {
  return (
    <div 
      className="flex flex-col items-center justify-center py-24 px-6 rounded-2xl"
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(17, 24, 39, 0.10)',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Animated Icon */}
      <div 
        className="p-8 rounded-2xl mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(124, 58, 237, 0.15) 100%)',
        }}
      >
        <Loader2 
          className="w-16 h-16 animate-spin" 
          style={{ color: '#2563EB' }} 
        />
      </div>

      {/* Title */}
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: 600, 
        color: '#0F172A', 
        marginBottom: '12px',
      }}>
        프로파일링 데이터를 불러오는 중...
      </h3>

      {/* Description */}
      <p style={{ 
        fontSize: '14px', 
        fontWeight: 400, 
        color: '#64748B', 
        textAlign: 'center', 
        maxWidth: '420px', 
        lineHeight: '1.6',
      }}>
        잠시만 기다려주세요. 데이터를 분석하고 있습니다.
      </p>
    </div>
  );
}
