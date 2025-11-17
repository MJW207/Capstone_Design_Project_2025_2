import { MapPin, Sparkles, X } from 'lucide-react';
import { PIButton } from './PIButton';

interface LocatedPanel {
  id: string;
  color: string;
}

interface PILocatorStripProps {
  locatedPanels?: LocatedPanel[];
  onClear?: (panelId: string) => void;
  onHighlightAll?: () => void;
  onSendToCompare?: () => void;
}

export function PILocatorStrip({
  locatedPanels = [],
  onClear,
  onHighlightAll,
  onSendToCompare,
}: PILocatorStripProps) {
  if (locatedPanels.length === 0) return null;

  return (
    <div
      className="sticky top-0 z-20"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(17, 24, 39, 0.08)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div className="px-20 py-3 flex items-center justify-between">
        {/* Left: Located Panels */}
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            위치 표시됨
          </span>
          <div className="flex items-center gap-2">
            {locatedPanels.slice(0, 3).map((panel) => (
              <div
                key={panel.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg animate-in fade-in slide-in-from-left-2"
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(17, 24, 39, 0.08)',
                  animationDuration: '180ms',
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: panel.color }}
                />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                  {panel.id}
                </span>
                <button
                  onClick={() => onClear?.(panel.id)}
                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/5 transition-colors"
                  style={{ color: '#64748B' }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <PIButton variant="secondary" size="small" onClick={onHighlightAll}>
            <MapPin className="w-3.5 h-3.5 mr-1" />
            지도에서 강조
          </PIButton>
          
          <PIButton variant="ghost" size="small" onClick={onSendToCompare}>
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            비교 보드
          </PIButton>
        </div>
      </div>
    </div>
  );
}
