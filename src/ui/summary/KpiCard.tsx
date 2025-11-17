import React from 'react';
import { Info, LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../base/tooltip';

interface KpiCardProps {
  title: string;
  main: React.ReactNode;
  sub?: React.ReactNode;
  badge?: React.ReactNode;
  tooltip?: string;
  className?: string;
  icon?: LucideIcon;
  iconColor?: string;
}

export function KpiCard({
  title,
  main,
  sub,
  badge,
  tooltip,
  className = '',
  icon: Icon,
  iconColor,
}: KpiCardProps) {
  return (
    <div className={`kpi-card ${className}`}>
      <div className="kpi-card__header">
        <div className="kpi-card__title-wrapper">
          {Icon && (
            <div 
              className="kpi-card__icon"
              style={iconColor ? { color: iconColor } : undefined}
            >
              <Icon size={14} strokeWidth={2.5} />
            </div>
          )}
          <span className="kpi-card__title">{title}</span>
        </div>
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
