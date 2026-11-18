import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  /** Hide on small screens (the row stays readable via the primary column). */
  hideOnMobile?: boolean;
  align?: 'left' | 'right';
}

/** Simple responsive table: scrolls horizontally on small screens. */
export function DataGrid<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn('whitespace-nowrap px-4 py-3', c.align === 'right' && 'text-right', c.hideOnMobile && 'hidden md:table-cell')}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn('hover:bg-slate-50/60', onRowClick && 'cursor-pointer')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn('px-4 py-3 align-middle', c.align === 'right' && 'text-right', c.hideOnMobile && 'hidden md:table-cell', c.className)}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
