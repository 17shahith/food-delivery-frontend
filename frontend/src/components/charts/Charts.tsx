import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Lightweight SVG charts (no chart dependency). Single-series only — each measure
 * gets its own chart (never a dual axis). Colors follow the validated reference
 * palette: series #6250d6 on the cream card surface; recessive grid/axis ink.
 */
const C = {
  series: '#6250d6',
  seriesFill: 'rgba(98, 80, 214, 0.14)',
  grid: '#E9D6BA',
  axis: '#D9C2A3',
  muted: '#76665A',
  surface: '#FFF8EE',
};

export interface Datum {
  label: string;
  value: number;
  /** Optional longer label for tooltips (e.g. full date). */
  title?: string;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/** "Nice" axis maximum and 4 evenly spaced ticks. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return Array.from({ length: count + 1 }, (_, i) => +(i * step).toFixed(10));
}

function compact(n: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

const PAD = { top: 12, right: 12, bottom: 28, left: 44 };

function Tooltip({ x, y, children, containerWidth }: { x: number; y: number; children: ReactNode; containerWidth: number }) {
  const flip = x > containerWidth - 140;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-xs shadow-lg"
      style={{ left: x, top: y, transform: `translate(${flip ? 'calc(-100% - 10px)' : '10px'}, -50%)` }}
    >
      {children}
    </div>
  );
}

function GridAndAxis({
  ticks,
  yScale,
  width,
  formatTick,
}: {
  ticks: number[];
  yScale: (v: number) => number;
  width: number;
  formatTick: (v: number) => string;
}) {
  return (
    <g>
      {ticks.map((t, i) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={yScale(t)}
            y2={yScale(t)}
            stroke={i === 0 ? C.axis : C.grid}
            strokeWidth={1}
          />
          <text x={PAD.left - 8} y={yScale(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={C.muted} className="tabular-nums">
            {formatTick(t)}
          </text>
        </g>
      ))}
    </g>
  );
}

function xLabelStep(n: number, plotWidth: number) {
  const fit = Math.max(1, Math.floor(plotWidth / 56));
  return Math.max(1, Math.ceil(n / fit));
}

export function BarChart({
  data,
  height = 220,
  formatValue = (v) => String(v),
  ariaLabel,
}: {
  data: Datum[];
  height?: number;
  formatValue?: (v: number) => string;
  ariaLabel: string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1]!;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const band = data.length ? plotW / data.length : 0;
  const gap = Math.max(2, band * 0.25);
  const barW = Math.max(1, Math.min(32, band - gap));
  const yScale = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const step = xLabelStep(data.length, plotW);

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
          <GridAndAxis ticks={ticks} yScale={yScale} width={width} formatTick={compact} />
          {data.map((d, i) => {
            const cx = PAD.left + band * i + band / 2;
            const x = cx - barW / 2;
            const y = yScale(d.value);
            const h = PAD.top + plotH - y;
            const r = Math.min(4, barW / 2, h);
            // Rounded data-end (top), square at the baseline.
            const path =
              h <= 0
                ? ''
                : `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${y + h} Z`;
            return (
              <g key={d.label + i}>
                {path && <path d={path} fill={C.series} opacity={hover == null || hover === i ? 1 : 0.55} />}
                {i % step === 0 && (
                  <text x={cx} y={height - 8} textAnchor="middle" fontSize={11} fill={C.muted}>
                    {d.label}
                  </text>
                )}
                {/* Hit target: full column, larger than the mark */}
                <rect
                  x={PAD.left + band * i}
                  y={PAD.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  tabIndex={-1}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hover != null && data[hover] && (
        <Tooltip x={PAD.left + band * hover + band / 2} y={yScale(data[hover]!.value)} containerWidth={width}>
          <p className="text-slate-500">{data[hover]!.title ?? data[hover]!.label}</p>
          <p className="font-semibold tabular-nums text-slate-900">{formatValue(data[hover]!.value)}</p>
        </Tooltip>
      )}
    </div>
  );
}

export function LineChart({
  data,
  height = 220,
  formatValue = (v) => String(v),
  ariaLabel,
}: {
  data: Datum[];
  height?: number;
  formatValue?: (v: number) => string;
  ariaLabel: string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1]!;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const xScale = (i: number) => PAD.left + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const yScale = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const step = xLabelStep(data.length, plotW);

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${xScale(i)},${yScale(d.value)}`).join(' ');
  const area = data.length
    ? `${line} L${xScale(data.length - 1)},${PAD.top + plotH} L${xScale(0)},${PAD.top + plotH} Z`
    : '';

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / Math.max(1, rect.width);
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1)))));
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <GridAndAxis ticks={ticks} yScale={yScale} width={width} formatTick={compact} />
          <path d={area} fill={C.seriesFill} />
          <path d={line} fill="none" stroke={C.series} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {data.map((d, i) =>
            i % step === 0 ? (
              <text key={d.label + i} x={xScale(i)} y={height - 8} textAnchor="middle" fontSize={11} fill={C.muted}>
                {d.label}
              </text>
            ) : null,
          )}
          {hover != null && data[hover] && (
            <g pointerEvents="none">
              <line x1={xScale(hover)} x2={xScale(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke={C.axis} strokeWidth={1} />
              <circle cx={xScale(hover)} cy={yScale(data[hover]!.value)} r={5} fill={C.series} stroke={C.surface} strokeWidth={2} />
            </g>
          )}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
      )}
      {hover != null && data[hover] && (
        <Tooltip x={xScale(hover)} y={yScale(data[hover]!.value)} containerWidth={width}>
          <p className="text-slate-500">{data[hover]!.title ?? data[hover]!.label}</p>
          <p className="font-semibold tabular-nums text-slate-900">{formatValue(data[hover]!.value)}</p>
        </Tooltip>
      )}
    </div>
  );
}

/** Ranked horizontal bars with text labels — for category magnitudes. */
export function BarList({
  data,
  formatValue = (v) => String(v),
}: {
  data: Datum[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label} title={`${d.title ?? d.label}: ${formatValue(d.value)}`}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{d.label}</span>
            <span className="tabular-nums font-medium text-slate-900">{formatValue(d.value)}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full"
              style={{ width: `${(d.value / max) * 100}%`, minWidth: d.value > 0 ? 4 : 0, background: C.series }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Accessible table fallback for any chart. */
export function DataTable({
  data,
  labelHeader,
  valueHeader,
  formatValue = (v) => String(v),
}: {
  data: Datum[];
  labelHeader: string;
  valueHeader: string;
  formatValue?: (v: number) => string;
}) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">{labelHeader}</th>
            <th className="px-3 py-2 text-right">{valueHeader}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((d, i) => (
            <tr key={d.label + i}>
              <td className="px-3 py-2 text-slate-700">{d.title ?? d.label}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-900">{formatValue(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
