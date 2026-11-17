export type Role = 'customer' | 'vendor' | 'rider' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: Role;
  avatar_url?: string | null;
  is_active: boolean;
  approval_status?: ApprovalStatus | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string | null;
  token_type?: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: Exclude<Role, 'admin'>;
  // vendor-only
  store_name?: string;
  store_category?: string;
  store_address?: string;
  latitude?: number;
  longitude?: number;
  // rider-only
  vehicle_type?: VehicleType;
  vehicle_number?: string;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Address extends LatLng {
  id: string;
  label: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postal_code: string;
  is_default: boolean;
}

export type AddressInput = Omit<Address, 'id'>;

export interface Vendor extends LatLng {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  category: string;
  logo_url?: string | null;
  banner_url?: string | null;
  address: string;
  phone?: string | null;
  rating?: number | null;
  rating_count?: number | null;
  is_open: boolean;
  approval_status: ApprovalStatus;
  opening_hours?: string | null;
  distance_km?: number | null;
  delivery_fee?: number | null;
  min_order_amount?: number | null;
  avg_prep_minutes?: number | null;
  owner?: Pick<User, 'id' | 'full_name' | 'email' | 'phone' | 'is_active'> | null;
  created_at?: string;
}

export type VendorUpdate = Partial<
  Pick<
    Vendor,
    | 'name'
    | 'description'
    | 'category'
    | 'logo_url'
    | 'banner_url'
    | 'address'
    | 'phone'
    | 'is_open'
    | 'opening_hours'
    | 'delivery_fee'
    | 'min_order_amount'
    | 'avg_prep_minutes'
    | 'latitude'
    | 'longitude'
  >
>;

export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  image_url?: string | null;
  is_available: boolean;
  stock?: number | null;
  unit?: string | null;
  vendor?: Pick<Vendor, 'id' | 'name' | 'is_open' | 'delivery_fee'> | null;
  created_at?: string;
}

export interface ProductInput {
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  is_available: boolean;
  stock?: number | null;
  unit?: string;
}

export interface ProductFilters {
  vendor_id?: string;
  search?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  available?: boolean;
}

export const ORDER_FLOW = [
  'placed',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'rider_assigned',
  'picked_up',
  'out_for_delivery',
  'delivered',
] as const;

export type FlowStatus = (typeof ORDER_FLOW)[number];
export type OrderStatus = FlowStatus | 'rejected' | 'cancelled';

export interface OrderItem {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  image_url?: string | null;
}

export interface StatusEvent {
  status: OrderStatus;
  created_at: string;
  note?: string | null;
}

export interface DeliveryAddress extends LatLng {
  label?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  postal_code?: string | null;
}

export type PaymentMethod = 'cod' | 'online';

export interface Order {
  id: string;
  order_number?: string | null;
  customer_id: string;
  vendor_id: string;
  rider_id?: string | null;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: PaymentMethod;
  notes?: string | null;
  rejection_reason?: string | null;
  delivery_address: DeliveryAddress;
  vendor?: (Pick<Vendor, 'id' | 'name' | 'address' | 'latitude' | 'longitude'> & {
    phone?: string | null;
    logo_url?: string | null;
  }) | null;
  customer?: Pick<User, 'id' | 'full_name' | 'phone'> | null;
  rider?: { id: string; full_name: string; phone?: string | null; vehicle_type?: string | null; vehicle_number?: string | null } | null;
  status_history: StatusEvent[];
  distance_km?: number | null;
  rider_earning?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateOrderPayload {
  vendor_id: string;
  address_id: string;
  items: { product_id: string; quantity: number }[];
  payment_method: PaymentMethod;
  notes?: string;
}

export type VehicleType = 'bicycle' | 'motorbike' | 'scooter' | 'car';

export interface RiderProfile {
  id: string;
  user_id: string;
  vehicle_type: VehicleType;
  vehicle_number?: string | null;
  is_online: boolean;
  approval_status: ApprovalStatus;
  rating?: number | null;
  total_deliveries?: number | null;
  current_latitude?: number | null;
  current_longitude?: number | null;
  user?: Pick<User, 'id' | 'full_name' | 'email' | 'phone' | 'is_active'> | null;
  created_at?: string;
}

export interface RiderLocation extends LatLng {
  rider_id: string;
  order_id?: string | null;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  updated_at: string;
  rider_name?: string | null;
}

export interface LocationUpdate extends LatLng {
  order_id?: string | null;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
}

export type NotificationType = 'order' | 'delivery' | 'system' | 'approval' | 'promo';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  order_id?: string | null;
  created_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page?: number;
  page_size?: number;
}

export interface VendorStats {
  orders_today: number;
  revenue_today: number;
  pending_orders: number;
  active_orders: number;
  total_products: number;
  completed_orders: number;
}

export interface RiderStats {
  deliveries_today: number;
  earnings_today: number;
  total_deliveries: number;
  rating?: number | null;
}

export interface AdminStats {
  total_customers: number;
  total_vendors: number;
  total_riders: number;
  active_orders: number;
  orders_today: number;
  revenue_today: number;
  pending_approvals: number;
  online_riders: number;
}

export interface AnalyticsData {
  daily: { date: string; orders: number; revenue: number }[];
  status_breakdown: { status: OrderStatus; count: number }[];
  top_vendors: { vendor_id: string; name: string; orders: number; revenue: number }[];
  avg_delivery_minutes?: number | null;
}
