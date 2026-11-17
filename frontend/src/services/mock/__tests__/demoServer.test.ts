import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { handleRequest, HttpError } from '../server';
import { resetDemoData } from '../db';
import type { Order, Product, RiderLocation, User, Vendor } from '@/types';

const call = <T>(method: string, path: string, token: string | null, body?: unknown, query: Record<string, string> = {}) =>
  handleRequest(method, path, query, body, token) as Promise<T>;

async function login(email: string) {
  const res = await call<{ access_token: string; user: User }>('POST', '/auth/login', null, { email, password: 'demo1234' });
  return res.access_token;
}

describe('demo backend', () => {
  beforeEach(() => resetDemoData());
  afterEach(() => vi.useRealTimers());

  it('logs in all four demo accounts and rejects bad passwords', async () => {
    for (const e of ['customer', 'vendor', 'rider', 'admin']) {
      const t = await login(`${e}@demo.com`);
      const me = await call<User>('GET', '/auth/me', t);
      expect(me.role).toBe(e);
    }
    await expect(call('POST', '/auth/login', null, { email: 'customer@demo.com', password: 'nope' })).rejects.toBeInstanceOf(HttpError);
  });

  it('runs the full manual flow: customer → vendor → rider → delivered', async () => {
    const customer = await login('customer@demo.com');
    const vendor = await login('vendor@demo.com');
    const rider = await login('rider@demo.com');

    const shops = await call<Vendor[]>('GET', '/vendors', customer, undefined, { latitude: '12.97', longitude: '77.59' });
    expect(shops.length).toBeGreaterThan(4);
    const fm = shops.find((s) => s.name === 'Fresh Mart')!;
    const products = await call<Product[]>('GET', '/products', customer, undefined, { vendor_id: fm.id });
    const rice = products.find((p) => p.name.startsWith('Basmati'))!;

    const order = await call<Order>('POST', '/orders', customer, {
      vendor_id: fm.id,
      address_id: 'a-home',
      items: [{ product_id: rice.id, quantity: 1 }],
      payment_method: 'cod',
    });
    expect(order.status).toBe('placed');
    expect(order.total).toBe(rice.price + 25);

    await call('POST', `/orders/${order.id}/accept`, vendor);
    await call('PATCH', `/orders/${order.id}/status`, vendor, { status: 'preparing' });
    await call('PATCH', `/orders/${order.id}/status`, vendor, { status: 'ready_for_pickup' });

    await call('PATCH', '/riders/me/availability', rider, { is_online: true });
    const available = await call<Order[]>('GET', '/deliveries/available', rider);
    expect(available.some((o) => o.id === order.id)).toBe(true);

    await call('POST', `/deliveries/${order.id}/accept`, rider);
    const loc = await call<RiderLocation>('GET', `/tracking/orders/${order.id}`, customer);
    expect(loc.latitude).toBeTypeOf('number');

    for (const s of ['picked_up', 'out_for_delivery', 'delivered']) {
      await call('PATCH', `/deliveries/${order.id}/status`, rider, { status: s });
    }
    const final = await call<Order>('GET', `/orders/${order.id}`, customer);
    expect(final.status).toBe('delivered');
    expect(final.status_history.map((h) => h.status)).toEqual([
      'placed', 'accepted', 'preparing', 'ready_for_pickup', 'rider_assigned', 'picked_up', 'out_for_delivery', 'delivered',
    ]);
    const notes = await call<{ title: string }[]>('GET', '/notifications', customer);
    expect(notes.some((n) => n.title === 'Delivered')).toBe(true);
  });

  it('enforces transitions and ownership', async () => {
    const vendor = await login('vendor@demo.com');
    const customer = await login('customer@demo.com');
    const orders = await call<Order[]>('GET', '/vendors/me/orders', vendor, undefined, { status: 'placed' });
    const o = orders[0]!;
    await expect(call('PATCH', `/orders/${o.id}/status`, vendor, { status: 'ready_for_pickup' })).rejects.toMatchObject({ status: 409 });
    await expect(call('POST', `/orders/${o.id}/accept`, customer)).rejects.toMatchObject({ status: 403 });
    await expect(call('GET', '/admin/stats', customer)).rejects.toMatchObject({ status: 403 });
  });

  it('auto-progresses simulated orders and moves the rider', async () => {
    const customer = await login('customer@demo.com');
    const start = Date.now();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(start + 70_000);
    const mine = await call<Order[]>('GET', '/orders/me', customer);
    const sim = mine.find((o) => o.vendor?.name === 'Spice Route Kitchen' && o.status !== 'delivered')!;
    expect(sim.status).toBe('out_for_delivery');
    const a = await call<RiderLocation>('GET', `/tracking/orders/${sim.id}`, customer);
    vi.setSystemTime(start + 110_000);
    const b = await call<RiderLocation>('GET', `/tracking/orders/${sim.id}`, customer);
    expect(a.latitude !== b.latitude || a.longitude !== b.longitude).toBe(true);
    vi.setSystemTime(start + 200_000);
    const done = await call<Order>('GET', `/orders/${sim.id}`, customer);
    expect(done.status).toBe('delivered');
  });

  it('serves admin analytics, approvals and registration', async () => {
    const admin = await login('admin@demo.com');
    const analytics = await call<{ daily: unknown[]; top_vendors: unknown[] }>('GET', '/admin/analytics', admin, undefined, { days: '30' });
    expect(analytics.daily).toHaveLength(30);
    expect(analytics.top_vendors.length).toBeGreaterThan(0);

    const pending = await call<Vendor[]>('GET', '/admin/vendors', admin, undefined, { status: 'pending' });
    expect(pending).toHaveLength(1);
    await call('POST', `/admin/vendors/${pending[0]!.id}/approve`, admin, {});
    expect(await call<Vendor[]>('GET', '/admin/vendors', admin, undefined, { status: 'pending' })).toHaveLength(0);

    const reg = await call<{ user: User }>('POST', '/auth/register', null, {
      email: 'new@shop.com', password: 'abc12345', full_name: 'New Rider', role: 'rider', vehicle_type: 'scooter', vehicle_number: 'X1',
    });
    expect(reg.user.approval_status).toBe('pending');
  });
});
