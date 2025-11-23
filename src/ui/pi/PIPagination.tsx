import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PIButton } from './PIButton';

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

interface PIPaginationProps {
  count: number; // total pages
  page: number; // current page (1-based)
  onChange: (page: number) => void;
  siblingCount?: number; // pages on each side of current
  boundaryCount?: number; // pages at the start and end
  disabled?: boolean;
  total?: number; // total results count
  pageSize?: number; // items per page
  showInfo?: boolean; // show result info
  showFirstLast?: boolean; // show first/last page buttons
  compact?: boolean; // compact mode for mobile
}

function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

function usePagination(config: {
  count: number;
  page: number;
  siblingCount: number;
  boundaryCount: number;
}): PaginationItem[] {
  const { count, page, siblingCount, boundaryCount } = config;

  if (count <= 0) return [];

  const startPages = range(1, Math.min(boundaryCount, count));
  const endPages = range(Math.max(count - boundaryCount + 1, boundaryCount + 1), count);

  const leftSiblingStart = Math.max(
    Math.min(page - siblingCount, count - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  );
  const rightSiblingEnd = Math.min(
    Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2),
    endPages.length > 0 ? endPages[0] - 2 : count - 1,
  );

  const items: PaginationItem[] = [];
  items.push(...startPages);

  if (leftSiblingStart > boundaryCount + 2) {
    items.push('start-ellipsis');
  } else if (boundaryCount + 1 < count - boundaryCount) {
    items.push(boundaryCount + 1);
  }

  items.push(...range(leftSiblingStart, rightSiblingEnd));

  if (rightSiblingEnd < count - boundaryCount - 1) {
    items.push('end-ellipsis');
  } else if (count - boundaryCount > boundaryCount) {
    items.push(count - boundaryCount);
  }

  items.push(...endPages);
  return items;
}

export function PIPagination({ 
  count, 
  page, 
  onChange, 
  siblingCount = 1, 
  boundaryCount = 1, 
  disabled,
  total,
  pageSize = 20,
  showInfo = true,
  showFirstLast = true,
  compact = false
}: PIPaginationProps) {
  const items = usePagination({ count, page, siblingCount, boundaryCount });
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(page.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(page.toString());
  }, [page]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (count <= 0) return null;

  const startItem = total ? (page - 1) * pageSize + 1 : null;
  const endItem = total ? Math.min(page * pageSize, total) : null;

  const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newPage = parseInt(inputValue);
      if (!isNaN(newPage) && newPage >= 1 && newPage <= count) {
        onChange(newPage);
        setIsEditing(false);
      } else {
        setInputValue(page.toString());
        setIsEditing(false);
      }
    } else if (e.key === 'Escape') {
      setInputValue(page.toString());
      setIsEditing(false);
    }
  };

  const handlePageInputBlur = () => {
    const newPage = parseInt(inputValue);
    if (!isNaN(newPage) && newPage >= 1 && newPage <= count) {
      onChange(newPage);
    } else {
      setInputValue(page.toString());
    }
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full px-2">
      {/* Result Info */}
      {showInfo && (
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {total && startItem && endItem ? (
            <span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {startItem.toLocaleString()}
              </span>
              {' - '}
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {endItem.toLocaleString()}
              </span>
              {' of '}
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {total.toLocaleString()}
              </span>
              {' results'}
            </span>
          ) : (
            <span>
              Page <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{page}</span> of{' '}
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{count}</span>
            </span>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* First Page Button */}
        {showFirstLast && !compact && (
          <PIButton
            variant="ghost"
            size="small"
            disabled={disabled || page <= 1}
            onClick={() => onChange(1)}
            className="px-2"
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </PIButton>
        )}

        {/* Previous Page Button */}
        <PIButton
          variant="ghost"
          size="small"
          disabled={disabled || page <= 1}
          onClick={() => onChange(Math.max(1, page - 1))}
          className="px-2 sm:px-3"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          {!compact && <span className="ml-1 hidden md:inline">Prev</span>}
        </PIButton>

        {/* Page Numbers */}
        {!compact && (
          <div className="flex items-center gap-1">
            {items.map((item, idx) => {
              if (item === 'start-ellipsis' || item === 'end-ellipsis') {
                return (
                  <span 
                    key={`${item}-${idx}`} 
                    className="px-2 py-1 text-sm" 
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    …
                  </span>
                );
              }
              const isActive = item === page;
              return (
                <PIButton
                  key={item}
                  variant={isActive ? 'primary' : 'ghost'}
                  size="small"
                  onClick={() => onChange(item)}
                  disabled={disabled}
                  className="min-w-[2.5rem]"
                  style={{
                    ...(isActive && {
                      fontWeight: 600,
                    }),
                  }}
                >
                  {item}
                </PIButton>
              );
            })}
          </div>
        )}

        {/* Page Input (for compact mode or direct navigation) */}
        {compact && (
          <div className="flex items-center gap-2 px-2">
            {isEditing ? (
              <input
                ref={inputRef}
                type="number"
                min={1}
                max={count}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handlePageInput}
                onBlur={handlePageInputBlur}
                className="w-16 px-2 py-1 text-sm text-center rounded border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-sm rounded transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }}
              >
                {page} / {count}
              </button>
            )}
          </div>
        )}

        {/* Next Page Button */}
        <PIButton
          variant="ghost"
          size="small"
          disabled={disabled || page >= count}
          onClick={() => onChange(Math.min(count, page + 1))}
          className="px-2 sm:px-3"
          title="Next page"
        >
          {!compact && <span className="mr-1 hidden md:inline">Next</span>}
          <ChevronRight className="w-4 h-4" />
        </PIButton>

        {/* Last Page Button */}
        {showFirstLast && !compact && (
          <PIButton
            variant="ghost"
            size="small"
            disabled={disabled || page >= count}
            onClick={() => onChange(count)}
            className="px-2"
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </PIButton>
        )}
      </div>
    </div>
  );
}

export default PIPagination;











