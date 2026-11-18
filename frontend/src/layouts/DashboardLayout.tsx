import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Menu, ShoppingCart, User as UserIcon, X, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Avatar } from '@/components/ui';
import { NotificationMenu } from '@/components/notifications/NotificationMenu';
import { APP_NAME, ROLE_LABEL } from '@/utils/constants';
import { cn } from '@/utils/cn';
import type { Role } from '@/types';
import { NAVIGATION, notificationsPath, profilePath } from './navigation';

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-slate-900">
        <Zap className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-lg font-semibold tracking-tight text-slate-900">{APP_NAME}</span>
    </Link>
  );
}

function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const { itemCount } = useCart();
  const { unreadCount } = useNotifications();
  const counts = { cart: itemCount, notifications: unreadCount };

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Main">
      {NAVIGATION[role].map((section, si) => (
        <div key={si}>
          {section.title && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{section.title}</p>
          )}
          <ul className="space-y-1">
            {section.items.map((item) => {
              const count = item.badge ? counts[item.badge] : 0;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      )
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && (
                      <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-slate-900">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserMenu() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!user) return null;
  const profile = profilePath(user.role);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-slate-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.full_name} src={user.avatar_url} size="sm" />
        <span className="hidden text-left md:block">
          <span className="block max-w-[10rem] truncate text-sm font-medium text-slate-900">{user.full_name}</span>
          <span className="block text-xs text-slate-500">{ROLE_LABEL[user.role]}</span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-surface p-1 shadow-lg">
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="truncate text-sm font-medium text-slate-900">{user.full_name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          {profile && (
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                navigate(profile);
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <UserIcon className="h-4 w-4" aria-hidden /> Profile
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DashboardLayout() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { unreadCount } = useNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setBellOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-slate-100 px-4">
          <Brand />
        </div>
        <SidebarNav role={user.role} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[900] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav role={user.role} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="flex-1" />
          {user.role === 'customer' && (
            <Link
              to="/cart"
              className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100"
              aria-label={`Cart, ${itemCount} items`}
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold text-slate-900">
                  {itemCount}
                </span>
              )}
            </Link>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setBellOpen((o) => !o)}
              className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100"
              aria-label={`Notifications, ${unreadCount} unread`}
              aria-expanded={bellOpen}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-surface" aria-hidden />
              )}
            </button>
            {bellOpen && (
              <NotificationMenu onClose={() => setBellOpen(false)} viewAllTo={notificationsPath(user.role)} />
            )}
          </div>
          <UserMenu />
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
