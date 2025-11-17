import { useState, useMemo, useRef, useEffect } from 'react';
import { Settings2, X, ChevronUp, ChevronDown, Check, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ComparisonResult } from './types';
import { getFeatureNameKR } from './utils';
import { useDarkMode } from '../../../../lib/DarkModeSystem';

interface PIFeatureSelectorProps {
  allData: ComparisonResult[];
  selectedFeatures: string[];
  onFeaturesChange: (features: string[]) => void;
  chartType: 'radar' | 'heatmap' | 'stacked' | 'index';
}

export function PIFeatureSelector({
  allData,
  selectedFeatures,
  onFeaturesChange,
  chartType
}: PIFeatureSelectorProps) {
  const { isDark } = useDarkMode();
  const [isOpen, setIsOpen] = useState(false);
  
  // localStorage에서 저장된 너비 불러오기
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('featureSelectorPanelWidth');
      return saved ? parseInt(saved, 10) : 384;
    }
    return 384;
  });
  
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(panelWidth);

  // 패널 너비 변경 시 localStorage에 저장
  useEffect(() => {
    if (panelWidth !== 384) {
      localStorage.setItem('featureSelectorPanelWidth', panelWidth.toString());
    }
  }, [panelWidth]);

  // 리사이즈 핸들러
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaX = resizeStartX.current - e.clientX; // 오른쪽에서 왼쪽으로 드래그하면 양수
      const newWidth = Math.max(300, Math.min(800, resizeStartWidth.current + deltaX));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = panelWidth;
  };

  // 차트 타입별 필터링
  const availableFeatures = useMemo(() => {
    let filtered = allData;
    
    if (chartType === 'radar') {
      // 레이더 차트: 연속형 + 이진형
      filtered = allData.filter(d => d.type === 'continuous' || d.type === 'binary');
    } else if (chartType === 'heatmap') {
      // 히트맵: 이진형만
      filtered = allData.filter(d => d.type === 'binary');
    } else if (chartType === 'stacked') {
      // 스택바: 범주형만
      filtered = allData.filter(d => d.type === 'categorical');
    } else if (chartType === 'index') {
      // 인덱스 도트: 이진형만
      filtered = allData.filter(d => d.type === 'binary');
    }
    
    return filtered.map(d => ({
      feature: d.feature,
      name: getFeatureNameKR(d.feature),
      type: d.type,
      ...(d.type === 'continuous' ? { cohens_d: (d as any).cohens_d } : {}),
      ...(d.type === 'binary' ? { abs_diff_pct: (d as any).abs_diff_pct } : {}),
    })).sort((a, b) => {
      // 중요도 순으로 정렬
      if (a.type === 'continuous' && b.type === 'continuous') {
        return Math.abs(b.cohens_d || 0) - Math.abs(a.cohens_d || 0);
      } else if (a.type === 'binary' && b.type === 'binary') {
        return Math.abs(b.abs_diff_pct || 0) - Math.abs(a.abs_diff_pct || 0);
      }
      return 0;
    });
  }, [allData, chartType]);

  // 선택된 변수 순서 유지
  const orderedFeatures = useMemo(() => {
    const selected = selectedFeatures
      .map(feature => availableFeatures.find(f => f.feature === feature))
      .filter(Boolean) as typeof availableFeatures;
    
    const unselected = availableFeatures.filter(f => !selectedFeatures.includes(f.feature));
    
    return [...selected, ...unselected];
  }, [availableFeatures, selectedFeatures]);

  const handleToggleFeature = (feature: string) => {
    if (selectedFeatures.includes(feature)) {
      onFeaturesChange(selectedFeatures.filter(f => f !== feature));
    } else {
      onFeaturesChange([...selectedFeatures, feature]);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newFeatures = [...selectedFeatures];
    [newFeatures[index - 1], newFeatures[index]] = [newFeatures[index], newFeatures[index - 1]];
    onFeaturesChange(newFeatures);
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedFeatures.length - 1) return;
    const newFeatures = [...selectedFeatures];
    [newFeatures[index], newFeatures[index + 1]] = [newFeatures[index + 1], newFeatures[index]];
    onFeaturesChange(newFeatures);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
        style={{
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(17, 24, 39, 0.05)',
          color: isDark ? '#D1D5DB' : '#64748B',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(17, 24, 39, 0.1)',
        }}
      >
        <Settings2 size={16} />
        <span style={{ fontSize: '13px', fontWeight: 500 }}>변수 선택</span>
        {selectedFeatures.length > 0 && (
          <span style={{
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '10px',
            background: isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.1)',
            color: '#2563EB',
            fontWeight: 600,
          }}>
            {selectedFeatures.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              style={{ background: 'rgba(0, 0, 0, 0.3)' }}
            />
            
            {/* Panel */}
            <motion.div
              ref={panelRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ 
                type: 'spring',
                damping: 30,
                stiffness: 300
              }}
              className="fixed right-0 top-0 h-full z-50 shadow-2xl"
              style={{
                width: `${panelWidth}px`,
                background: isDark ? '#1F2937' : '#FFFFFF',
                borderLeft: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(17, 24, 39, 0.1)',
                transition: isResizing ? 'none' : 'width 0.2s ease-out',
              }}
            >
              {/* Resize Handle */}
              <motion.div
                onMouseDown={handleResizeStart}
                className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 group"
                style={{
                  background: isResizing ? '#2563EB' : 'transparent',
                }}
                whileHover={{ backgroundColor: isDark ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.2)' }}
              >
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isResizing ? 1 : 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <GripVertical 
                      size={20} 
                      color={isDark ? '#D1D5DB' : '#6B7280'}
                      style={{ transform: 'rotate(90deg)' }}
                    />
                  </motion.div>
                </div>
              </motion.div>
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.1)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: isDark ? '#F9FAFB' : '#111827', margin: 0 }}>
              변수 선택
            </h3>
            <p style={{ fontSize: '12px', color: isDark ? '#9CA3AF' : '#6B7280', margin: '4px 0 0 0' }}>
              {chartType === 'radar' && '라다 차트'}
              {chartType === 'heatmap' && '히트맵'}
              {chartType === 'stacked' && '스택 바'}
              {chartType === 'index' && '인덱스 도트'}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div 
          ref={contentRef}
          className="overflow-y-auto p-4 feature-selector-scroll"
          style={{
            height: 'calc(100vh - 160px)', // Header(약 80px) + Footer(약 80px) 제외
            maxHeight: 'calc(100vh - 160px)',
            scrollBehavior: 'smooth',
            // 커스텀 스크롤바 스타일 (Firefox)
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? 'rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05)' : 'rgba(17, 24, 39, 0.2) rgba(17, 24, 39, 0.05)',
          }}
        >
          <style>{`
            /* Webkit 브라우저용 스크롤바 스타일 */
            .feature-selector-scroll::-webkit-scrollbar {
              width: 8px;
            }
            .feature-selector-scroll::-webkit-scrollbar-track {
              background: ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(17, 24, 39, 0.05)'};
              border-radius: 4px;
            }
            .feature-selector-scroll::-webkit-scrollbar-thumb {
              background: ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(17, 24, 39, 0.2)'};
              border-radius: 4px;
            }
            .feature-selector-scroll::-webkit-scrollbar-thumb:hover {
              background: ${isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(17, 24, 39, 0.3)'};
            }
          `}</style>
          {/* 선택된 변수 (순서 변경 가능) */}
          {selectedFeatures.length > 0 && (
            <div className="mb-6">
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#D1D5DB' : '#374151', marginBottom: '12px' }}>
                선택된 변수 ({selectedFeatures.length}개)
              </h4>
              <div className="space-y-2">
                {selectedFeatures.map((feature, index) => {
                  const featureInfo = availableFeatures.find(f => f.feature === feature);
                  if (!featureInfo) return null;
                  
                  return (
                    <div
                      key={feature}
                      className="flex items-center gap-2 p-3 rounded-lg"
                      style={{
                        background: isDark ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.05)',
                        border: `1px solid ${isDark ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.2)'}`,
                      }}
                    >
                      <div className="flex-1">
                        <div style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#F9FAFB' : '#111827' }}>
                          {featureInfo.name}
                        </div>
                        <div style={{ fontSize: '11px', color: isDark ? '#9CA3AF' : '#6B7280', marginTop: '2px' }}>
                          {featureInfo.type === 'continuous' ? '연속형' : featureInfo.type === 'binary' ? '이진형' : '범주형'}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-black/5 transition-colors disabled:opacity-30"
                          style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === selectedFeatures.length - 1}
                          className="p-1 rounded hover:bg-black/5 transition-colors disabled:opacity-30"
                          style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                      <button
                        onClick={() => handleToggleFeature(feature)}
                        className="p-1 rounded hover:bg-black/5 transition-colors"
                        style={{ color: '#EF4444' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 사용 가능한 변수 목록 */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#D1D5DB' : '#374151', marginBottom: '12px' }}>
              사용 가능한 변수 ({availableFeatures.length}개)
            </h4>
            <div 
              className="space-y-1"
              style={{
                maxHeight: 'none', // 부모의 overflow-y-auto가 처리
              }}
            >
              {orderedFeatures.map((featureInfo) => {
                const isSelected = selectedFeatures.includes(featureInfo.feature);
                
                return (
                  <label
                    key={featureInfo.feature}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-black/5 transition-colors"
                    style={{
                      background: isSelected 
                        ? (isDark ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.05)')
                        : 'transparent',
                    }}
                  >
                    <div className="flex items-center justify-center w-5 h-5 rounded border-2"
                      style={{
                        borderColor: isSelected ? '#2563EB' : (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(17, 24, 39, 0.2)'),
                        background: isSelected ? '#2563EB' : 'transparent',
                      }}
                    >
                      {isSelected && <Check size={12} color="white" />}
                    </div>
                    <div className="flex-1">
                      <div style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#F9FAFB' : '#111827' }}>
                        {featureInfo.name}
                      </div>
                      <div style={{ fontSize: '11px', color: isDark ? '#9CA3AF' : '#6B7280' }}>
                        {featureInfo.type === 'continuous' ? '연속형' : featureInfo.type === 'binary' ? '이진형' : '범주형'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleFeature(featureInfo.feature)}
                      className="hidden"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4 border-t"
          style={{
            background: isDark ? '#1F2937' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.1)',
          }}
        >
          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-2 px-4 rounded-lg font-medium transition-colors"
            style={{
              background: '#2563EB',
              color: '#FFFFFF',
            }}
          >
            적용
          </button>
        </div>
      </motion.div>
      </>
        )}
      </AnimatePresence>
    </>
  );
}

