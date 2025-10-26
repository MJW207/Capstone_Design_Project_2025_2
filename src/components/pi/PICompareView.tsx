import { useState } from 'react';
import { PIPanelSheet, PanelSheetSize } from './PIPanelSheet';
import { PISegmentedControl } from './PISegmentedControl';
import { PIButton } from './PIButton';
import { Download, Plus } from 'lucide-react';

export type CompareLayout = '1-up' | '2-up' | '3-up';

interface PanelData {
  id: string;
  coverage: 'Q+W' | 'W only';
  cluster?: string;
  gender: string;
  age: number;
  region: string;
  income: string;
  interests: string[];
  isPinned?: boolean;
}

interface PICompareViewProps {
  isOpen: boolean;
  onClose: () => void;
  panels: PanelData[];
  onAddPanel?: () => void;
  onRemovePanel?: (index: number) => void;
}

export function PICompareView({
  isOpen,
  onClose,
  panels,
  onAddPanel,
  onRemovePanel,
}: PICompareViewProps) {
  const [layout, setLayout] = useState<CompareLayout>('2-up');

  if (!isOpen) return null;

  const layoutConfig = {
    '1-up': { columns: 1, gap: '0px', width: '1200px' },
    '2-up': { columns: 2, gap: '24px', width: '100%', maxWidth: '1440px' },
    '3-up': { columns: 3, gap: '16px', width: '100%', maxWidth: '1680px' },
  };

  const config = layoutConfig[layout];
  const maxPanels = parseInt(layout.charAt(0));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{
          background: 'rgba(0, 0, 0, 0.32)',
          backdropFilter: 'blur(6px)',
        }}
        onClick={onClose}
      />

      {/* Compare Container */}
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div
          className="w-full mb-4 flex items-center justify-between px-6 py-3 rounded-2xl animate-in fade-in slide-in-from-top-2"
          style={{
            maxWidth: config.maxWidth,
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            animationDuration: '180ms',
            animationTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
          }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              레이아웃
            </span>
            <PISegmentedControl
              value={layout}
              onChange={(value) => setLayout(value as CompareLayout)}
              options={[
                { value: '1-up', label: '1열' },
                { value: '2-up', label: '2열' },
                { value: '3-up', label: '3열' },
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <PIButton variant="ghost" size="small">
              <Download className="w-4 h-4 mr-1" />
              PNG 내보내기
            </PIButton>
            <PIButton variant="ghost" size="small" onClick={onClose}>
              모두 닫기
            </PIButton>
          </div>
        </div>

        {/* Sheets Grid */}
        <div
          className="w-full h-full overflow-auto"
          style={{
            maxWidth: config.maxWidth,
          }}
        >
          <div
            className="grid h-full animate-in fade-in zoom-in-95"
            style={{
              gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
              gap: config.gap,
              animationDuration: '220ms',
              animationTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
            }}
          >
            {/* Render panels */}
            {panels.slice(0, maxPanels).map((panel, index) => (
              <div key={panel.id} className="h-full min-h-0">
                <PIPanelSheet
                  mode="compareTile"
                  panelData={panel}
                  onClose={() => onRemovePanel?.(index)}
                  showNavigation={false}
                />
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, maxPanels - panels.length) }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="h-full flex items-center justify-center rounded-2xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(12px)',
                  border: '2px dashed rgba(17, 24, 39, 0.2)',
                }}
              >
                <div className="text-center space-y-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                    style={{
                      background: 'rgba(37, 99, 235, 0.08)',
                    }}
                  >
                    <Plus className="w-8 h-8" style={{ color: '#2563EB' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                      여기에 패널을 추가하세요
                    </p>
                    <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', marginTop: '8px' }}>
                      테이블에서 Shift+Click으로 여러 개 선택하면
                      <br />
                      자동으로 시트를 만듭니다.
                    </p>
                  </div>
                  <PIButton variant="secondary" size="small" onClick={onAddPanel}>
                    <Plus className="w-4 h-4 mr-1" />
                    패널 추가
                  </PIButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
