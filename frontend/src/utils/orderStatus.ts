import { ORDER_FLOW, type FlowStatus, type OrderStatus, type StatusEvent } from '@/types';

export type Tone = 'gray' | 'blue' | 'amber' | 'violet' | 'green' | 'red' | 'indigo' | 'teal';

export const STATUS_META: Record<OrderStatus, { label: string; tone: Tone; description: string }> = {
  placed: { label: 'Order Placed', tone: 'blue', description: 'Waiting for the shop to confirm' },
  accepted: { label: 'Vendor Accepted', tone: 'indigo', description: 'The shop confirmed your order' },
  preparing: { label: 'Preparing Order', tone: 'amber', description: 'Your items are being packed' },
  ready_for_pickup: { label: 'Ready for Pickup', tone: 'violet', description: 'Waiting for a rider' },
  rider_assigned: { label: 'Rider Assigned', tone: 'teal', description: 'A rider is heading to the shop' },
  picked_up: { label: 'Rider Picked Up', tone: 'teal', description: 'Your order has left the shop' },
  out_for_delivery: { label: 'Out for Delivery', tone: 'green', description: 'The rider is on the way to you' },
  delivered: { label: 'Delivered', tone: 'green', description: 'Enjoy your order!' },
  rejected: { label: 'Rejected', tone: 'red', description: 'The shop could not accept this order' },
  cancelled: { label: 'Cancelled', tone: 'gray', description: 'This order was cancelled' },
};

export const ACTIVE_STATUSES: OrderStatus[] = [
  'placed',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'rider_assigned',
  'picked_up',
  'out_for_delivery',
];

export const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'rejected', 'cancelled'];

/** Statuses for which a rider is physically moving with (or towards) the order. */
export const TRACKABLE_STATUSES: OrderStatus[] = ['rider_assigned', 'picked_up', 'out_for_delivery'];

export function isActive(status: OrderStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function isTrackable(status: OrderStatus): boolean {
  return TRACKABLE_STATUSES.includes(status);
}

export function flowIndex(status: OrderStatus): number {
  return ORDER_FLOW.indexOf(status as FlowStatus);
}

export interface TimelineStep {
  status: FlowStatus;
  label: string;
  description: string;
  state: 'done' | 'current' | 'upcoming' | 'halted';
  timestamp?: string;
}

/**
 * Builds the 8-step timeline from an order's current status + history.
 * Steps the order passed are "done", the current one is "current" (or "done"
 * once delivered), later ones are "upcoming". For rejected/cancelled orders
 * the step where the order stopped is marked "halted".
 */
export function buildTimeline(status: OrderStatus, history: StatusEvent[] = []): TimelineStep[] {
  const stamps = new Map<string, string>();
  for (const ev of history) {
    // Keep the earliest timestamp per status.
    const existing = stamps.get(ev.status);
    if (!existing || new Date(ev.created_at) < new Date(existing)) stamps.set(ev.status, ev.created_at);
  }

  let current = flowIndex(status);
  const halted = status === 'rejected' || status === 'cancelled';
  if (halted) {
    // The order always reached "placed"; find the furthest step it reached,
    // then mark the step it failed to reach as halted.
    let furthest = 0;
    ORDER_FLOW.forEach((s, i) => {
      if (stamps.has(s)) furthest = i;
    });
    current = Math.min(furthest + 1, ORDER_FLOW.length - 1);
  }

  return ORDER_FLOW.map((s, i) => {
    let state: TimelineStep['state'];
    if (halted) {
      state = i < current ? 'done' : i === current ? 'halted' : 'upcoming';
    } else if (i < current || (i === current && s === 'delivered')) {
      state = 'done';
    } else if (i === current) {
      state = 'current';
    } else {
      state = 'upcoming';
    }
    return {
      status: s,
      label: STATUS_META[s].label,
      description: STATUS_META[s].description,
      state,
      timestamp: stamps.get(s),
    };
  });
}

/** Next action a vendor can take for an order, if any. */
export function vendorNextStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case 'accepted':
      return 'preparing';
    case 'preparing':
      return 'ready_for_pickup';
    default:
      return null;
  }
}

/** Next progress step a rider can take for an order, if any. */
export function riderNextStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case 'rider_assigned':
      return 'picked_up';
    case 'picked_up':
      return 'out_for_delivery';
    case 'out_for_delivery':
      return 'delivered';
    default:
      return null;
  }
}

export const RIDER_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  picked_up: 'Confirm pickup',
  out_for_delivery: 'Start delivery',
  delivered: 'Mark as delivered',
};

export const VENDOR_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  preparing: 'Start preparing',
  ready_for_pickup: 'Mark ready for pickup',
};
