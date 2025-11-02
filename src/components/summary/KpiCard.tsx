import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface KpiCardProps {
  title: string;
  main: React.ReactNode;
  sub?: React.ReactNode;
  badge?: React.ReactNode;
  tooltip?: string;
  className?: string;
}

export function KpiCard({
  title,
  main,
  sub,
  badge,
  tooltip,
  className = '',
}: KpiCardProps) {
  return (
    <div className={`kpi-card ${className}`}>
      <div className="kpi-card__header">
        <span className="kpi-card__title">{title}</span>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="kpi-card__info" aria-label="정보">
                  <Info size={12} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="kpi-card__main">{main}</div>
      {sub && <div className="kpi-card__sub">{sub}</div>}
      {badge && <div className="kpi-card__badge">{badge}</div>}
    </div>
  );
}

