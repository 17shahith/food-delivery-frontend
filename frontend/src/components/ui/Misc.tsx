import { useState, type ReactNode } from 'react';
import { ImageOff, Minus, Plus, Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { initials } from '@/utils/format';

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  size = 'md',
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'md' | 'lg';
  id?: string;
}) {
  const dims = size === 'lg' ? 'h-8 w-14' : 'h-6 w-11';
  const knob = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
  const shift = size === 'lg' ? 'translate-x-7' : 'translate-x-6';
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        dims,
        checked ? 'bg-brand-600' : 'bg-slate-300',
      )}
    >
      <span
        className={cn(
          'inline-block transform rounded-full bg-white shadow transition-transform',
          knob,
          checked ? shift : 'translate-x-1',
        )}
      />
    </button>
  );
}

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('-mx-1 overflow-x-auto', className)}>
      <div role="tablist" className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={value === t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
              value === t.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t.label}
            {t.count != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs',
                  value === t.value ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-600',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && <div className="mb-3">{back}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'brand',
  loading,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: 'brand' | 'blue' | 'amber' | 'violet' | 'rose';
  loading?: boolean;
}) {
  const toneCls = {
    brand: 'bg-brand-50 text-brand-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    rose: 'bg-rose-50 text-rose-700',
  }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', toneCls)}>{icon}</span>}
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded-lg bg-slate-200/70" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const dims = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' }[size];
  return src && !failed ? (
    <img
      src={src}
      alt={name ?? ''}
      onError={() => setFailed(true)}
      className={cn('shrink-0 rounded-full object-cover', dims, className)}
    />
  ) : (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700',
        dims,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function ImageWithFallback({
  src,
  alt,
  className,
  fallbackIcon,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackIcon?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn('flex items-center justify-center bg-slate-100 text-slate-400', className)} aria-label={alt} role="img">
        {fallbackIcon ?? <ImageOff className="h-6 w-6" aria-hidden />}
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn('object-cover', className)} />;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  size = 'md',
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  disabled?: boolean;
}) {
  const btn = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  return (
    <div className="inline-flex items-center rounded-xl border border-brand-200 bg-brand-50">
      <button
        type="button"
        className={cn('flex items-center justify-center rounded-l-xl text-brand-700 hover:bg-brand-100 disabled:opacity-40', btn)}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums text-brand-800" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={cn('flex items-center justify-center rounded-r-xl text-brand-700 hover:bg-brand-100 disabled:opacity-40', btn)}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function DescriptionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-slate-100">
      {items.map((it) => (
        <div key={it.label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
          <dt className="text-slate-500">{it.label}</dt>
          <dd className="text-right font-medium text-slate-900">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
