interface PISectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PISectionHeader({ eyebrow, title, description, action }: PISectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {eyebrow && (
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: '#64748B', 
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '8px'
          }}>
            {eyebrow}
          </div>
        )}
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: description ? '4px' : 0 }}>
          {title}
        </h2>
        {description && (
          <p style={{ fontSize: '13px', fontWeight: 400, color: '#64748B', lineHeight: '1.5' }}>
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
