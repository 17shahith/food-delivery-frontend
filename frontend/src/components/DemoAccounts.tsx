import { useState } from 'react';
import { Bike, RotateCcw, ShieldCheck, ShoppingBag, Store } from 'lucide-react';
import { env } from '@/utils/env';
import { ConfirmDialog } from '@/components/ui';

const ACCOUNTS = [
  { email: 'customer@demo.com', label: 'Customer', hint: 'Shop & track live', icon: ShoppingBag },
  { email: 'vendor@demo.com', label: 'Vendor', hint: 'Fresh Mart owner', icon: Store },
  { email: 'rider@demo.com', label: 'Rider', hint: 'Accept deliveries', icon: Bike },
  { email: 'admin@demo.com', label: 'Admin', hint: 'Approve & monitor', icon: ShieldCheck },
];
export const DEMO_PASSWORD = 'demo1234';

/** Demo-mode helper on the login page: one-click sign-in for each role. */
export function DemoAccounts({ onPick, disabled }: { onPick: (email: string, password: string) => void; disabled?: boolean }) {
  const [confirmReset, setConfirmReset] = useState(false);
  if (!env.demoMode) return null;

  return (
    <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-brand-900">Demo accounts</p>
        <span className="text-xs text-brand-800">
          Password: <code className="rounded bg-white px-1.5 py-0.5 font-mono">{DEMO_PASSWORD}</code>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            disabled={disabled}
            onClick={() => onPick(a.email, DEMO_PASSWORD)}
            className="flex items-start gap-2 rounded-xl border border-brand-100 bg-white p-2.5 text-left transition-colors hover:border-brand-300 disabled:opacity-60"
          >
            <a.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">{a.label}</span>
              <span className="block truncate text-xs text-slate-500">{a.email}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>Runs fully in your browser — no server needed.</span>
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900"
        >
          <RotateCcw className="h-3 w-3" aria-hidden /> Reset data
        </button>
      </div>
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={async () => {
          const { resetDemoData } = await import('@/services/mock/db');
          resetDemoData();
          window.location.reload();
        }}
        title="Reset demo data?"
        message="All demo orders, products and accounts go back to their starting state."
        confirmLabel="Reset"
        tone="danger"
      />
    </div>
  );
}
