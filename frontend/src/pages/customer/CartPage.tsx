import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBasket, ShoppingCart, Store, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAsync } from '@/hooks/useAsync';
import { vendorService } from '@/services/vendorService';
import { Alert, Button, Card, CardBody, CardHeader, ConfirmDialog, EmptyState, ImageWithFallback, PageHeader, QuantityStepper } from '@/components/ui';
import { formatCurrency } from '@/utils/format';

export default function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [confirmClear, setConfirmClear] = useState(false);
  // Re-check the shop so we can warn about closures / minimum order before checkout.
  const vendor = useAsync(() => vendorService.get(cart.vendor!.id), [cart.vendor?.id], !!cart.vendor);

  if (!cart.items.length) {
    return (
      <div>
        <PageHeader title="Your cart" />
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
          title="Your cart is empty"
          description="Browse nearby shops and add a few things to get started."
          action={
            <Link to="/vendors">
              <Button>Browse shops</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const v = vendor.data;
  const minOrder = Number(v?.min_order_amount ?? 0);
  const belowMin = minOrder > 0 && cart.subtotal < minOrder;
  const closed = v ? !v.is_open : false;

  return (
    <div>
      <PageHeader
        title="Your cart"
        description={`${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'} from ${cart.vendor?.name}`}
        actions={
          <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmClear(true)}>
            Clear cart
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader
            title={
              <Link to={`/vendors/${cart.vendor?.id}`} className="flex items-center gap-2 hover:text-brand-700">
                <Store className="h-4 w-4 text-slate-400" aria-hidden /> {cart.vendor?.name}
              </Link>
            }
            action={
              <Link to={`/vendors/${cart.vendor?.id}`} className="text-sm font-medium text-brand-700 hover:text-brand-800">
                Add more items
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100">
            {cart.items.map((item) => (
              <li key={item.product_id} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:flex-nowrap">
                <ImageWithFallback
                  src={item.image_url}
                  alt={item.name}
                  className="h-16 w-16 shrink-0 rounded-xl"
                  fallbackIcon={<ShoppingBasket className="h-5 w-5" />}
                />
                <div className="min-w-0 flex-1">
                  <Link to={`/products/${item.product_id}`} className="font-medium text-slate-900 hover:text-brand-700">
                    {item.name}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {formatCurrency(item.price)}
                    {item.unit ? ` / ${item.unit}` : ''}
                  </p>
                </div>
                <div className="flex w-full items-center justify-between gap-4 sm:w-auto">
                  <QuantityStepper value={item.quantity} onChange={(q) => cart.setQuantity(item.product_id, q)} size="sm" />
                  <span className="w-20 text-right font-semibold tabular-nums text-slate-900">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => cart.removeItem(item.product_id)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card className="lg:sticky lg:top-24">
            <CardHeader title="Order summary" />
            <CardBody className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery fee</span>
                <span className="tabular-nums">{cart.deliveryFee ? formatCurrency(cart.deliveryFee) : 'Free'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(cart.total)}</span>
              </div>
              {closed && <Alert tone="warning">This shop is closed right now. You can check out once it reopens.</Alert>}
              {belowMin && (
                <Alert tone="warning">
                  Add {formatCurrency(minOrder - cart.subtotal)} more to reach the {formatCurrency(minOrder)} minimum order.
                </Alert>
              )}
              <Button
                fullWidth
                size="lg"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                disabled={closed || belowMin || vendor.loading}
                onClick={() => navigate('/checkout')}
              >
                Proceed to checkout
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          cart.clear();
          setConfirmClear(false);
        }}
        title="Clear your cart?"
        message="All items will be removed from your cart."
        confirmLabel="Clear cart"
        tone="danger"
      />
    </div>
  );
}
