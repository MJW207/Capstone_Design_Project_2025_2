import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface PIProfilingKPICardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  subtitle?: string;
  color?: string;
}

export function PIProfilingKPICard({
  icon: Icon,
  label,
  value,
  subtitle,
  color = '#2563EB',
}: PIProfilingKPICardProps) {
  return (
    <div
      className="flex flex-col p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:shadow-xl"
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(17, 24, 39, 0.10)',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
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

      {/* Icon with accent background */}
      <div 
        className="inline-flex p-3 rounded-xl mb-5 self-start transition-transform duration-300 hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
        }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>

      {/* Label */}
      <div style={{ 
        fontSize: '12px', 
        fontWeight: 500, 
        color: '#64748B', 
        marginBottom: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {label}
      </div>

      {/* Value */}
      <div style={{ 
        fontSize: '32px', 
        fontWeight: 700, 
        color: '#0F172A', 
        lineHeight: '1.2', 
        marginBottom: subtitle ? '6px' : '0',
      }}>
        {value}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 500, 
          color: '#94A3B8',
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
