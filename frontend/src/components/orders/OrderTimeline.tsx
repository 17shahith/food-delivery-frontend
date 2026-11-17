import { Check, X } from 'lucide-react';
import type { OrderStatus, StatusEvent } from '@/types';
import { buildTimeline } from '@/utils/orderStatus';
import { formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';

export function OrderTimeline({
  status,
  history,
  compact,
}: {
  status: OrderStatus;
  history: StatusEvent[];
  compact?: boolean;
}) {
  const steps = buildTimeline(status, history);
  const halted = status === 'rejected' || status === 'cancelled';
  const haltEvent = halted ? history.find((h) => h.status === status) : undefined;

  return (
    <ol className="relative" aria-label="Order progress">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0" aria-current={step.state === 'current' ? 'step' : undefined}>
            {!last && (
              <span
                className={cn(
                  'absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5',
                  step.state === 'done' ? 'bg-brand-500' : 'bg-slate-200',
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                step.state === 'done' && 'border-brand-500 bg-brand-500 text-white',
                step.state === 'current' && 'border-brand-500 bg-white text-brand-600 ring-4 ring-brand-100',
                step.state === 'upcoming' && 'border-slate-200 bg-white text-slate-400',
                step.state === 'halted' && 'border-red-500 bg-red-500 text-white',
              )}
            >
              {step.state === 'done' ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : step.state === 'halted' ? (
                <X className="h-4 w-4" aria-hidden />
              ) : (
                i + 1
              )}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.state === 'upcoming' ? 'text-slate-400' : 'text-slate-900',
                    step.state === 'halted' && 'text-red-700',
                  )}
                >
                  {step.state === 'halted' ? (status === 'rejected' ? 'Order rejected' : 'Order cancelled') : step.label}
                </p>
                {step.timestamp && step.state !== 'halted' && (
                  <time className="text-xs tabular-nums text-slate-500" dateTime={step.timestamp}>
                    {formatDateTime(step.timestamp)}
                  </time>
                )}
                {step.state === 'halted' && haltEvent && (
                  <time className="text-xs tabular-nums text-slate-500" dateTime={haltEvent.created_at}>
                    {formatDateTime(haltEvent.created_at)}
                  </time>
                )}
              </div>
              {!compact && (step.state === 'current' || step.state === 'halted') && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {step.state === 'halted' ? haltEvent?.note || 'This order was stopped.' : step.description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
