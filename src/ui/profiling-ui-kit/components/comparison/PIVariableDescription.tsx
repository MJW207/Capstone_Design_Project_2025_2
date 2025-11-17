import { Info } from 'lucide-react';
import { useDarkMode } from '../../../../lib/DarkModeSystem';

export function PIVariableDescription() {
  const { isDark } = useDarkMode();

  const descriptions = [
    {
      title: '프리미엄 지수',
      content: (
        <div>
          <p style={{ marginBottom: '8px', fontSize: '13px', lineHeight: '1.6' }}>
            <strong>계산 방식:</strong> 프리미엄 제품 수 ÷ 전체 전자제품 수 (0~1 범위)
          </p>
          <p style={{ marginBottom: '8px', fontSize: '13px', lineHeight: '1.6' }}>
            <strong>프리미엄 제품:</strong> 제품 번호 3, 9, 18, 20, 22, 25번 (고가 스마트폰, 프리미엄 노트북, 고가 가전제품 등)
          </p>
          <p style={{ marginBottom: '0', fontSize: '13px', lineHeight: '1.6' }}>
            <strong>해석:</strong> 0.3 이상이면 프리미엄 소비 성향이 있는 것으로 판단
          </p>
        </div>
      ),
    },
    {
      title: '수도권',
      content: (
        <div>
          <p style={{ marginBottom: '0', fontSize: '13px', lineHeight: '1.6' }}>
            <strong>정의:</strong> 서울특별시, 경기도 지역
          </p>
        </div>
      ),
    },
    {
      title: '프리미엄 폰',
      content: (
        <div>
          <p style={{ marginBottom: '0', fontSize: '13px', lineHeight: '1.6' }}>
            <strong>정의:</strong> 고가 스마트폰 (예: 아이폰 시리즈, 갤럭시 S/Note 시리즈, 갤럭시 Z Fold/Flip 시리즈 등)
          </p>
        </div>
      ),
    },
  ];

  return (
    <div
      className="flex flex-col p-5 rounded-xl relative"
      style={{
        background: isDark 
          ? 'rgba(59, 130, 246, 0.08)' 
          : 'rgba(59, 130, 246, 0.05)',
        border: isDark ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(59, 130, 246, 0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="p-2 rounded-lg"
          style={{
            background: 'rgba(59, 130, 246, 0.12)',
          }}
        >
          <Info className="w-4 h-4" style={{ color: '#3B82F6' }} />
        </div>
        <div>
          <h3 style={{ 
            fontSize: '15px', 
            fontWeight: 600, 
            color: isDark ? '#F9FAFB' : '#0F172A',
            marginBottom: '2px',
          }}>
            변수 설명
          </h3>
          <p style={{ 
            fontSize: '12px', 
            fontWeight: 400, 
            color: isDark ? '#D1D5DB' : '#64748B',
          }}>
            주요 변수의 정의 및 계산 방식
          </p>
        </div>
      </div>

      {/* Descriptions */}
      <div className="space-y-4">
        {descriptions.map((item, idx) => (
          <div 
            key={idx}
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(17, 24, 39, 0.02)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(17, 24, 39, 0.05)',
            }}
          >
            <h4 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: isDark ? '#E5E7EB' : '#374151',
              marginBottom: '8px',
            }}>
              {item.title}
            </h4>
            <div style={{
              color: isDark ? '#D1D5DB' : '#6B7280',
            }}>
              {item.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

