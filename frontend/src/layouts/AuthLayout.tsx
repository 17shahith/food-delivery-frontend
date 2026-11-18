import { Outlet, Link } from 'react-router-dom';
import { Bike, MapPinned, Store, Zap } from 'lucide-react';
import { APP_NAME } from '@/utils/constants';

export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Link to="/login" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-slate-900">
            <Zap className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">{APP_NAME}</span>
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
        <p className="text-center text-xs text-slate-400">© {new Date().getFullYear()} {APP_NAME}. Local delivery, tracked live.</p>
      </div>

      <div className="relative hidden overflow-hidden bg-[#4A3880] lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#9A86CF] via-[#6A55A8] to-[#362961]" />
        <div className="relative flex h-full flex-col justify-center px-14 text-white">
          <h2 className="max-w-md text-3xl font-semibold leading-tight">
            Everything from your neighbourhood, delivered in minutes.
          </h2>
          <p className="mt-4 max-w-md text-white/75">
            Shop from local stores, follow your rider on a live map, and get notified at every step.
          </p>
          <ul className="mt-10 space-y-5">
            {[
              { icon: Store, title: 'Local vendors', text: 'Groceries, meals, pharmacy and more near you.' },
              { icon: Bike, title: 'Trusted riders', text: 'Verified riders pick up and deliver your order.' },
              { icon: MapPinned, title: 'Live tracking', text: 'Watch your order move in real time.' },
            ].map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <f.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-white/75">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
