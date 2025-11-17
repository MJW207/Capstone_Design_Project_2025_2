import { ChartType } from './types';
import { useDarkMode } from '../../../../lib/DarkModeSystem';

interface PIComparisonTabsProps {
  activeTab: ChartType;
  onTabChange: (tab: ChartType) => void;
}

const tabs: Array<{ id: ChartType; label: string; description: string }> = [
  { id: 'radar', label: '라다 차트', description: '다차원 비교' },
  { id: 'heatmap', label: '히트맵', description: '이진 변수' },
  { id: 'stacked', label: '스택 바', description: '범주형 구성' },
  { id: 'index', label: '인덱스 도트', description: 'Penetration' },
];

export function PIComparisonTabs({ activeTab, onTabChange }: PIComparisonTabsProps) {
  const { isDark } = useDarkMode();
  
  return (
    <div
      className="p-2 rounded-2xl relative overflow-hidden"
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

      {/* Tabs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="px-4 py-3 rounded-xl transition-all duration-200"
              style={{
                background: isActive 
                  ? 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)'
                  : isDark ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                color: isActive ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#64748B'),
                border: isActive ? 'none' : '1px solid transparent',
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13px',
              }}
            >
              <div style={{ marginBottom: '2px' }}>{tab.label}</div>
              <div style={{ 
                fontSize: '10px', 
                opacity: 0.8,
                fontWeight: 400,
              }}>
                {tab.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}