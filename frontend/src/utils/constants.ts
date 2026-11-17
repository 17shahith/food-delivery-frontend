import type { Role, VehicleType } from '@/types';

export const APP_NAME = 'QuickDrop';

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
