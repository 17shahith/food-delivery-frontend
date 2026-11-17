import {
  BarChart3,
  Bell,
  Bike,
  ClipboardList,
  History,
  Home,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  Package,
  PackagePlus,
  Radar,
  Radio,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match only the exact path (for index routes). */
  end?: boolean;
  badge?: 'cart' | 'notifications';
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const NAVIGATION: Record<Role, NavSection[]> = {
  customer: [
    {
      items: [
        { to: '/', label: 'Home', icon: Home, end: true },
        { to: '/vendors', label: 'Browse shops', icon: Store },
        { to: '/cart', label: 'Cart', icon: ShoppingCart, badge: 'cart' },
        { to: '/orders', label: 'My orders', icon: ShoppingBag },
      ],
    },
    {
      title: 'Account',
      items: [
        { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
        { to: '/profile', label: 'Profile & addresses', icon: User },
      ],
    },
  ],
  vendor: [
    {
      items: [
        { to: '/vendor', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/vendor/orders', label: 'Incoming orders', icon: ClipboardList, end: true },
        { to: '/vendor/orders/history', label: 'Order history', icon: History },
      ],
    },
    {
      title: 'Catalogue',
      items: [
        { to: '/vendor/products', label: 'Products', icon: Package, end: true },
        { to: '/vendor/products/new', label: 'Add product', icon: PackagePlus },
      ],
    },
    {
      title: 'Account',
      items: [
        { to: '/vendor/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
        { to: '/vendor/profile', label: 'Store profile', icon: Store },
      ],
    },
  ],
  rider: [
    {
      items: [
        { to: '/rider', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/rider/available', label: 'Available deliveries', icon: Radar },
        { to: '/rider/deliveries', label: 'My deliveries', icon: ListChecks, end: true },
        { to: '/rider/location', label: 'Live location', icon: Radio },
        { to: '/rider/history', label: 'Delivery history', icon: History },
      ],
    },
    {
      title: 'Account',
      items: [
        { to: '/rider/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
        { to: '/rider/profile', label: 'Rider profile', icon: Bike },
      ],
    },
  ],
  admin: [
    {
      items: [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/admin/monitoring', label: 'Live monitoring', icon: MapPinned },
        { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
        { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Users',
      items: [
        { to: '/admin/customers', label: 'Customers', icon: Users },
        { to: '/admin/vendors', label: 'Vendors', icon: Store },
        { to: '/admin/riders', label: 'Riders', icon: Bike },
      ],
    },
    {
      title: 'Account',
      items: [{ to: '/admin/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' }],
    },
  ],
};

export function notificationsPath(role: Role): string {
  return role === 'customer' ? '/notifications' : `/${role}/notifications`;
}

export function profilePath(role: Role): string | null {
  if (role === 'admin') return null;
  return role === 'customer' ? '/profile' : `/${role}/profile`;
}
