import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Banknote, CreditCard, MapPin, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '@/contexts/CartContext';
import { useAsync } from '@/hooks/useAsync';
import { authService } from '@/services/authService';
import { orderService } from '@/services/orderService';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  PageHeader,
  SkeletonList,
  Textarea,
} from '@/components/ui';
import { AddressFormModal } from '@/components/customer/AddressForm';
import { getErrorMessage } from '@/utils/errors';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { PaymentMethod } from '@/types';

export default function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const addresses = useAsync(() => authService.listAddresses(), []);
  const [addressId, setAddressId] = useState<string>('');
  const [payment, setPayment] = useState<PaymentMethod>('cod');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!addressId && addresses.data?.length) {
      setAddressId((addresses.data.find((a) => a.is_default) ?? addresses.data[0]!).id);
    }
  }, [addresses.data, addressId]);

  if (!cart.items.length && !placing) return <Navigate to="/cart" replace />;

  const placeOrder = async () => {
    if (!addressId) {
      setError('Choose a delivery address.');
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      const order = await orderService.create({
        vendor_id: cart.vendor!.id,
        address_id: addressId,
        payment_method: payment,
        notes: notes.trim() || undefined,
        items: cart.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      cart.clear();
      toast.success('Order placed! The shop will confirm shortly.');
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setPlacing(false);
    }
  };

  return (
    <div>
      <PageHeader title="Checkout" description={`Ordering from ${cart.vendor?.name}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Delivery address"
              action={
                <Button size="sm" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
                  New address
                </Button>
              }
            />
            <CardBody>
              {addresses.loading ? (
                <SkeletonList rows={2} />
              ) : addresses.error ? (
                <ErrorState message={addresses.error} onRetry={() => void addresses.reload()} />
              ) : !addresses.data?.length ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                  <MapPin className="mx-auto h-6 w-6 text-slate-400" aria-hidden />
                  <p className="mt-2 text-sm text-slate-600">You haven't saved any addresses yet.</p>
                  <Button className="mt-4" size="sm" onClick={() => setAddOpen(true)}>
                    Add an address
                  </Button>
                </div>
              ) : (
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="sr-only">Delivery address</legend>
                  {addresses.data.map((a) => (
                    <label
                      key={a.id}
                      className={cn(
                        'flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors',
                        addressId === a.id ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300',
                      )}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={a.id}
                        checked={addressId === a.id}
                        onChange={() => setAddressId(a.id)}
                        className="mt-1 h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="min-w-0 text-sm">
                        <span className="font-medium text-slate-900">{a.label}</span>
                        {a.is_default && <span className="ml-2 text-xs text-brand-700">Default</span>}
                        <span className="mt-0.5 block text-slate-500">
                          {[a.line1, a.line2, a.city, a.postal_code].filter(Boolean).join(', ')}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Payment method" />
            <CardBody>
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Payment method</legend>
                {(
                  [
                    { value: 'cod', label: 'Cash on delivery', description: 'Pay the rider when it arrives', icon: Banknote },
                    { value: 'online', label: 'Pay online', description: 'UPI / card via the payment gateway', icon: CreditCard },
                  ] as const
                ).map((m) => (
                  <label
                    key={m.value}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                      payment === m.value ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300',
                    )}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={m.value}
                      checked={payment === m.value}
                      onChange={() => setPayment(m.value)}
                      className="sr-only"
                    />
                    <m.icon className="mt-0.5 h-5 w-5 text-slate-500" aria-hidden />
                    <span className="text-sm">
                      <span className="block font-medium text-slate-900">{m.label}</span>
                      <span className="text-slate-500">{m.description}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Notes for the shop" description="Optional — e.g. packaging or substitution preferences." />
            <CardBody>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Add a note…" aria-label="Order notes" />
            </CardBody>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader title="Summary" />
          <CardBody className="space-y-3 text-sm">
            <ul className="space-y-2">
              {cart.items.map((i) => (
                <li key={i.product_id} className="flex justify-between gap-3 text-slate-600">
                  <span className="min-w-0 truncate">
                    {i.quantity} × {i.name}
                  </span>
                  <span className="tabular-nums">{formatCurrency(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery fee</span>
                <span className="tabular-nums">{cart.deliveryFee ? formatCurrency(cart.deliveryFee) : 'Free'}</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(cart.total)}</span>
              </div>
            </div>
            {error && <Alert tone="error">{error}</Alert>}
            <Button fullWidth size="lg" loading={placing} disabled={!addressId} onClick={() => void placeOrder()}>
              Place order · {formatCurrency(cart.total)}
            </Button>
            <p className="text-center text-xs text-slate-500">
              Final prices are confirmed by the server. <Link to="/cart" className="underline">Edit cart</Link>
            </p>
          </CardBody>
        </Card>
      </div>

      <AddressFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={async (data) => {
          const created = await authService.createAddress(data);
          addresses.setData((prev) => [...(prev ?? []), created]);
          setAddressId(created.id);
          toast.success('Address saved');
        }}
      />
    </div>
  );
}
