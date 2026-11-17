import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CartProvider, cartReducer, useCart, MAX_QTY, type CartState } from '../CartContext';
import type { Product } from '@/types';

const product = (id: string, price = 10, vendor_id = 'v1'): Product => ({
  id,
  vendor_id,
  name: `Item ${id}`,
  price,
  category: 'Snacks',
  is_available: true,
});
const v1 = { id: 'v1', name: 'Shop One', delivery_fee: 20 };
const v2 = { id: 'v2', name: 'Shop Two', delivery_fee: 0 };
const empty: CartState = { vendor: null, items: [] };

describe('cartReducer', () => {
  it('adds and merges quantities', () => {
    let s = cartReducer(empty, { type: 'add', product: product('a'), vendor: v1, quantity: 1 });
    s = cartReducer(s, { type: 'add', product: product('a'), vendor: v1, quantity: 2 });
    expect(s.items).toHaveLength(1);
    expect(s.items[0]!.quantity).toBe(3);
    expect(s.vendor?.id).toBe('v1');
  });
  it('replaces the cart when adding from another vendor', () => {
    let s = cartReducer(empty, { type: 'add', product: product('a'), vendor: v1, quantity: 1 });
    s = cartReducer(s, { type: 'add', product: product('b', 5, 'v2'), vendor: v2, quantity: 1 });
    expect(s.vendor?.id).toBe('v2');
    expect(s.items.map((i) => i.product_id)).toEqual(['b']);
  });
  it('clamps quantity and removes at zero', () => {
    let s = cartReducer(empty, { type: 'add', product: product('a'), vendor: v1, quantity: 500 });
    expect(s.items[0]!.quantity).toBe(MAX_QTY);
    s = cartReducer(s, { type: 'setQty', productId: 'a', quantity: 0 });
    expect(s).toEqual(empty);
  });
});

describe('CartProvider', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

  it('computes totals and persists to localStorage', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(product('a', 30), v1, 2));
    act(() => result.current.addItem(product('b', 15), v1));
    expect(result.current.itemCount).toBe(3);
    expect(result.current.subtotal).toBe(75);
    expect(result.current.deliveryFee).toBe(20);
    expect(result.current.total).toBe(95);
    expect(result.current.conflictsWith('v2')).toBe(true);
    expect(result.current.conflictsWith('v1')).toBe(false);
    expect(JSON.parse(localStorage.getItem('qd.cart')!).items).toHaveLength(2);
  });

  it('restores from localStorage', () => {
    localStorage.setItem(
      'qd.cart',
      JSON.stringify({ vendor: v1, items: [{ product_id: 'x', name: 'X', price: 4, quantity: 3 }] }),
    );
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.subtotal).toBe(12);
    act(() => result.current.clear());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.deliveryFee).toBe(0);
  });
});
