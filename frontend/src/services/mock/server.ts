/**
 * DEMO MODE ONLY — implements the backend contract from the README in the browser.
 * Orders at shops without a demo login progress automatically, with a simulated
 * rider moving on the map. Fresh Mart (vendor@demo.com) orders need the vendor and
 * rider@demo.com to act, so the full multi-role flow can be tried by hand.
 */
import type {
  AdminStats,
  AnalyticsData,
  AppNotification,
  LatLng,
  Order,
  OrderStatus,
  Product,
  RiderLocation,
  User,
  Vendor,
} from '@/types';
import { ORDER_STEPS, iso, loadDb, makeOrder, offset, saveDb, type DB, type DemoOrder, type DemoUser } from './db';

export class HttpError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

export interface Ctx {
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  token: string | null;
}

type Handler = (ctx: Ctx, db: DB) => unknown;

// ------------------------------------------------------------------ helpers

const now = () => Date.now();
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;
const ACTIVE: OrderStatus[] = ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'rider_assigned', 'picked_up', 'out_for_delivery'];

function km(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
const lerp = (a: LatLng, b: LatLng, t: number): LatLng => ({
  latitude: a.latitude + (b.latitude - a.latitude) * t,
  longitude: a.longitude + (b.longitude - a.longitude) * t,
});
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function body<T>(ctx: Ctx): T {
  return (ctx.body ?? {}) as T;
}

function publicUser(db: DB, u: DemoUser): User {
  const { password: _pw, ...rest } = u;
  void _pw;
  let approval = rest.approval_status ?? null;
  if (u.role === 'vendor') approval = db.vendors.find((v) => v.user_id === u.id)?.approval_status ?? approval;
  if (u.role === 'rider') approval = db.riders.find((r) => r.user_id === u.id)?.approval_status ?? approval;
  return { ...rest, approval_status: approval };
}

function auth(ctx: Ctx, db: DB, roles?: User['role'][]): DemoUser {
  const id = ctx.token?.startsWith('demo.') ? ctx.token.slice(5) : null;
  const user = id ? db.users.find((u) => u.id === id) : undefined;
  if (!user) throw new HttpError(401, 'Not authenticated.');
  if (!user.is_active) throw new HttpError(403, 'This account has been deactivated.');
  if (roles && !roles.includes(user.role)) throw new HttpError(403, 'You do not have permission to do that.');
  return user;
}

function myVendor(db: DB, user: DemoUser): Vendor {
  const v = db.vendors.find((x) => x.user_id === user.id);
  if (!v) throw new HttpError(404, 'Store not found.');
  return v;
}

function riderProfile(db: DB, user: DemoUser) {
  const r = db.riders.find((x) => x.user_id === user.id);
  if (!r) throw new HttpError(404, 'Rider profile not found.');
  return r;
}

function findOrder(db: DB, id: string): DemoOrder {
  const o = db.orders.find((x) => x.id === id);
  if (!o) throw new HttpError(404, 'Order not found.');
  return o;
}

function hydrate(db: DB, o: DemoOrder): Order {
  const v = db.vendors.find((x) => x.id === o.vendor_id);
  const c = db.users.find((x) => x.id === o.customer_id);
  const r = o.rider_id ? db.users.find((x) => x.id === o.rider_id) : undefined;
  const rp = r ? db.riders.find((x) => x.user_id === r.id) : undefined;
  const { sim: _s, sim_start: _ss, skipped_by: _sb, ...rest } = o;
  void _s;
  void _ss;
  void _sb;
  return {
    ...rest,
    vendor: v ? { id: v.id, name: v.name, address: v.address, latitude: v.latitude, longitude: v.longitude, phone: v.phone, logo_url: v.logo_url } : null,
    customer: c ? { id: c.id, full_name: c.full_name, phone: c.phone } : null,
    rider: r ? { id: r.id, full_name: r.full_name, phone: r.phone, vehicle_type: rp?.vehicle_type, vehicle_number: rp?.vehicle_number } : null,
  };
}

function setStatus(o: DemoOrder, status: OrderStatus, at = now(), note?: string) {
  o.status = status;
  o.status_history.push({ status, created_at: iso(at), ...(note ? { note } : {}) });
  o.updated_at = iso(at);
}

function notify(db: DB, user_id: string, title: string, message: string, type: AppNotification['type'], order_id: string | null = null, at = now()) {
  db.notifications.push({ id: uid('n'), user_id, title, message, type, order_id, is_read: false, created_at: iso(at) });
}

const vendorName = (db: DB, o: DemoOrder) => db.vendors.find((v) => v.id === o.vendor_id)?.name ?? 'The shop';

/** Customer-facing notification for each status change. */
function notifyCustomer(db: DB, o: DemoOrder, status: OrderStatus, at = now()) {
  const shop = vendorName(db, o);
  const msg: Partial<Record<OrderStatus, [string, string]>> = {
    accepted: ['Order accepted', `${shop} accepted order #${o.order_number}.`],
    ready_for_pickup: ['Order packed', `Order #${o.order_number} is packed and waiting for a rider.`],
    rider_assigned: ['Rider assigned', `A rider is heading to ${shop} to collect your order.`],
    out_for_delivery: ['Out for delivery', `Your order #${o.order_number} is on the way. Track it live!`],
    delivered: ['Delivered', `Order #${o.order_number} was delivered. Enjoy!`],
    rejected: ['Order rejected', `${shop} could not accept order #${o.order_number}.`],
  };
  const m = msg[status];
  if (m) notify(db, o.customer_id, m[0], m[1], status === 'out_for_delivery' || status === 'rider_assigned' ? 'delivery' : 'order', o.id, at);
}

// ------------------------------------------------------------------ simulation

/** Seconds after placing at which a simulated order reaches each status. */
const SIM_AT: Partial<Record<OrderStatus, number>> = {
  accepted: 6,
  preparing: 12,
  ready_for_pickup: 25,
  rider_assigned: 30,
  picked_up: 55,
  out_for_delivery: 60,
  delivered: 150,
};
const TO_VENDOR_MS = 25000;
const TO_CUSTOMER_MS = 90000;
const SIM_RIDER = 'u-rider2';

function advanceSimulations(db: DB): boolean {
  let changed = false;
  const t = now();
  for (const o of db.orders) {
    if (!o.sim || !o.sim_start || !ACTIVE.includes(o.status)) continue;
    let idx = ORDER_STEPS.indexOf(o.status);
    while (idx < ORDER_STEPS.length - 1) {
      const next = ORDER_STEPS[idx + 1]!;
      const at = o.sim_start + (SIM_AT[next] ?? 0) * 1000;
      if (at > t) break;
      if (next === 'rider_assigned') o.rider_id = SIM_RIDER;
      setStatus(o, next, at);
      notifyCustomer(db, o, next, at);
      if (next === 'delivered') {
        const rp = db.riders.find((r) => r.user_id === o.rider_id);
        if (rp) rp.total_deliveries = (rp.total_deliveries ?? 0) + 1;
      }
      idx++;
      changed = true;
    }
  }
  return changed;
}

const stamp = (o: DemoOrder, s: OrderStatus) => {
  const ev = [...o.status_history].reverse().find((h) => h.status === s);
  return ev ? +new Date(ev.created_at) : null;
};

/** Rider position for an order: real GPS if recent and plausible, else simulated along the route. */
function riderPosition(db: DB, o: DemoOrder): RiderLocation | null {
  if (!o.rider_id || !['rider_assigned', 'picked_up', 'out_for_delivery'].includes(o.status)) return null;
  const v = db.vendors.find((x) => x.id === o.vendor_id);
  if (!v) return null;
  const t = now();
  const real = db.locations[o.rider_id];
  if (real && t - +new Date(real.updated_at) < 60000 && km(real, v) < 30) {
    return { ...real, order_id: o.id };
  }
  const start = offset(v, 1.1, -0.9);
  let pos: LatLng = v;
  if (o.status === 'rider_assigned') {
    pos = lerp(start, v, clamp01((t - (stamp(o, 'rider_assigned') ?? t)) / TO_VENDOR_MS));
  } else if (o.status === 'out_for_delivery') {
    pos = lerp(v, o.delivery_address, clamp01((t - (stamp(o, 'out_for_delivery') ?? t)) / TO_CUSTOMER_MS));
  }
  const name = db.users.find((u) => u.id === o.rider_id)?.full_name;
  return { rider_id: o.rider_id, order_id: o.id, ...pos, updated_at: iso(t), rider_name: name };
}

// ------------------------------------------------------------------ routes

const routes: [string, string, Handler][] = [];
const on = (method: string, path: string, h: Handler) => routes.push([method, path, h]);

// ---- Auth
on('POST', '/auth/login', (ctx, db) => {
  const { email, password } = body<{ email: string; password: string }>(ctx);
  const u = db.users.find((x) => x.email.toLowerCase() === String(email).toLowerCase());
  if (!u || u.password !== password) throw new HttpError(401, 'Invalid email or password.');
  if (!u.is_active) throw new HttpError(403, 'This account has been deactivated. Contact support.');
  return { access_token: `demo.${u.id}`, refresh_token: `demo.${u.id}`, token_type: 'bearer', user: publicUser(db, u) };
});

on('POST', '/auth/register', (ctx, db) => {
  const b = body<Record<string, string | number | undefined>>(ctx);
  const email = String(b.email ?? '').toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === email)) throw new HttpError(409, 'An account with this email already exists.');
  const role = b.role as User['role'];
  const u: DemoUser = {
    id: uid('u'),
    email,
    password: String(b.password),
    full_name: String(b.full_name),
    phone: (b.phone as string) ?? null,
    role,
    is_active: true,
    approval_status: role === 'customer' ? null : 'pending',
    avatar_url: null,
    created_at: iso(now()),
  };
  db.users.push(u);
  if (role === 'vendor') {
    db.vendors.push({
      id: uid('v'),
      user_id: u.id,
      name: String(b.store_name),
      category: String(b.store_category),
      address: String(b.store_address),
      latitude: Number(b.latitude),
      longitude: Number(b.longitude),
      phone: u.phone,
      is_open: false,
      approval_status: 'pending',
      delivery_fee: 20,
      rating: null,
      rating_count: 0,
      created_at: u.created_at,
    });
  }
  if (role === 'rider') {
    db.riders.push({
      id: uid('r'),
      user_id: u.id,
      vehicle_type: (b.vehicle_type as never) ?? 'scooter',
      vehicle_number: (b.vehicle_number as string) ?? null,
      is_online: false,
      approval_status: 'pending',
      total_deliveries: 0,
      created_at: u.created_at,
    });
  }
  if (role !== 'customer') {
    const admin = db.users.find((x) => x.role === 'admin');
    if (admin) notify(db, admin.id, 'New application', `${u.full_name} registered as a ${role} and needs approval.`, 'approval');
  }
  notify(db, u.id, 'Welcome to QuickDrop!', role === 'customer' ? 'Browse nearby shops to place your first order.' : 'Your account is under review.', 'system');
  return { access_token: `demo.${u.id}`, refresh_token: `demo.${u.id}`, token_type: 'bearer', user: publicUser(db, u) };
});

on('POST', '/auth/logout', () => ({}));
on('POST', '/auth/forgot-password', () => ({ message: 'If an account exists, a reset link was sent (demo: no email is actually sent).' }));
on('GET', '/auth/me', (ctx, db) => publicUser(db, auth(ctx, db)));
on('PATCH', '/auth/me', (ctx, db) => {
  const u = auth(ctx, db);
  const b = body<Partial<User>>(ctx);
  if (b.full_name !== undefined) u.full_name = b.full_name;
  if (b.phone !== undefined) u.phone = b.phone;
  if (b.avatar_url !== undefined) u.avatar_url = b.avatar_url;
  return publicUser(db, u);
});
on('POST', '/auth/change-password', (ctx, db) => {
  const u = auth(ctx, db);
  const b = body<{ current_password: string; new_password: string }>(ctx);
  if (b.current_password !== u.password) throw new HttpError(400, 'Current password is incorrect.');
  u.password = b.new_password;
  return {};
});

// ---- Addresses
on('GET', '/customers/me/addresses', (ctx, db) => {
  const u = auth(ctx, db, ['customer']);
  return db.addresses.filter((a) => a.user_id === u.id);
});
on('POST', '/customers/me/addresses', (ctx, db) => {
  const u = auth(ctx, db, ['customer']);
  const b = body<Record<string, unknown>>(ctx);
  const mine = db.addresses.filter((a) => a.user_id === u.id);
  const isDefault = Boolean(b.is_default) || mine.length === 0;
  if (isDefault) mine.forEach((a) => (a.is_default = false));
  const a = { ...(b as object), id: uid('a'), user_id: u.id, is_default: isDefault } as DB['addresses'][number];
  db.addresses.push(a);
  return a;
});
on('PATCH', '/customers/me/addresses/:id', (ctx, db) => {
  const u = auth(ctx, db, ['customer']);
  const a = db.addresses.find((x) => x.id === ctx.params.id && x.user_id === u.id);
  if (!a) throw new HttpError(404, 'Address not found.');
  const b = body<Record<string, unknown>>(ctx);
  if (b.is_default) db.addresses.filter((x) => x.user_id === u.id).forEach((x) => (x.is_default = false));
  Object.assign(a, b, { id: a.id, user_id: u.id });
  return a;
});
on('DELETE', '/customers/me/addresses/:id', (ctx, db) => {
  const u = auth(ctx, db, ['customer']);
  db.addresses = db.addresses.filter((x) => !(x.id === ctx.params.id && x.user_id === u.id));
  return {};
});

// ---- Vendors (owner routes before /vendors/:id)
on('GET', '/vendors/me', (ctx, db) => myVendor(db, auth(ctx, db, ['vendor'])));
on('PATCH', '/vendors/me', (ctx, db) => {
  const v = myVendor(db, auth(ctx, db, ['vendor']));
  Object.assign(v, body<Partial<Vendor>>(ctx), { id: v.id, user_id: v.user_id, approval_status: v.approval_status });
  return v;
});
on('GET', '/vendors/me/stats', (ctx, db) => {
  const v = myVendor(db, auth(ctx, db, ['vendor']));
  const today = new Date().toDateString();
  const mine = db.orders.filter((o) => o.vendor_id === v.id);
  const todays = mine.filter((o) => new Date(o.created_at).toDateString() === today);
  return {
    orders_today: todays.length,
    revenue_today: todays.filter((o) => !['rejected', 'cancelled'].includes(o.status)).reduce((s, o) => s + o.subtotal, 0),
    pending_orders: mine.filter((o) => o.status === 'placed').length,
    active_orders: mine.filter((o) => ['accepted', 'preparing', 'ready_for_pickup'].includes(o.status)).length,
    total_products: db.products.filter((p) => p.vendor_id === v.id).length,
    completed_orders: mine.filter((o) => o.status === 'delivered').length,
  };
});
on('GET', '/vendors/me/orders', (ctx, db) => {
  const v = myVendor(db, auth(ctx, db, ['vendor']));
  const statuses = ctx.query.status?.split(',').filter(Boolean);
  return db.orders
    .filter((o) => o.vendor_id === v.id && (!statuses || statuses.includes(o.status)))
    .map((o) => hydrate(db, o));
});
on('GET', '/vendors/me/products', (ctx, db) => {
  const v = myVendor(db, auth(ctx, db, ['vendor']));
  return db.products.filter((p) => p.vendor_id === v.id);
});
on('GET', '/vendors', (ctx, db) => {
  auth(ctx, db);
  const q = ctx.query;
  const here = q.latitude ? { latitude: Number(q.latitude), longitude: Number(q.longitude) } : null;
  const s = q.search?.toLowerCase();
  let list = db.vendors
    .filter((v) => v.approval_status === 'approved')
    .filter((v) => !s || v.name.toLowerCase().includes(s) || v.category.toLowerCase().includes(s))
    .filter((v) => !q.category || v.category === q.category)
    .filter((v) => q.open_now !== 'true' || v.is_open)
    .map((v) => ({ ...v, distance_km: here ? Math.round(km(here, v) * 10) / 10 : null }));
  if (q.sort === 'rating') list = list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  else if (q.sort === 'name') list = list.sort((a, b) => a.name.localeCompare(b.name));
  else list = list.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
  // Demo: radius is not enforced so shops stay visible wherever the browser is.
  return list;
});
on('GET', '/vendors/:id', (ctx, db) => {
  auth(ctx, db);
  const v = db.vendors.find((x) => x.id === ctx.params.id);
  if (!v) throw new HttpError(404, 'Shop not found.');
  return v;
});

// ---- Products
const withVendor = (db: DB, p: Product): Product => {
  const v = db.vendors.find((x) => x.id === p.vendor_id);
  return { ...p, vendor: v ? { id: v.id, name: v.name, is_open: v.is_open, delivery_fee: v.delivery_fee } : null };
};
on('GET', '/products', (ctx, db) => {
  auth(ctx, db);
  const q = ctx.query;
  const s = q.search?.toLowerCase();
  const approved = new Set(db.vendors.filter((v) => v.approval_status === 'approved').map((v) => v.id));
  return db.products
    .filter((p) => approved.has(p.vendor_id))
    .filter((p) => !q.vendor_id || p.vendor_id === q.vendor_id)
    .filter((p) => !s || p.name.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s) || p.category.toLowerCase().includes(s))
    .filter((p) => !q.category || p.category === q.category)
    .filter((p) => !q.min_price || p.price >= Number(q.min_price))
    .filter((p) => !q.max_price || p.price <= Number(q.max_price))
    .filter((p) => q.available !== 'true' || p.is_available)
    .map((p) => withVendor(db, p));
});
on('POST', '/products/upload-image', async (ctx, db) => {
  auth(ctx, db, ['vendor']);
  const file = ctx.body instanceof FormData ? ctx.body.get('file') : null;
  if (!(file instanceof Blob)) throw new HttpError(400, 'No file uploaded.');
  return { url: await shrinkImage(file) };
});
on('POST', '/products', (ctx, db) => {
  const v = myVendor(db, auth(ctx, db, ['vendor']));
  const p: Product = { ...(body<Product>(ctx) as Product), id: uid('p'), vendor_id: v.id, created_at: iso(now()) };
  db.products.push(p);
  return p;
});
on('GET', '/products/:id', (ctx, db) => {
  auth(ctx, db);
  const p = db.products.find((x) => x.id === ctx.params.id);
  if (!p) throw new HttpError(404, 'Product not found.');
  return withVendor(db, p);
});
const ownProduct = (ctx: Ctx, db: DB) => {
  const v = myVendor(db, auth(ctx, db, ['vendor']));
  const p = db.products.find((x) => x.id === ctx.params.id && x.vendor_id === v.id);
  if (!p) throw new HttpError(404, 'Product not found.');
  return p;
};
on('PATCH', '/products/:id/availability', (ctx, db) => {
  const p = ownProduct(ctx, db);
  p.is_available = Boolean(body<{ is_available: boolean }>(ctx).is_available);
  return p;
});
on('PATCH', '/products/:id', (ctx, db) => {
  const p = ownProduct(ctx, db);
  Object.assign(p, body<Partial<Product>>(ctx), { id: p.id, vendor_id: p.vendor_id });
  return p;
});
on('DELETE', '/products/:id', (ctx, db) => {
  const p = ownProduct(ctx, db);
  db.products = db.products.filter((x) => x.id !== p.id);
  return {};
});

// ---- Orders
on('POST', '/orders', (ctx, db) => {
  const u = auth(ctx, db, ['customer']);
  const b = body<{ vendor_id: string; address_id: string; items: { product_id: string; quantity: number }[]; payment_method: 'cod' | 'online'; notes?: string }>(ctx);
  const v = db.vendors.find((x) => x.id === b.vendor_id && x.approval_status === 'approved');
  if (!v) throw new HttpError(404, 'Shop not found.');
  if (!v.is_open) throw new HttpError(400, `${v.name} is closed right now.`);
  const address = db.addresses.find((a) => a.id === b.address_id && a.user_id === u.id);
  if (!address) throw new HttpError(400, 'Please choose a valid delivery address.');
  if (!b.items?.length) throw new HttpError(400, 'Your cart is empty.');
  const items = b.items.map((i) => {
    const p = db.products.find((x) => x.id === i.product_id && x.vendor_id === v.id);
    if (!p) throw new HttpError(400, 'An item in your cart is no longer sold by this shop.');
    if (!p.is_available) throw new HttpError(400, `${p.name} is out of stock.`);
    return { product: p, qty: Math.max(1, Math.min(99, Math.floor(i.quantity))) };
  });
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  if (v.min_order_amount && subtotal < v.min_order_amount) throw new HttpError(400, `Minimum order at ${v.name} is ${v.min_order_amount}.`);
  const o = makeOrder(db, { vendor: v, customerId: u.id, items, status: 'placed', placedAt: now(), rng: Math.random, address });
  o.payment_method = b.payment_method;
  o.notes = b.notes ?? null;
  const vendorOwner = db.users.find((x) => x.id === v.user_id);
  const demoOperated = vendorOwner?.email === 'vendor@demo.com' || !vendorOwner?.email.endsWith('@demo.com');
  if (!demoOperated) {
    o.sim = true;
    o.sim_start = now();
  }
  db.orders.push(o);
  notify(db, v.user_id, 'New order received', `${u.full_name} placed order #${o.order_number}.`, 'order', o.id);
  return hydrate(db, o);
});
on('GET', '/orders/me', (ctx, db) => {
  const u = auth(ctx, db, ['customer']);
  const statuses = ctx.query.status?.split(',').filter(Boolean);
  return db.orders.filter((o) => o.customer_id === u.id && (!statuses || statuses.includes(o.status))).map((o) => hydrate(db, o));
});
on('GET', '/orders/:id', (ctx, db) => {
  const u = auth(ctx, db);
  const o = findOrder(db, ctx.params.id!);
  const v = db.vendors.find((x) => x.id === o.vendor_id);
  const allowed =
    u.role === 'admin' ||
    o.customer_id === u.id ||
    v?.user_id === u.id ||
    (u.role === 'rider' && (o.rider_id === u.id || (o.status === 'ready_for_pickup' && !o.rider_id)));
  if (!allowed) throw new HttpError(403, 'You do not have access to this order.');
  return hydrate(db, o);
});
on('POST', '/orders/:id/cancel', (ctx, db) => {
  const u = auth(ctx, db, ['customer']);
  const o = findOrder(db, ctx.params.id!);
  if (o.customer_id !== u.id) throw new HttpError(403, 'Not your order.');
  if (o.status !== 'placed') throw new HttpError(409, 'This order can no longer be cancelled.');
  setStatus(o, 'cancelled', now(), body<{ reason?: string }>(ctx).reason || 'Cancelled by customer');
  o.sim = false;
  notify(db, db.vendors.find((v) => v.id === o.vendor_id)!.user_id, 'Order cancelled', `Order #${o.order_number} was cancelled by the customer.`, 'order', o.id);
  return hydrate(db, o);
});
const vendorOrder = (ctx: Ctx, db: DB) => {
  const v = myVendor(db, auth(ctx, db, ['vendor']));
  const o = findOrder(db, ctx.params.id!);
  if (o.vendor_id !== v.id) throw new HttpError(403, 'Not your order.');
  return o;
};
on('POST', '/orders/:id/accept', (ctx, db) => {
  const o = vendorOrder(ctx, db);
  if (o.status !== 'placed') throw new HttpError(409, 'Only new orders can be accepted.');
  setStatus(o, 'accepted');
  notifyCustomer(db, o, 'accepted');
  return hydrate(db, o);
});
on('POST', '/orders/:id/reject', (ctx, db) => {
  const o = vendorOrder(ctx, db);
  if (o.status !== 'placed') throw new HttpError(409, 'Only new orders can be rejected.');
  const reason = body<{ reason?: string }>(ctx).reason || 'Rejected by the shop';
  o.rejection_reason = reason;
  setStatus(o, 'rejected', now(), reason);
  notifyCustomer(db, o, 'rejected');
  return hydrate(db, o);
});
on('PATCH', '/orders/:id/status', (ctx, db) => {
  const o = vendorOrder(ctx, db);
  const next = body<{ status: OrderStatus }>(ctx).status;
  const ok = (o.status === 'accepted' && next === 'preparing') || (o.status === 'preparing' && next === 'ready_for_pickup');
  if (!ok) throw new HttpError(409, `Cannot move an order from ${o.status} to ${next}.`);
  setStatus(o, next);
  notifyCustomer(db, o, next);
  if (next === 'ready_for_pickup') {
    db.riders
      .filter((r) => r.is_online && r.approval_status === 'approved' && r.user_id !== SIM_RIDER)
      .forEach((r) => notify(db, r.user_id, 'Delivery available', `Order #${o.order_number} at ${vendorName(db, o)} is ready for pickup.`, 'delivery', o.id));
  }
  return hydrate(db, o);
});

// ---- Riders & deliveries
on('GET', '/riders/me', (ctx, db) => riderProfile(db, auth(ctx, db, ['rider'])));
on('PATCH', '/riders/me', (ctx, db) => {
  const r = riderProfile(db, auth(ctx, db, ['rider']));
  const b = body<{ vehicle_type?: string; vehicle_number?: string }>(ctx);
  if (b.vehicle_type) r.vehicle_type = b.vehicle_type as never;
  if (b.vehicle_number !== undefined) r.vehicle_number = b.vehicle_number || null;
  return r;
});
on('PATCH', '/riders/me/availability', (ctx, db) => {
  const r = riderProfile(db, auth(ctx, db, ['rider']));
  if (r.approval_status !== 'approved') throw new HttpError(403, 'Your rider account has not been approved yet.');
  r.is_online = Boolean(body<{ is_online: boolean }>(ctx).is_online);
  return r;
});
on('GET', '/riders/me/stats', (ctx, db) => {
  const u = auth(ctx, db, ['rider']);
  const r = riderProfile(db, u);
  const today = new Date().toDateString();
  const done = db.orders.filter((o) => o.rider_id === u.id && o.status === 'delivered');
  const todays = done.filter((o) => new Date(o.updated_at ?? o.created_at).toDateString() === today);
  return {
    deliveries_today: todays.length,
    earnings_today: todays.reduce((s, o) => s + Number(o.rider_earning ?? 0), 0),
    total_deliveries: done.length,
    rating: r.rating,
  };
});
on('GET', '/riders/me/deliveries', (ctx, db) => {
  const u = auth(ctx, db, ['rider']);
  const statuses = ctx.query.status?.split(',').filter(Boolean);
  return db.orders.filter((o) => o.rider_id === u.id && (!statuses || statuses.includes(o.status))).map((o) => hydrate(db, o));
});
on('GET', '/deliveries/available', (ctx, db) => {
  const u = auth(ctx, db, ['rider']);
  const r = riderProfile(db, u);
  if (!r.is_online || r.approval_status !== 'approved') return [];
  return db.orders
    .filter((o) => o.status === 'ready_for_pickup' && !o.rider_id && !o.sim && !(o.skipped_by ?? []).includes(u.id))
    .map((o) => hydrate(db, o));
});
on('POST', '/deliveries/:id/accept', (ctx, db) => {
  const u = auth(ctx, db, ['rider']);
  const r = riderProfile(db, u);
  if (!r.is_online) throw new HttpError(400, 'Go online to accept deliveries.');
  const o = findOrder(db, ctx.params.id!);
  if (o.status !== 'ready_for_pickup' || o.rider_id) throw new HttpError(409, 'This delivery was already taken by another rider.');
  o.rider_id = u.id;
  setStatus(o, 'rider_assigned');
  notifyCustomer(db, o, 'rider_assigned');
  notify(db, db.vendors.find((v) => v.id === o.vendor_id)!.user_id, 'Rider on the way', `${u.full_name} will pick up order #${o.order_number}.`, 'delivery', o.id);
  return hydrate(db, o);
});
on('POST', '/deliveries/:id/reject', (ctx, db) => {
  const u = auth(ctx, db, ['rider']);
  const o = findOrder(db, ctx.params.id!);
  o.skipped_by = [...(o.skipped_by ?? []), u.id];
  return {};
});
on('PATCH', '/deliveries/:id/status', (ctx, db) => {
  const u = auth(ctx, db, ['rider']);
  const o = findOrder(db, ctx.params.id!);
  if (o.rider_id !== u.id) throw new HttpError(403, 'This delivery is not assigned to you.');
  const next = body<{ status: OrderStatus }>(ctx).status;
  const ok =
    (o.status === 'rider_assigned' && next === 'picked_up') ||
    (o.status === 'picked_up' && next === 'out_for_delivery') ||
    (o.status === 'out_for_delivery' && next === 'delivered');
  if (!ok) throw new HttpError(409, `Cannot move a delivery from ${o.status} to ${next}.`);
  setStatus(o, next);
  notifyCustomer(db, o, next);
  if (next === 'delivered') {
    const rp = riderProfile(db, u);
    rp.total_deliveries = (rp.total_deliveries ?? 0) + 1;
  }
  return hydrate(db, o);
});

// ---- Tracking
on('POST', '/tracking/location', (ctx, db) => {
  const u = auth(ctx, db, ['rider']);
  const b = body<Partial<RiderLocation>>(ctx);
  db.locations[u.id] = {
    rider_id: u.id,
    order_id: b.order_id ?? null,
    latitude: Number(b.latitude),
    longitude: Number(b.longitude),
    heading: b.heading ?? null,
    speed: b.speed ?? null,
    accuracy: b.accuracy ?? null,
    updated_at: iso(now()),
    rider_name: u.full_name,
  };
  return {};
});
on('GET', '/tracking/orders/:id', (ctx, db) => {
  auth(ctx, db);
  return riderPosition(db, findOrder(db, ctx.params.id!));
});
on('GET', '/tracking/active', (ctx, db) => {
  auth(ctx, db, ['admin']);
  const out: Record<string, RiderLocation> = {};
  for (const o of db.orders) {
    const loc = riderPosition(db, o);
    if (loc) out[loc.rider_id] = loc;
  }
  for (const [rid, loc] of Object.entries(db.locations)) {
    if (!out[rid] && now() - +new Date(loc.updated_at) < 5 * 60000) out[rid] = loc;
  }
  return Object.values(out);
});

// ---- Notifications
on('GET', '/notifications', (ctx, db) => {
  const u = auth(ctx, db);
  return db.notifications.filter((n) => n.user_id === u.id);
});
on('POST', '/notifications/read-all', (ctx, db) => {
  const u = auth(ctx, db);
  db.notifications.forEach((n) => n.user_id === u.id && (n.is_read = true));
  return {};
});
on('PATCH', '/notifications/:id/read', (ctx, db) => {
  const u = auth(ctx, db);
  const n = db.notifications.find((x) => x.id === ctx.params.id && x.user_id === u.id);
  if (n) n.is_read = true;
  return {};
});
on('DELETE', '/notifications/:id', (ctx, db) => {
  const u = auth(ctx, db);
  db.notifications = db.notifications.filter((x) => !(x.id === ctx.params.id && x.user_id === u.id));
  return {};
});

// ---- Admin
on('GET', '/admin/stats', (ctx, db): AdminStats => {
  auth(ctx, db, ['admin']);
  const today = new Date().toDateString();
  const todays = db.orders.filter((o) => new Date(o.created_at).toDateString() === today);
  return {
    total_customers: db.users.filter((u) => u.role === 'customer').length,
    total_vendors: db.vendors.length,
    total_riders: db.riders.length,
    active_orders: db.orders.filter((o) => ACTIVE.includes(o.status)).length,
    orders_today: todays.length,
    revenue_today: todays.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.total, 0),
    pending_approvals: db.vendors.filter((v) => v.approval_status === 'pending').length + db.riders.filter((r) => r.approval_status === 'pending').length,
    online_riders: db.riders.filter((r) => r.is_online).length,
  };
});
on('GET', '/admin/users', (ctx, db) => {
  auth(ctx, db, ['admin']);
  const q = ctx.query;
  const s = q.search?.toLowerCase();
  return db.users
    .filter((u) => !q.role || u.role === q.role)
    .filter((u) => !s || u.full_name.toLowerCase().includes(s) || u.email.includes(s) || u.phone?.includes(s))
    .filter((u) => !q.status || (q.status === 'active' ? u.is_active : !u.is_active))
    .map((u) => publicUser(db, u));
});
on('PATCH', '/admin/users/:id/status', (ctx, db) => {
  const admin = auth(ctx, db, ['admin']);
  const u = db.users.find((x) => x.id === ctx.params.id);
  if (!u) throw new HttpError(404, 'User not found.');
  if (u.id === admin.id) throw new HttpError(400, 'You cannot deactivate your own account.');
  u.is_active = Boolean(body<{ is_active: boolean }>(ctx).is_active);
  return publicUser(db, u);
});
on('GET', '/admin/vendors', (ctx, db) => {
  auth(ctx, db, ['admin']);
  const s = ctx.query.search?.toLowerCase();
  return db.vendors
    .map((v) => {
      const o = db.users.find((u) => u.id === v.user_id);
      return { ...v, owner: o ? { id: o.id, full_name: o.full_name, email: o.email, phone: o.phone, is_active: o.is_active } : null };
    })
    .filter((v) => !ctx.query.status || v.approval_status === ctx.query.status)
    .filter((v) => !s || v.name.toLowerCase().includes(s) || v.owner?.full_name.toLowerCase().includes(s));
});
on('GET', '/admin/riders', (ctx, db) => {
  auth(ctx, db, ['admin']);
  const s = ctx.query.search?.toLowerCase();
  return db.riders
    .map((r) => {
      const u = db.users.find((x) => x.id === r.user_id);
      return { ...r, user: u ? { id: u.id, full_name: u.full_name, email: u.email, phone: u.phone, is_active: u.is_active } : null };
    })
    .filter((r) => !ctx.query.status || r.approval_status === ctx.query.status)
    .filter((r) => !s || r.user?.full_name.toLowerCase().includes(s) || r.user?.phone?.includes(s) || r.vehicle_number?.toLowerCase().includes(s));
});
const decide = (kind: 'vendors' | 'riders', approve: boolean): Handler => (ctx, db) => {
  auth(ctx, db, ['admin']);
  const list = kind === 'vendors' ? db.vendors : db.riders;
  const item = list.find((x) => x.id === ctx.params.id);
  if (!item) throw new HttpError(404, 'Not found.');
  item.approval_status = approve ? 'approved' : 'rejected';
  if (kind === 'riders' && !approve) (item as DB['riders'][number]).is_online = false;
  const reason = body<{ reason?: string }>(ctx).reason;
  notify(
    db,
    item.user_id,
    approve ? 'Application approved 🎉' : 'Application not approved',
    approve ? 'Your account is approved — you can start operating now.' : reason || 'Contact support for details.',
    'approval',
  );
  return item;
};
on('POST', '/admin/vendors/:id/approve', decide('vendors', true));
on('POST', '/admin/vendors/:id/reject', decide('vendors', false));
on('POST', '/admin/riders/:id/approve', decide('riders', true));
on('POST', '/admin/riders/:id/reject', decide('riders', false));
on('GET', '/admin/orders', (ctx, db) => {
  auth(ctx, db, ['admin']);
  const s = ctx.query.search?.toLowerCase();
  return db.orders
    .filter((o) => !ctx.query.status || o.status === ctx.query.status)
    .map((o) => hydrate(db, o))
    .filter(
      (o) =>
        !s ||
        o.order_number?.toLowerCase().includes(s) ||
        o.customer?.full_name.toLowerCase().includes(s) ||
        o.vendor?.name.toLowerCase().includes(s),
    );
});
on('GET', '/admin/analytics', (ctx, db): AnalyticsData => {
  auth(ctx, db, ['admin']);
  const days = Math.max(1, Math.min(365, Number(ctx.query.days) || 30));
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const inRange = db.orders.filter((o) => +new Date(o.created_at) >= +start);
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toDateString();
    const dayOrders = inRange.filter((o) => new Date(o.created_at).toDateString() === key);
    return {
      date: d.toISOString().slice(0, 10),
      orders: dayOrders.filter((o) => !['rejected', 'cancelled'].includes(o.status)).length,
      revenue: dayOrders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.total, 0),
    };
  });
  const counts = new Map<OrderStatus, number>();
  inRange.forEach((o) => counts.set(o.status, (counts.get(o.status) ?? 0) + 1));
  const byVendor = new Map<string, { orders: number; revenue: number }>();
  inRange
    .filter((o) => o.status === 'delivered')
    .forEach((o) => {
      const cur = byVendor.get(o.vendor_id) ?? { orders: 0, revenue: 0 };
      byVendor.set(o.vendor_id, { orders: cur.orders + 1, revenue: cur.revenue + o.total });
    });
  const durations = inRange
    .filter((o) => o.status === 'delivered')
    .map((o) => ((stamp(o, 'delivered') ?? 0) - +new Date(o.created_at)) / 60000)
    .filter((m) => m > 0);
  return {
    daily,
    status_breakdown: [...counts.entries()].map(([status, count]) => ({ status, count })),
    top_vendors: [...byVendor.entries()]
      .map(([vendor_id, v]) => ({ vendor_id, name: db.vendors.find((x) => x.id === vendor_id)?.name ?? 'Unknown', ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    avg_delivery_minutes: durations.length ? durations.reduce((s, m) => s + m, 0) / durations.length : null,
  };
});

// ------------------------------------------------------------------ dispatch

const compiled = routes.map(([method, path, handler]) => {
  const keys: string[] = [];
  const re = new RegExp(
    `^${path.replace(/:([a-z_]+)/gi, (_, k: string) => {
      keys.push(k);
      return '([^/]+)';
    })}/?$`,
  );
  return { method, re, keys, handler };
});

export async function handleRequest(method: string, path: string, query: Record<string, string>, reqBody: unknown, token: string | null): Promise<unknown> {
  const db = loadDb();
  const simChanged = advanceSimulations(db);
  for (const r of compiled) {
    if (r.method !== method) continue;
    const m = path.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1]!)]));
    const result = await r.handler({ params, query, body: reqBody, token }, db);
    if (method !== 'GET' || simChanged) saveDb();
    // Return copies so callers can't mutate the store.
    return result === undefined ? null : JSON.parse(JSON.stringify(result));
  }
  if (simChanged) saveDb();
  throw new HttpError(404, `Demo API has no route for ${method} ${path}`);
}

async function shrinkImage(file: Blob): Promise<string> {
  const MAX = 480;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    throw new HttpError(400, 'Could not read that image.');
  }
}
