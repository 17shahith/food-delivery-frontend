import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingBasket, ShoppingCart, Store } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useCart } from '@/contexts/CartContext';
import { productService } from '@/services/productService';
import { vendorService } from '@/services/vendorService';
import { Badge, Button, ErrorState, ImageWithFallback, QuantityStepper, Skeleton } from '@/components/ui';
import { ProductCard } from '@/components/customer/ProductCard';
import { useAddToCart } from '@/components/customer/useAddToCart';
import { formatCurrency } from '@/utils/format';

export default function ProductDetailsPage() {
  const { productId = '' } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const { add, dialog } = useAddToCart();
  const cart = useCart();

  const product = useAsync(() => productService.get(productId), [productId]);
  const vendorId = product.data?.vendor_id;
  const vendor = useAsync(() => vendorService.get(vendorId!), [vendorId], !!vendorId);
  const more = useAsync(() => productService.list({ vendor_id: vendorId! }), [vendorId], !!vendorId);

  if (product.loading) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-3xl" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }
  if (product.error || !product.data) {
    return <ErrorState title="Could not load product" message={product.error} onRetry={() => void product.reload()} />;
  }

  const p = product.data;
  const v = vendor.data;
  const inCart = cart.vendor?.id === p.vendor_id ? cart.quantityOf(p.id) : 0;
  const closed = v ? !v.is_open : p.vendor?.is_open === false;
  const canAdd = p.is_available && !closed && !!v;
  const related = (more.data ?? []).filter((x) => x.id !== p.id).slice(0, 4);
  const cartVendor = v ? { id: v.id, name: v.name, delivery_fee: Number(v.delivery_fee ?? 0) } : null;

  return (
    <div className="space-y-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-8 md:grid-cols-2">
        <ImageWithFallback
          src={p.image_url}
          alt={p.name}
          className="aspect-square w-full rounded-3xl border border-slate-200"
          fallbackIcon={<ShoppingBasket className="h-12 w-12" />}
        />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="gray">{p.category}</Badge>
            {p.is_available ? (
              <Badge tone="green" dot>
                In stock{p.stock != null ? ` · ${p.stock} left` : ''}
              </Badge>
            ) : (
              <Badge tone="red" dot>
                Out of stock
              </Badge>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">{p.name}</h1>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {formatCurrency(p.price)}
            {p.unit && <span className="ml-1 text-sm font-normal text-slate-500">/ {p.unit}</span>}
          </p>
          {p.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">{p.description}</p>}

          {v && (
            <Link
              to={`/vendors/${v.id}`}
              className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-surface p-3 hover:border-slate-300"
            >
              <ImageWithFallback src={v.logo_url} alt="" className="h-10 w-10 rounded-xl" fallbackIcon={<Store className="h-5 w-5" />} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{v.name}</p>
                <p className="text-xs text-slate-500">{v.is_open ? 'Open now' : 'Closed'} · {v.category}</p>
              </div>
            </Link>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QuantityStepper value={qty} onChange={setQty} min={1} disabled={!canAdd} />
            <Button
              size="lg"
              leftIcon={<ShoppingCart className="h-4 w-4" />}
              disabled={!canAdd}
              onClick={() => cartVendor && add(p, cartVendor, qty)}
            >
              Add to cart · {formatCurrency(p.price * qty)}
            </Button>
          </div>
          {closed && <p className="mt-3 text-sm text-slate-500">The shop is closed, so this item can't be ordered right now.</p>}
          {inCart > 0 && (
            <p className="mt-3 text-sm text-slate-600">
              {inCart} already in your cart ·{' '}
              <Link to="/cart" className="font-medium text-brand-700 hover:text-brand-800">
                View cart
              </Link>
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && v && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">More from {v.name}</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} product={r} vendor={v.is_open ? cartVendor : null} onAdd={add} />
            ))}
          </div>
        </section>
      )}
      {dialog}
    </div>
  );
}
