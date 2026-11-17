import { api, cleanParams, unwrapList } from './api';
import type { Order, OrderStatus, Vendor, VendorStats, VendorUpdate } from '@/types';

export interface VendorQuery {
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  search?: string;
  category?: string;
  open_now?: boolean;
  sort?: 'distance' | 'rating' | 'name';
}

export const vendorService = {
  async list(query: VendorQuery = {}): Promise<Vendor[]> {
    const { data } = await api.get('/vendors', { params: cleanParams(query) });
    return unwrapList<Vendor>(data);
  },
  async get(id: string): Promise<Vendor> {
    const { data } = await api.get<Vendor>(`/vendors/${id}`);
    return data;
  },

  // ---- Vendor-owner endpoints ----
  async me(): Promise<Vendor> {
    const { data } = await api.get<Vendor>('/vendors/me');
    return data;
  },
  async updateMe(payload: VendorUpdate): Promise<Vendor> {
    const { data } = await api.patch<Vendor>('/vendors/me', payload);
    return data;
  },
  async stats(): Promise<VendorStats> {
    const { data } = await api.get<VendorStats>('/vendors/me/stats');
    return data;
  },
  async orders(status?: OrderStatus | OrderStatus[]): Promise<Order[]> {
    const s = Array.isArray(status) ? status.join(',') : status;
    const { data } = await api.get('/vendors/me/orders', { params: cleanParams({ status: s }) });
    return unwrapList<Order>(data);
  },
};
