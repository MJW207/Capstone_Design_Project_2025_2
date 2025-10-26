import { MapPin } from 'lucide-react';

interface LocatedPanel {
  id: string;
  color: string;
}

interface PILocatorOverlayProps {
  locatedPanels?: LocatedPanel[];
  onClear?: (panelId: string) => void;
}

const mockLocatedPanels: LocatedPanel[] = [
  { id: 'P1234', color: '#2563EB' },
  { id: 'P5678', color: '#16A34A' },
  { id: 'P9012', color: '#94A3B8' },
];

export function PILocatorOverlay({ 
  locatedPanels = mockLocatedPanels,
  onClear,
}: PILocatorOverlayProps) {
  if (locatedPanels.length === 0) return null;

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      {locatedPanels.slice(0, 3).map((panel) => (
        <div
          key={panel.id}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg animate-in fade-in slide-in-from-left-2"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(17, 24, 39, 0.08)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
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
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/5 transition-colors ml-1"
            style={{ color: '#64748B' }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// Pulse animation component for highlighting points
export function PulseDot({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g className="animate-pulse">
      <circle cx={x} cy={y} r="12" fill={color} opacity="0.2">
        <animate
          attributeName="r"
          from="12"
          to="24"
          dur="2s"
          repeatCount="1"
        />
        <animate
          attributeName="opacity"
          from="0.4"
          to="0"
          dur="2s"
          repeatCount="1"
        />
      </circle>
      <circle cx={x} cy={y} r="8" fill={color} opacity="0.4">
        <animate
          attributeName="r"
          from="8"
          to="16"
          dur="2s"
          repeatCount="1"
        />
        <animate
          attributeName="opacity"
          from="0.6"
          to="0"
          dur="2s"
          repeatCount="1"
        />
      </circle>
      <circle cx={x} cy={y} r="6" fill={color} opacity="0.8" />
    </g>
  );
}
