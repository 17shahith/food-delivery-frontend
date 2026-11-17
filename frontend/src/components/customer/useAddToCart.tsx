import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useCart, type CartVendor } from '@/contexts/CartContext';
import { ConfirmDialog } from '@/components/ui';
import type { Product } from '@/types';

interface Pending {
  product: Product;
  vendor: CartVendor;
  quantity: number;
}

/**
 * Add-to-cart with a confirmation step when the product belongs to a different
 * shop than the current cart. Render `dialog` once in the calling component.
 */
export function useAddToCart() {
  const cart = useCart();
  const [pending, setPending] = useState<Pending | null>(null);

  const add = useCallback(
    (product: Product, vendor: CartVendor, quantity = 1) => {
      if (!product.is_available) {
        toast.error('This item is currently unavailable.');
        return;
      }
      if (cart.conflictsWith(vendor.id)) {
        setPending({ product, vendor, quantity });
        return;
      }
      cart.addItem(product, vendor, quantity);
      toast.success(`${product.name} added to cart`, { id: `cart-${product.id}` });
    },
    [cart],
  );

  const dialog = (
    <ConfirmDialog
      open={!!pending}
      onClose={() => setPending(null)}
      onConfirm={() => {
        if (!pending) return;
        cart.addItem(pending.product, pending.vendor, pending.quantity);
        toast.success(`Cart replaced with items from ${pending.vendor.name}`);
        setPending(null);
      }}
      title="Start a new cart?"
      message={
        <>
          Your cart has items from <strong>{cart.vendor?.name}</strong>. Orders are delivered from one shop at a time —
          adding this item will clear your current cart.
        </>
      }
      confirmLabel="Replace cart"
      tone="danger"
    />
  );

  return { add, dialog };
}
