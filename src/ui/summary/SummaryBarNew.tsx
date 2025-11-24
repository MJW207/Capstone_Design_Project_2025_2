import { useMemo } from 'react';
import { 
  ChevronRight, 
  Users, 
  Database, 
  Clock, 
  Calendar, 
  MapPin, 
  Briefcase, 
  Heart, 
  DollarSign,
  TrendingUp,
  Car,
  Smartphone,
  Cigarette,
  Wine
} from 'lucide-react';

export type ProfileChipKey = "age" | "region" | "job" | "marriage" | "income" | "car" | "phone" | "smoking" | "drinking" | "custom";

export interface SummaryProfileChip {
  key: ProfileChipKey | string;
  label: string;        // 예: "평균 연령"
  value: string;        // 예: "27세"
  color?: "indigo" | "blue" | "violet" | "amber" | "emerald" | "slate";
}

export interface SummaryBarProps {
  foundCount: number;           // FOUND 숫자
  queryLabel?: string;          // 현재 필터/쿼리 요약 문장
  costKb?: number;              // 예: 25
  latencyText?: string;         // 예: "< 1초, API 1회 호출"
  avgAge?: string;              // 예: "27세"
  genderText?: string;          // 예: "50 : 50"
  genderSubText?: string;       // 예: "남 50%, 여 50%"
  profileChips: SummaryProfileChip[];
  onChipClick?: (chip: SummaryProfileChip) => void;
  className?: string;           // 외부에서 여백 조정용
}

const colorClasses = {
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    border: 'border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-700 dark:text-indigo-300',
    hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/50',
    active: 'active:bg-indigo-200 dark:active:bg-indigo-800',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/50',
    active: 'active:bg-blue-200 dark:active:bg-blue-800',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800',
    text: 'text-violet-700 dark:text-violet-300',
    hover: 'hover:bg-violet-100 dark:hover:bg-violet-900/50',
    active: 'active:bg-violet-200 dark:active:bg-violet-800',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/50',
    active: 'active:bg-amber-200 dark:active:bg-amber-800',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
    active: 'active:bg-emerald-200 dark:active:bg-emerald-800',
  },
  slate: {
    bg: 'bg-slate-50 dark:bg-slate-900/50',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-700 dark:text-slate-300',
    hover: 'hover:bg-slate-100 dark:hover:bg-slate-800/50',
    active: 'active:bg-slate-200 dark:active:bg-slate-700',
  },
};

export function SummaryBar({
  foundCount,
  queryLabel,
  costKb,
  latencyText,
  avgAge,
  genderText,
  genderSubText,
  profileChips,
  onChipClick,
  className = '',
}: SummaryBarProps) {
  const defaultColors: Array<SummaryProfileChip['color']> = ['indigo', 'blue', 'violet', 'amber', 'emerald', 'slate'];
  
  const chipsWithColors = useMemo(() => {
    return profileChips.map((chip, index) => ({
      ...chip,
      color: chip.color || defaultColors[index % defaultColors.length],
    }));
  }, [profileChips]);

  return (
    <div className={`summary-bar-new ${className}`} style={{ marginBottom: '24px' }}>
      {/* 상단 SummaryBar 한 줄 */}
      <div
        className="flex items-center justify-between gap-6 px-6 py-4 rounded-xl transition-colors"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* 왼쪽: FOUND + 설명 */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #4b74ff 0%, #8055ff 50%, #c35bff 100%)',
                color: 'white',
              }}
            >
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="font-bold"
                style={{
                  fontSize: '28px',
                  lineHeight: '1',
                  color: 'var(--text-primary)',
                }}
              >
                {foundCount.toLocaleString()}
              </span>
              <span
                className="font-semibold uppercase tracking-wide"
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.1em',
                }}
              >
                FOUND
              </span>
            </div>
          </div>
          
          {queryLabel && (
            <div
              className="flex items-center gap-2 flex-1 min-w-0"
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: '1.5',
              }}
            >
              <div className="flex-1 min-w-0 truncate">{queryLabel}</div>
            </div>
          )}
        </div>

        {/* 오른쪽: KPI 2~3개 */}
        <div className="flex items-center gap-5 flex-shrink-0">
          {/* COST */}
          {costKb !== undefined && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}>
              <Database className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              <div className="flex flex-col">
                <div
                  className="font-semibold leading-tight"
                  style={{
                    fontSize: '15px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {costKb}KB
                </div>
                {latencyText && (
                  <div
                    className="text-xs leading-tight"
                    style={{
                      color: 'var(--text-tertiary)',
                      marginTop: '1px',
                    }}
                  >
                    {latencyText}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 평균 연령 */}
          {avgAge && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}>
              <Calendar className="w-4 h-4" style={{ color: '#4b74ff' }} />
              <div className="flex flex-col">
                <div
                  className="font-semibold leading-tight"
                  style={{
                    fontSize: '15px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {avgAge}
                </div>
                <div
                  className="text-xs leading-tight"
                  style={{
                    color: 'var(--text-tertiary)',
                    marginTop: '1px',
                  }}
                >
                  평균 연령
                </div>
              </div>
            </div>
          )}

          {/* 성비 */}
          {genderText && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}>
              <Users className="w-4 h-4" style={{ color: '#c35bff' }} />
              <div className="flex flex-col">
                <div
                  className="font-semibold leading-tight"
                  style={{
                    fontSize: '15px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {genderText}
                </div>
                {genderSubText ? (
                  <div
                    className="text-xs leading-tight"
                    style={{
                      color: 'var(--text-tertiary)',
                      marginTop: '1px',
                    }}
                  >
                    {genderSubText}
                  </div>
                ) : (
                  <div
                    className="text-xs leading-tight"
                    style={{
                      color: 'var(--text-tertiary)',
                      marginTop: '1px',
                    }}
                  >
                    성비
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 프로필 칩 레일 */}
      {chipsWithColors.length > 0 && (
        <div className="mt-4">
          <div
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {chipsWithColors.map((chip) => {
              const colorClass = colorClasses[chip.color!];
              
              // 칩별 아이콘 매핑 및 색상
              const getChipIcon = () => {
                const iconSize = 16;
                const iconColorMap: Record<string, string> = {
                  indigo: '#6366f1',
                  blue: '#3b82f6',
                  violet: '#8b5cf6',
                  amber: '#f59e0b',
                  emerald: '#10b981',
                  slate: '#64748b',
                };
                const iconColor = iconColorMap[chip.color || 'slate'] || iconColorMap.slate;
                
                switch (chip.key) {
                  case 'age':
                    return <Calendar size={iconSize} style={{ color: iconColor }} />;
                  case 'region':
                    return <MapPin size={iconSize} style={{ color: iconColor }} />;
                  case 'job':
                    return <Briefcase size={iconSize} style={{ color: iconColor }} />;
                  case 'marriage':
                    return <Heart size={iconSize} style={{ color: iconColor }} />;
                  case 'income':
                    return <DollarSign size={iconSize} style={{ color: iconColor }} />;
                  case 'car':
                    return <Car size={iconSize} style={{ color: iconColor }} />;
                  case 'phone':
                    return <Smartphone size={iconSize} style={{ color: iconColor }} />;
                  case 'smoking':
                    return <Cigarette size={iconSize} style={{ color: iconColor }} />;
                  case 'drinking':
                    return <Wine size={iconSize} style={{ color: iconColor }} />;
                  default:
                    return <TrendingUp size={iconSize} style={{ color: iconColor }} />;
                }
              };
              
              return (
                <button
                  key={chip.key}
                  onClick={() => onChipClick?.(chip)}
                  className={`
                    flex items-center gap-2.5 px-4 py-2.5 rounded-lg
                    border transition-all duration-200
                    ${colorClass.bg}
                    ${colorClass.border}
                    ${colorClass.text}
                    ${colorClass.hover}
                    ${colorClass.active}
                    ${onChipClick ? 'cursor-pointer' : 'cursor-default'}
                    flex-shrink-0
                  `}
                  style={{
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getChipIcon()}
                  <div className="flex flex-col items-start">
                    <span
                      className="text-xs font-medium leading-tight"
                      style={{
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {chip.label}
                    </span>
                    <span
                      className="font-semibold leading-tight"
                      style={{
                        fontSize: '14px',
                        marginTop: '1px',
                      }}
                    >
                      {chip.value}
                    </span>
                  </div>
                  {onChipClick && (
                    <ChevronRight
                      className="w-3.5 h-3.5 opacity-50 flex-shrink-0"
                      style={{
                        marginLeft: '2px',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

