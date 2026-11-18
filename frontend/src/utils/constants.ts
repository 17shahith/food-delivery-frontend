import type { Role, VehicleType } from '@/types';

export const APP_NAME = 'QuickDrop';

/** Staff portals live at /vendor, /rider and /admin; the customer app is the main site. */
export const STAFF_ROLES = ['vendor', 'rider', 'admin'] as const;

/** Sign-in page for each role: /login for customers, /<role>/login for staff. */
export function loginPathFor(role: Role | null | undefined): string {
  return role && role !== 'customer' ? `/${role}/login` : '/login';
}

/** The staff portal a URL belongs to, or null for the customer site. */
export function portalOf(pathname: string): Exclude<Role, 'customer'> | null {
  const seg = pathname.split('/')[1] ?? '';
  return (STAFF_ROLES as readonly string[]).includes(seg) ? (seg as Exclude<Role, 'customer'>) : null;
}

export const ROLE_HOME: Record<Role, string> = {
  customer: '/',
  vendor: '/vendor',
  rider: '/rider',
  admin: '/admin',
};

export const ROLE_LABEL: Record<Role, string> = {
  customer: 'Customer',
  vendor: 'Vendor',
  rider: 'Rider',
  admin: 'Admin',
};

export const VENDOR_CATEGORIES = [
  'Grocery',
  'Restaurant',
  'Bakery',
  'Pharmacy',
  'Fruits & Vegetables',
  'Meat & Fish',
  'Dairy',
  'Electronics',
  'Stationery',
  'Pet Supplies',
  'Flowers',
  'Other',
];

export const PRODUCT_CATEGORIES = [
  'Groceries',
  'Snacks',
  'Beverages',
  'Meals',
  'Bakery',
  'Dairy',
  'Fruits',
  'Vegetables',
  'Meat',
  'Medicine',
  'Personal Care',
  'Household',
  'Electronics',
  'Other',
];

export const PRODUCT_UNITS = ['piece', 'kg', 'g', 'litre', 'ml', 'pack', 'dozen', 'plate'];

export const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'motorbike', label: 'Motorbike' },
  { value: 'car', label: 'Car' },
];

export const SEARCH_RADIUS_OPTIONS = [2, 5, 10, 20];
