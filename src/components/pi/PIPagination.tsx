import React from 'react';
import { PIButton } from './PIButton';

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

interface PIPaginationProps {
  count: number; // total pages
  page: number; // current page (1-based)
  onChange: (page: number) => void;
  siblingCount?: number; // pages on each side of current
  boundaryCount?: number; // pages at the start and end
  disabled?: boolean;
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

export function PIPagination({ count, page, onChange, siblingCount = 1, boundaryCount = 1, disabled }: PIPaginationProps) {
  const items = usePagination({ count, page, siblingCount, boundaryCount });

  if (count <= 0) return null;

  return (
    <div className="flex items-center gap-2">
      <PIButton
        variant="outline"
        size="small"
        disabled={disabled || page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
      >
        Prev
      </PIButton>

      {items.map((item, idx) => {
        if (item === 'start-ellipsis' || item === 'end-ellipsis') {
          return (
            <span key={`${item}-${idx}`} className="px-2 text-[var(--neutral-600)]">…</span>
          );
        }
        const isActive = item === page;
        return (
          <PIButton
            key={item}
            variant={isActive ? 'default' : 'outline'}
            size="small"
            onClick={() => onChange(item)}
            disabled={disabled}
          >
            {item}
          </PIButton>
        );
      })}

      <PIButton
        variant="outline"
        size="small"
        disabled={disabled || page >= count}
        onClick={() => onChange(Math.min(count, page + 1))}
      >
        Next
      </PIButton>
    </div>
  );
}

export default PIPagination;











