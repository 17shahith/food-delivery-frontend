import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { STATUS_META, type Tone } from '@/utils/orderStatus';
import type { ApprovalStatus, OrderStatus } from '@/types';

const tones: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
};

const dots: Record<Tone, string> = {
  gray: 'bg-slate-400',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
  teal: 'bg-teal-500',
  green: 'bg-emerald-500',
  red: 'bg-red-500',
};

export function Badge({
  tone = 'gray',
  children,
  dot,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone])} aria-hidden />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'gray' as Tone };
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  );
}

const approvalTone: Record<ApprovalStatus, Tone> = { pending: 'amber', approved: 'green', rejected: 'red' };

export function ApprovalBadge({ status }: { status: ApprovalStatus | null | undefined }) {
  const s = status ?? 'pending';
  return (
    <Badge tone={approvalTone[s]} dot>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </Badge>
  );
}
