import { Link } from 'react-router-dom';
import { Plus, ShoppingBasket } from 'lucide-react';
import type { Product } from '@/types';
import { useCart, type CartVendor } from '@/contexts/CartContext';
import { Button, ImageWithFallback, QuantityStepper } from '@/components/ui';
import { formatCurrency } from '@/utils/format';

export function ProductCard({
  product,
  vendor,
  onAdd,
  showVendor,
}: {
  product: Product;
  vendor: CartVendor | null;
  onAdd: (product: Product, vendor: CartVendor) => void;
  showVendor?: boolean;
}) {
  const { quantityOf, setQuantity, vendor: cartVendor } = useCart();
  const qty = cartVendor?.id === product.vendor_id ? quantityOf(product.id) : 0;
  const vendorClosed = product.vendor?.is_open === false;
  const disabled = !product.is_available || vendorClosed || !vendor;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <Link to={`/products/${product.id}`} className="relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
        <ImageWithFallback
          src={product.image_url}
          alt={product.name}
          className="aspect-[4/3] w-full"
          fallbackIcon={<ShoppingBasket className="h-8 w-8" />}
        />
        {!product.is_available && (
          <span className="absolute left-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-xs font-medium text-white">
            Out of stock
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to={`/products/${product.id}`} className="line-clamp-2 font-medium text-slate-900 hover:text-brand-700">
          {product.name}
        </Link>
        <p className="mt-0.5 text-xs text-slate-500">
          {showVendor && product.vendor?.name ? `${product.vendor.name} · ` : ''}
          {product.unit ? `per ${product.unit}` : product.category}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(product.price)}</span>
          {qty > 0 ? (
            <QuantityStepper size="sm" value={qty} onChange={(v) => setQuantity(product.id, v)} />
          ) : (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Plus className="h-4 w-4" />}
              disabled={disabled}
              onClick={() => vendor && onAdd(product, vendor)}
              aria-label={`Add ${product.name} to cart`}
            >
              Add
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Builds the cart vendor snapshot from a product's embedded vendor (search results). */
export function cartVendorFromProduct(p: Product): CartVendor | null {
  if (!p.vendor) return null;
  return { id: p.vendor.id, name: p.vendor.name, delivery_fee: Number(p.vendor.delivery_fee ?? 0) };
}
