import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FilterSectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
  active?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
  badgeCount?: number;
}

export function FilterSection({
  id,
  title,
  icon: Icon,
  active = false,
  right,
  children,
  badgeCount,
}: FilterSectionProps) {
  return (
    <section
      id={id}
      className={`pi-section ${active ? 'is-active' : ''}`}
    >
      <header className="pi-section__header">
        <div className="pi-section__title">
          <Icon className="pi-section__icon" size={20} />
          <h4>{title}</h4>
          {active && badgeCount !== undefined && badgeCount > 0 && (
            <span className="badge">{badgeCount}</span>
          )}
        </div>
        <div className="pi-section__right">{right}</div>
      </header>
      <div className="pi-section__body">{children}</div>
    </section>
  );
}

