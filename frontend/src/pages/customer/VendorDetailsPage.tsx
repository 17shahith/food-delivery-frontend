import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, PackageSearch, Phone, ShoppingCart, Star, Store } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useCart } from '@/contexts/CartContext';
import { vendorService } from '@/services/vendorService';
import { productService } from '@/services/productService';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  ImageWithFallback,
  SearchInput,
  Skeleton,
  SkeletonGrid,
} from '@/components/ui';
import { ProductCard } from '@/components/customer/ProductCard';
import { useAddToCart } from '@/components/customer/useAddToCart';
import { DeliveryMap } from '@/components/maps/DeliveryMap';
import { formatCurrency, formatDistance } from '@/utils/format';
import { cn } from '@/utils/cn';

export default function VendorDetailsPage() {
  const { vendorId = '' } = useParams();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const { add, dialog } = useAddToCart();
  const cart = useCart();

  const vendor = useAsync(() => vendorService.get(vendorId), [vendorId]);
  const products = useAsync(() => productService.list({ vendor_id: vendorId }), [vendorId]);

  const categories = useMemo(
    () => Array.from(new Set((products.data ?? []).map((p) => p.category))).sort(),
    [products.data],
  );
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (products.data ?? []).filter(
      (p) =>
        (!category || p.category === category) &&
        (!s || p.name.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s)),
    );
  }, [products.data, search, category]);

  if (vendor.loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-6 w-1/3" />
        <SkeletonGrid count={6} />
      </div>
    );
  }
  if (vendor.error || !vendor.data) {
    return (
      <ErrorState
        title="Could not load shop"
        message={vendor.error}
        onRetry={() => void vendor.reload()}
      />
    );
  }

  const v = vendor.data;
  const cartVendor = { id: v.id, name: v.name, delivery_fee: Number(v.delivery_fee ?? 0) };
  const cartHere = cart.vendor?.id === v.id && cart.itemCount > 0;

  return (
    <div className="space-y-6">
      <Link to="/vendors" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> All shops
      </Link>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
        <ImageWithFallback src={v.banner_url} alt={v.name} className="h-40 w-full sm:h-56" fallbackIcon={<Store className="h-10 w-10" />} />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <ImageWithFallback src={v.logo_url} alt="" className="-mt-12 h-20 w-20 shrink-0 rounded-2xl border-4 border-white shadow" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{v.name}</h1>
                <Badge tone={v.is_open ? 'green' : 'gray'} dot>
                  {v.is_open ? 'Open' : 'Closed'}
                </Badge>
              </div>
              <p className="text-sm text-slate-500">{v.category}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            {v.rating != null && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                {v.rating.toFixed(1)}
                {v.rating_count ? <span className="text-slate-400">({v.rating_count})</span> : null}
              </span>
            )}
            {v.distance_km != null && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" aria-hidden /> {formatDistance(v.distance_km)}
              </span>
            )}
            {v.avg_prep_minutes != null && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" aria-hidden /> ~{v.avg_prep_minutes} min prep
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Products</h2>
            <SearchInput value={search} onChange={setSearch} placeholder="Search this shop…" className="sm:w-72" />
          </div>
          {categories.length > 1 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {['', ...categories].map((c) => (
                <button
                  key={c || 'all'}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium',
                    category === c
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                  )}
                >
                  {c || 'All'}
                </button>
              ))}
            </div>
          )}
          {!v.is_open && (
            <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
              This shop is closed right now. You can browse, but ordering is disabled until it opens.
            </p>
          )}
          {products.loading ? (
            <SkeletonGrid count={6} />
          ) : products.error ? (
            <ErrorState message={products.error} onRetry={() => void products.reload()} />
          ) : !filtered.length ? (
            <EmptyState
              icon={<PackageSearch className="h-6 w-6" />}
              title={products.data?.length ? 'No matching products' : 'No products yet'}
              description={products.data?.length ? 'Try a different search or category.' : 'This shop has not listed any products.'}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={{ ...p, vendor: p.vendor ?? { id: v.id, name: v.name, is_open: v.is_open, delivery_fee: v.delivery_fee } }}
                  vendor={v.is_open ? cartVendor : null}
                  onAdd={add}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardBody className="space-y-3 text-sm">
              {v.description && <p className="text-slate-600">{v.description}</p>}
              <p className="flex items-start gap-2 text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden /> {v.address}
              </p>
              {v.phone && (
                <a href={`tel:${v.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-brand-700">
                  <Phone className="h-4 w-4 text-slate-400" aria-hidden /> {v.phone}
                </a>
              )}
              {v.opening_hours && (
                <p className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400" aria-hidden /> {v.opening_hours}
                </p>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-3 text-slate-600">
                <span>Delivery fee</span>
                <span className="font-medium text-slate-900">
                  {v.delivery_fee ? formatCurrency(v.delivery_fee) : 'Free'}
                </span>
              </div>
              {v.min_order_amount ? (
                <div className="flex justify-between text-slate-600">
                  <span>Minimum order</span>
                  <span className="font-medium text-slate-900">{formatCurrency(v.min_order_amount)}</span>
                </div>
              ) : null}
            </CardBody>
          </Card>
          <DeliveryMap vendor={{ ...v, name: v.name, address: v.address }} className="h-56" />
          {cartHere && (
            <Link to="/cart" className="block">
              <Button fullWidth size="lg" leftIcon={<ShoppingCart className="h-4 w-4" />}>
                View cart · {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} · {formatCurrency(cart.subtotal)}
              </Button>
            </Link>
          )}
        </aside>
      </div>
      {dialog}
    </div>
  );
}
