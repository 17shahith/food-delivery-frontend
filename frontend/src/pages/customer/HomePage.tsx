import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LocateFixed, MapPin, Package, Search, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { vendorService } from '@/services/vendorService';
import { orderService } from '@/services/orderService';
import { Button, EmptyState, ErrorState, SkeletonGrid } from '@/components/ui';
import { VendorCard } from '@/components/customer/VendorCard';
import { OrderCard } from '@/components/orders/OrderCard';
import { ACTIVE_STATUSES } from '@/utils/orderStatus';
import { VENDOR_CATEGORIES } from '@/utils/constants';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { location, isPrecise, locate, locating, error: locError } = useCurrentLocation();

  const vendors = useAsync(
    () => vendorService.list({ latitude: location.latitude, longitude: location.longitude, radius_km: 10, sort: 'distance' }),
    [location.latitude, location.longitude],
  );
  const activeOrders = useAsync(() => orderService.mine(ACTIVE_STATUSES), []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/vendors?tab=products&q=${encodeURIComponent(q)}` : '/vendors');
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-[#7E67BF] to-[#362961] px-6 py-8 text-white sm:px-10 sm:py-10">
        <p className="text-sm text-white/75">Hi {user?.full_name.split(' ')[0]} 👋</p>
        <h1 className="mt-1 max-w-xl text-2xl font-semibold leading-tight sm:text-3xl">
          What do you need from the neighbourhood today?
        </h1>
        <form onSubmit={onSearch} className="mt-6 flex max-w-xl flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products like milk, bread, paracetamol…"
              aria-label="Search products"
              className="h-12 w-full rounded-xl border-0 bg-surface pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/60"
            />
          </div>
          <Button type="submit" size="lg" variant="secondary">
            Search
          </Button>
        </form>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/75">
          <MapPin className="h-4 w-4" aria-hidden />
          <span>{isPrecise ? 'Showing shops near your location' : 'Showing shops near the default area'}</span>
          <button
            type="button"
            onClick={() => void locate()}
            disabled={locating}
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 font-medium text-white hover:bg-white/20 disabled:opacity-60"
          >
            <LocateFixed className="h-3.5 w-3.5" aria-hidden />
            {locating ? 'Locating…' : 'Use my location'}
          </button>
        </div>
        {locError && <p className="mt-2 text-xs text-amber-200">{locError}</p>}
      </section>

      {activeOrders.data && activeOrders.data.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Active orders</h2>
            <Link to="/orders" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              View all
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {activeOrders.data.slice(0, 4).map((o) => (
              <OrderCard key={o.id} order={o} to={`/orders/${o.id}`} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Shop by category</h2>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {VENDOR_CATEGORIES.map((c) => (
            <Link
              key={c}
              to={`/vendors?category=${encodeURIComponent(c)}`}
              className="whitespace-nowrap rounded-full border border-slate-200 bg-surface px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nearby shops</h2>
          <Link to="/vendors" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
            See all <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {vendors.loading ? (
          <SkeletonGrid count={6} />
        ) : vendors.error ? (
          <ErrorState message={vendors.error} onRetry={() => void vendors.reload()} />
        ) : !vendors.data?.length ? (
          <EmptyState
            icon={<Store className="h-6 w-6" />}
            title="No shops nearby yet"
            description="We couldn't find shops within 10 km. Try another location or browse all shops."
            action={
              <Link to="/vendors">
                <Button variant="outline">Browse all shops</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.data.slice(0, 9).map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        )}
      </section>

      {!activeOrders.loading && !activeOrders.data?.length && (
        <section className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-surface p-5 sm:flex-row sm:items-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Package className="h-5 w-5" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="font-medium text-slate-900">Track every order live</p>
            <p className="text-sm text-slate-500">Once you place an order you can follow your rider on the map in real time.</p>
          </div>
          <Link to="/orders">
            <Button variant="outline" size="sm">
              Order history
            </Button>
          </Link>
        </section>
      )}
    </div>
  );
}
