/**
 * DEMO MODE ONLY — an in-browser stand-in for the FastAPI backend so the app can be
 * explored without a server. Data lives in localStorage and is seeded on first run.
 */
import type {
  Address,
  AppNotification,
  LatLng,
  Order,
  OrderStatus,
  Product,
  RiderLocation,
  RiderProfile,
  StatusEvent,
  User,
  Vendor,
} from '@/types';
import { env } from '@/utils/env';

export interface DemoUser extends User {
  password: string;
}
export type DemoAddress = Address & { user_id: string };
export type DemoOrder = Omit<Order, 'vendor' | 'customer' | 'rider'> & {
  /** Auto-progressing order (shop not run by a demo login). */
  sim?: boolean;
  sim_start?: number;
  skipped_by?: string[];
};

export interface DB {
  version: number;
  counter: number;
  users: DemoUser[];
  vendors: Vendor[];
  riders: RiderProfile[];
  products: Product[];
  addresses: DemoAddress[];
  orders: DemoOrder[];
  notifications: AppNotification[];
  locations: Record<string, RiderLocation>;
}

const KEY = 'qd.demo.db';
const VERSION = 3; // bump to reseed (v3: cream-theme images)
export const DEMO_PASSWORD = 'demo1234';

export const DEMO_ACCOUNTS = [
  { role: 'customer', email: 'customer@demo.com' },
  { role: 'vendor', email: 'vendor@demo.com' },
  { role: 'rider', email: 'rider@demo.com' },
  { role: 'admin', email: 'admin@demo.com' },
] as const;

let cache: DB | null = null;

export function loadDb(): DB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed.version === VERSION) return (cache = parsed);
    }
  } catch {
    /* reseed */
  }
  cache = seed();
  saveDb();
  return cache;
}

export function saveDb(): void {
  if (!cache) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* quota — keep in memory */
  }
}

export function resetDemoData(): void {
  cache = null;
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem('qd.tokens');
    localStorage.removeItem('qd.cart');
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------- helpers

export const CENTER: LatLng = { latitude: env.defaultLat, longitude: env.defaultLng };

/** Point offset from `from` by north/east kilometres. */
export function offset(from: LatLng, northKm: number, eastKm: number): LatLng {
  return {
    latitude: from.latitude + northKm / 111.32,
    longitude: from.longitude + eastKm / (111.32 * Math.cos((from.latitude * Math.PI) / 180)),
  };
}

export function svgImage(emoji: string, bg: string, w = 400, h = 300): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="54%" font-size="${Math.round(
    h * 0.42,
  )}" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const iso = (ms: number) => new Date(ms).toISOString();

// ---------------------------------------------------------------- seed

function seed(): DB {
  const now = Date.now();
  const rng = mulberry32(42);
  const created = iso(now - 60 * 86400000);

  const user = (
    id: string,
    email: string,
    full_name: string,
    role: User['role'],
    phone: string,
    extra: Partial<DemoUser> = {},
  ): DemoUser => ({
    id,
    email,
    full_name,
    role,
    phone,
    password: DEMO_PASSWORD,
    is_active: true,
    approval_status: role === 'vendor' || role === 'rider' ? 'approved' : null,
    avatar_url: null,
    created_at: created,
    ...extra,
  });

  const users: DemoUser[] = [
    user('u-customer', 'customer@demo.com', 'Priya Sharma', 'customer', '+91 98450 11111'),
    user('u-vendor', 'vendor@demo.com', 'Rahul Mehta', 'vendor', '+91 98450 22222'),
    user('u-rider', 'rider@demo.com', 'Arjun Singh', 'rider', '+91 98450 33333'),
    user('u-admin', 'admin@demo.com', 'Platform Admin', 'admin', '+91 98450 44444'),
    user('u-rider2', 'ravi@demo.com', 'Ravi Kumar', 'rider', '+91 98450 55555'),
    user('u-rider3', 'meena@demo.com', 'Meena Das', 'rider', '+91 98450 66666', { approval_status: 'pending', created_at: iso(now - 86400000) }),
    user('u-c2', 'ananya@demo.com', 'Ananya Iyer', 'customer', '+91 98450 70001'),
    user('u-c3', 'karan@demo.com', 'Karan Patel', 'customer', '+91 98450 70002'),
    user('u-c4', 'sneha@demo.com', 'Sneha Reddy', 'customer', '+91 98450 70003', { is_active: false }),
    user('u-v2', 'bakery@demo.com', 'Lakshmi Nair', 'vendor', '+91 98450 80002'),
    user('u-v3', 'pharmacy@demo.com', 'Dr. Vikram Rao', 'vendor', '+91 98450 80003'),
    user('u-v4', 'kitchen@demo.com', 'Imran Khan', 'vendor', '+91 98450 80004'),
    user('u-v5', 'orchard@demo.com', 'Kavya Gowda', 'vendor', '+91 98450 80005'),
    user('u-v6', 'dairy@demo.com', 'Suresh Babu', 'vendor', '+91 98450 80006'),
    user('u-v7', 'greenleaf@demo.com', 'Neha Joshi', 'vendor', '+91 98450 80007', { approval_status: 'pending', created_at: iso(now - 2 * 86400000) }),
  ];

  const vendor = (
    id: string,
    user_id: string,
    name: string,
    category: string,
    emoji: string,
    bg: string,
    pos: LatLng,
    extra: Partial<Vendor>,
  ): Vendor => ({
    id,
    user_id,
    name,
    category,
    description: null,
    logo_url: svgImage(emoji, bg, 120, 120),
    banner_url: svgImage(emoji, bg, 800, 300),
    address: '',
    phone: users.find((u) => u.id === user_id)?.phone ?? null,
    rating: 4.5,
    rating_count: 120,
    is_open: true,
    approval_status: 'approved',
    opening_hours: '8:00 AM – 10:00 PM',
    delivery_fee: 25,
    min_order_amount: 0,
    avg_prep_minutes: 15,
    created_at: created,
    ...pos,
    ...extra,
  });

  const vendors: Vendor[] = [
    vendor('v-freshmart', 'u-vendor', 'Fresh Mart', 'Grocery', '🛒', '#ede9fe', offset(CENTER, 0.8, 1.2), {
      description: 'Your neighbourhood supermarket — staples, fresh produce and daily essentials.',
      address: '12, 100 Feet Road, Indiranagar',
      rating: 4.6,
      rating_count: 312,
      delivery_fee: 25,
      min_order_amount: 99,
      avg_prep_minutes: 10,
    }),
    vendor('v-bakery', 'u-v2', 'Daily Bread Bakery', 'Bakery', '🥐', '#fef3c7', offset(CENTER, -1.2, 0.5), {
      description: 'Fresh breads, pastries and cakes baked every morning.',
      address: '45, Church Street',
      rating: 4.8,
      rating_count: 528,
      delivery_fee: 30,
      avg_prep_minutes: 15,
    }),
    vendor('v-pharma', 'u-v3', 'CarePlus Pharmacy', 'Pharmacy', '💊', '#dbeafe', offset(CENTER, 1.5, -0.8), {
      description: 'Licensed pharmacy with medicines, wellness and personal care.',
      address: '8, Residency Road',
      rating: 4.7,
      rating_count: 201,
      delivery_fee: 0,
      avg_prep_minutes: 5,
      opening_hours: 'Open 24 hours',
    }),
    vendor('v-kitchen', 'u-v4', 'Spice Route Kitchen', 'Restaurant', '🍛', '#ffe4e6', offset(CENTER, -0.6, -1.4), {
      description: 'Home-style biryani, curries and South Indian favourites.',
      address: '221, Brigade Road',
      rating: 4.4,
      rating_count: 987,
      delivery_fee: 35,
      min_order_amount: 149,
      avg_prep_minutes: 20,
    }),
    vendor('v-orchard', 'u-v5', 'Orchard Fresh', 'Fruits & Vegetables', '🍎', '#fae8ff', offset(CENTER, 2.2, 1.8), {
      description: 'Farm-fresh fruits and vegetables delivered daily.',
      address: '3, Double Road, Shanthinagar',
      rating: 4.5,
      rating_count: 143,
      delivery_fee: 20,
      avg_prep_minutes: 10,
    }),
    vendor('v-dairy', 'u-v6', 'Moo Dairy', 'Dairy', '🥛', '#e0f2fe', offset(CENTER, -2.0, -0.3), {
      description: 'Fresh milk, paneer, curd and butter from local farms.',
      address: '17, Lalbagh Road',
      rating: 4.3,
      rating_count: 88,
      delivery_fee: 15,
      is_open: false,
      opening_hours: '6:00 AM – 11:00 AM',
    }),
    vendor('v-greenleaf', 'u-v7', 'Green Leaf Organics', 'Grocery', '🥬', '#f3e8ff', offset(CENTER, 3.0, -2.0), {
      description: 'Certified organic groceries.',
      address: '90, Koramangala 5th Block',
      approval_status: 'pending',
      rating: null,
      rating_count: 0,
      created_at: iso(now - 2 * 86400000),
    }),
  ];

  const p = (
    vendor_id: string,
    id: string,
    name: string,
    emoji: string,
    price: number,
    category: string,
    unit: string,
    extra: Partial<Product> = {},
  ): Product => ({
    id,
    vendor_id,
    name,
    description: null,
    price,
    category,
    unit,
    image_url: svgImage(emoji, '#FFF8EE'),
    is_available: true,
    stock: 50,
    created_at: created,
    ...extra,
  });

  const products: Product[] = [
    p('v-freshmart', 'p-milk', 'Toned Milk 1L', '🥛', 32, 'Dairy', 'litre', { description: 'Pasteurised toned milk, delivered chilled.' }),
    p('v-freshmart', 'p-bread', 'Whole Wheat Bread', '🍞', 45, 'Bakery', 'pack', { description: '400 g sliced whole wheat loaf.' }),
    p('v-freshmart', 'p-eggs', 'Farm Eggs', '🥚', 84, 'Groceries', 'dozen'),
    p('v-freshmart', 'p-rice', 'Basmati Rice 5 kg', '🍚', 520, 'Groceries', 'pack', { description: 'Long-grain aged basmati rice.' }),
    p('v-freshmart', 'p-banana', 'Robusta Bananas', '🍌', 60, 'Fruits', 'dozen'),
    p('v-freshmart', 'p-noodles', 'Instant Noodles', '🍜', 14, 'Snacks', 'pack', { is_available: false, stock: 0 }),
    p('v-freshmart', 'p-coffee', 'Filter Coffee Powder', '☕', 210, 'Beverages', 'pack'),
    p('v-bakery', 'p-croissant', 'Butter Croissant', '🥐', 60, 'Bakery', 'piece', { description: 'Flaky, all-butter croissant.' }),
    p('v-bakery', 'p-cake', 'Chocolate Truffle Cake', '🎂', 450, 'Bakery', 'piece', { description: '500 g rich chocolate truffle cake.' }),
    p('v-bakery', 'p-cookies', 'Oatmeal Cookies', '🍪', 120, 'Snacks', 'pack'),
    p('v-bakery', 'p-baguette', 'French Baguette', '🥖', 90, 'Bakery', 'piece'),
    p('v-pharma', 'p-paracetamol', 'Paracetamol 500 mg', '💊', 25, 'Medicine', 'pack', { description: 'Strip of 10 tablets.' }),
    p('v-pharma', 'p-bandage', 'Adhesive Bandages', '🩹', 40, 'Medicine', 'pack'),
    p('v-pharma', 'p-sanitizer', 'Hand Sanitizer 200 ml', '🧴', 80, 'Personal Care', 'piece'),
    p('v-pharma', 'p-thermo', 'Digital Thermometer', '🌡️', 250, 'Electronics', 'piece'),
    p('v-kitchen', 'p-biryani', 'Chicken Biryani', '🍛', 220, 'Meals', 'plate', { description: 'Dum-cooked biryani with raita.' }),
    p('v-kitchen', 'p-paneer', 'Paneer Butter Masala', '🍲', 190, 'Meals', 'plate'),
    p('v-kitchen', 'p-dosa', 'Masala Dosa', '🥞', 90, 'Meals', 'plate'),
    p('v-kitchen', 'p-lassi', 'Mango Lassi', '🥭', 70, 'Beverages', 'piece'),
    p('v-orchard', 'p-apple', 'Shimla Apples', '🍎', 180, 'Fruits', 'kg'),
    p('v-orchard', 'p-tomato', 'Tomatoes', '🍅', 40, 'Vegetables', 'kg'),
    p('v-orchard', 'p-grapes', 'Green Grapes', '🍇', 120, 'Fruits', 'kg'),
    p('v-orchard', 'p-avocado', 'Avocado', '🥑', 99, 'Fruits', 'piece'),
    p('v-dairy', 'p-paneer-block', 'Fresh Paneer 200 g', '🧀', 90, 'Dairy', 'pack'),
    p('v-dairy', 'p-curd', 'Thick Curd 400 g', '🥣', 45, 'Dairy', 'pack'),
    p('v-dairy', 'p-butter', 'White Butter', '🧈', 55, 'Dairy', 'pack'),
  ];

  const riders: RiderProfile[] = [
    { id: 'r-arjun', user_id: 'u-rider', vehicle_type: 'scooter', vehicle_number: 'KA 01 AB 1234', is_online: false, approval_status: 'approved', rating: 4.8, total_deliveries: 0, created_at: created },
    { id: 'r-ravi', user_id: 'u-rider2', vehicle_type: 'motorbike', vehicle_number: 'KA 05 MN 9876', is_online: true, approval_status: 'approved', rating: 4.9, total_deliveries: 0, created_at: created },
    { id: 'r-meena', user_id: 'u-rider3', vehicle_type: 'bicycle', vehicle_number: null, is_online: false, approval_status: 'pending', rating: null, total_deliveries: 0, created_at: iso(now - 86400000) },
  ];

  const addresses: DemoAddress[] = [
    { id: 'a-home', user_id: 'u-customer', label: 'Home', line1: 'Flat 302, Lake View Apartments', line2: 'Near Ulsoor Lake', city: 'Bengaluru', state: 'Karnataka', postal_code: '560008', is_default: true, ...offset(CENTER, -0.3, 0.4) },
    { id: 'a-work', user_id: 'u-customer', label: 'Work', line1: '5th Floor, Prestige Tech Park', line2: 'MG Road', city: 'Bengaluru', state: 'Karnataka', postal_code: '560001', is_default: false, ...offset(CENTER, 1.0, -1.0) },
    { id: 'a-c2', user_id: 'u-c2', label: 'Home', line1: '14, 2nd Cross, HAL 2nd Stage', city: 'Bengaluru', postal_code: '560038', is_default: true, ...offset(CENTER, 1.4, 2.6) },
    { id: 'a-c3', user_id: 'u-c3', label: 'Home', line1: '88, Richmond Town', city: 'Bengaluru', postal_code: '560025', is_default: true, ...offset(CENTER, -1.6, 0.9) },
    { id: 'a-c4', user_id: 'u-c4', label: 'Home', line1: '7, Cunningham Road', city: 'Bengaluru', postal_code: '560052', is_default: true, ...offset(CENTER, 0.9, -2.2) },
  ];

  const db: DB = { version: VERSION, counter: 1000, users, vendors, riders, products, addresses, orders: [], notifications: [], locations: {} };

  // ---- Order history for analytics
  const customers = ['u-customer', 'u-c2', 'u-c3', 'u-c4'];
  const liveVendors = vendors.filter((v) => v.approval_status === 'approved');
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)]!;

  for (let day = 30; day >= 0; day--) {
    const count = day === 0 ? 3 : 1 + Math.floor(rng() * 5);
    for (let k = 0; k < count; k++) {
      const v = pick(liveVendors);
      const customer = pick(customers);
      const roll = rng();
      const status: OrderStatus = roll < 0.86 ? 'delivered' : roll < 0.94 ? 'cancelled' : 'rejected';
      const dayStart = new Date(now - day * 86400000);
      dayStart.setHours(9, 0, 0, 0);
      let placedAt = dayStart.getTime() + Math.floor(rng() * 11 * 3600000);
      if (placedAt > now - 3 * 3600000) placedAt = now - (3 + rng() * 5) * 3600000;
      const rider = rng() < 0.4 ? 'u-rider' : 'u-rider2';
      db.orders.push(
        makeOrder(db, {
          vendor: v,
          customerId: customer,
          items: pickItems(products.filter((x) => x.vendor_id === v.id), rng),
          status,
          placedAt,
          riderId: status === 'delivered' ? rider : null,
          rng,
        }),
      );
    }
  }

  // ---- Live situations to explore straight away
  const fm = vendors[0]!;
  const fmItems = products.filter((x) => x.vendor_id === fm.id && x.is_available);
  db.orders.push(makeOrder(db, { vendor: fm, customerId: 'u-c2', items: [{ product: fmItems[0]!, qty: 2 }, { product: fmItems[2]!, qty: 1 }], status: 'placed', placedAt: now - 2 * 60000, rng }));
  db.orders.push(makeOrder(db, { vendor: fm, customerId: 'u-c3', items: [{ product: fmItems[3]!, qty: 1 }], status: 'preparing', placedAt: now - 9 * 60000, rng }));
  db.orders.push(makeOrder(db, { vendor: fm, customerId: 'u-c4', items: [{ product: fmItems[4]!, qty: 1 }, { product: fmItems[1]!, qty: 2 }], status: 'ready_for_pickup', placedAt: now - 15 * 60000, rng }));

  // A simulated order for the demo customer that is already on its way.
  const kitchen = vendors[3]!;
  const simOrder = makeOrder(db, {
    vendor: kitchen,
    customerId: 'u-customer',
    items: [
      { product: products.find((x) => x.id === 'p-biryani')!, qty: 2 },
      { product: products.find((x) => x.id === 'p-lassi')!, qty: 2 },
    ],
    status: 'placed',
    placedAt: now - 20000,
    rng,
  });
  simOrder.sim = true;
  simOrder.sim_start = now - 20000;
  db.orders.push(simOrder);

  for (const r of db.riders) r.total_deliveries = db.orders.filter((o) => o.rider_id === r.user_id && o.status === 'delivered').length;

  const note = (user_id: string, title: string, message: string, type: AppNotification['type'], minsAgo: number, order_id: string | null = null, is_read = false) =>
    db.notifications.push({ id: `n-${db.notifications.length + 1}`, user_id, title, message, type, order_id, is_read, created_at: iso(now - minsAgo * 60000) });
  note('u-customer', 'Welcome to QuickDrop!', 'Browse nearby shops and track every order live.', 'system', 60, null, true);
  note('u-customer', 'Order placed', `Spice Route Kitchen received order #${simOrder.order_number}.`, 'order', 0.3, simOrder.id);
  note('u-vendor', 'New order received', 'Ananya Iyer placed an order — accept it to start preparing.', 'order', 2, db.orders[db.orders.length - 4]!.id);
  note('u-rider', 'Delivery available', 'An order at Fresh Mart is ready for pickup.', 'delivery', 5);
  note('u-admin', 'Approvals pending', 'Green Leaf Organics and rider Meena Das are waiting for review.', 'approval', 30);

  return db;
}

function pickItems(list: Product[], rng: () => number): { product: Product; qty: number }[] {
  const n = 1 + Math.floor(rng() * Math.min(3, list.length));
  const shuffled = [...list].sort(() => rng() - 0.5).slice(0, n);
  return shuffled.map((product) => ({ product, qty: 1 + Math.floor(rng() * 3) }));
}

const STEP_MINUTES: Partial<Record<OrderStatus, number>> = {
  accepted: 2,
  preparing: 3,
  ready_for_pickup: 12,
  rider_assigned: 2,
  picked_up: 6,
  out_for_delivery: 1,
  delivered: 14,
};

export function makeOrder(
  db: DB,
  o: {
    vendor: Vendor;
    customerId: string;
    items: { product: Product; qty: number }[];
    status: OrderStatus;
    placedAt: number;
    riderId?: string | null;
    rng: () => number;
    address?: DemoAddress;
  },
): DemoOrder {
  const addr = o.address ?? db.addresses.find((a) => a.user_id === o.customerId && a.is_default) ?? db.addresses[0]!;
  const items = o.items.map(({ product, qty }) => ({
    product_id: product.id,
    product_name: product.name,
    quantity: qty,
    unit_price: product.price,
    subtotal: product.price * qty,
    image_url: product.image_url,
  }));
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const fee = Number(o.vendor.delivery_fee ?? 0);

  const history: StatusEvent[] = [{ status: 'placed', created_at: iso(o.placedAt) }];
  let t = o.placedAt;
  if (o.status === 'cancelled') {
    history.push({ status: 'cancelled', created_at: iso(t + 60000), note: 'Cancelled by customer' });
  } else if (o.status === 'rejected') {
    history.push({ status: 'rejected', created_at: iso(t + 90000), note: 'Some items are out of stock' });
  } else {
    const target = ORDER_STEPS.indexOf(o.status);
    for (let i = 1; i <= target; i++) {
      const s = ORDER_STEPS[i]!;
      t += (STEP_MINUTES[s] ?? 2) * 60000 * (0.6 + o.rng() * 0.8);
      history.push({ status: s, created_at: iso(t) });
    }
  }
  db.counter += 1;
  const distance = Math.round(distanceKm(o.vendor, addr) * 10) / 10;
  return {
    id: `ord-${db.counter}-${Math.floor(o.rng() * 1e6).toString(36)}`,
    order_number: `QD${db.counter}`,
    customer_id: o.customerId,
    vendor_id: o.vendor.id,
    rider_id: o.riderId ?? null,
    status: o.status,
    items,
    subtotal,
    delivery_fee: fee,
    total: subtotal + fee,
    payment_method: o.rng() < 0.5 ? 'cod' : 'online',
    notes: null,
    rejection_reason: o.status === 'rejected' ? 'Some items are out of stock' : null,
    delivery_address: { label: addr.label, line1: addr.line1, line2: addr.line2, city: addr.city, postal_code: addr.postal_code, latitude: addr.latitude, longitude: addr.longitude },
    status_history: history,
    distance_km: distance,
    rider_earning: Math.round(30 + distance * 8),
    created_at: iso(o.placedAt),
    updated_at: history[history.length - 1]!.created_at,
  };
}

export const ORDER_STEPS: OrderStatus[] = [
  'placed',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'rider_assigned',
  'picked_up',
  'out_for_delivery',
  'delivered',
];

function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
