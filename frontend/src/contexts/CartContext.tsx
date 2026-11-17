import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { Product } from '@/types';
import { storage, STORAGE_KEYS } from '@/utils/storage';

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  image_url?: string | null;
  unit?: string | null;
  quantity: number;
}

export interface CartVendor {
  id: string;
  name: string;
  delivery_fee: number;
}

export interface CartState {
  vendor: CartVendor | null;
  items: CartItem[];
}

export type CartAction =
  | { type: 'add'; product: Product; vendor: CartVendor; quantity: number }
  | { type: 'setQty'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' };

export const MAX_QTY = 99;
const emptyCart: CartState = { vendor: null, items: [] };

/**
 * Single-vendor cart: a hyperlocal order is fulfilled by one shop. Adding an item
 * from a different vendor replaces the cart (the UI confirms first).
 */
export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const { product, vendor, quantity } = action;
      const base = state.vendor && state.vendor.id !== vendor.id ? emptyCart : state;
      const existing = base.items.find((i) => i.product_id === product.id);
      const items = existing
        ? base.items.map((i) =>
            i.product_id === product.id ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i,
          )
        : [
            ...base.items,
            {
              product_id: product.id,
              name: product.name,
              price: Number(product.price),
              image_url: product.image_url,
              unit: product.unit,
              quantity: Math.min(MAX_QTY, quantity),
            },
          ];
      return { vendor, items };
    }
    case 'setQty': {
      if (action.quantity <= 0) return cartReducer(state, { type: 'remove', productId: action.productId });
      return {
        ...state,
        items: state.items.map((i) =>
          i.product_id === action.productId ? { ...i, quantity: Math.min(MAX_QTY, action.quantity) } : i,
        ),
      };
    }
    case 'remove': {
      const items = state.items.filter((i) => i.product_id !== action.productId);
      return items.length ? { ...state, items } : emptyCart;
    }
    case 'clear':
      return emptyCart;
    default:
      return state;
  }
}

interface CartContextValue extends CartState {
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  addItem: (product: Product, vendor: CartVendor, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  quantityOf: (productId: string) => number;
  /** true if adding from this vendor would replace the current cart. */
  conflictsWith: (vendorId: string) => boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, () =>
    storage.get<CartState>(STORAGE_KEYS.cart, emptyCart),
  );

  useEffect(() => storage.set(STORAGE_KEYS.cart, state), [state]);

  const addItem = useCallback(
    (product: Product, vendor: CartVendor, quantity = 1) => dispatch({ type: 'add', product, vendor, quantity }),
    [],
  );
  const setQuantity = useCallback(
    (productId: string, quantity: number) => dispatch({ type: 'setQty', productId, quantity }),
    [],
  );
  const removeItem = useCallback((productId: string) => dispatch({ type: 'remove', productId }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = state.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveryFee = state.items.length ? Number(state.vendor?.delivery_fee ?? 0) : 0;
    return {
      ...state,
      itemCount: state.items.reduce((s, i) => s + i.quantity, 0),
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      addItem,
      setQuantity,
      removeItem,
      clear,
      quantityOf: (id) => state.items.find((i) => i.product_id === id)?.quantity ?? 0,
      conflictsWith: (vendorId) => !!state.vendor && state.vendor.id !== vendorId && state.items.length > 0,
    };
  }, [state, addItem, setQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
