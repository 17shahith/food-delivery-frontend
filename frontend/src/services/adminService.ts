import { api, cleanParams, unwrapList } from './api';
import type { AdminStats, AnalyticsData, Order, OrderStatus, RiderProfile, Role, User, Vendor } from '@/types';

export interface AdminListQuery {
  search?: string;
  status?: string;
}

export const adminService = {
  async stats(): Promise<AdminStats> {
    const { data } = await api.get<AdminStats>('/admin/stats');
    return data;
  },
  async users(role: Role, query: AdminListQuery = {}): Promise<User[]> {
    const { data } = await api.get('/admin/users', { params: cleanParams({ role, ...query }) });
    return unwrapList<User>(data);
  },
  async setUserActive(userId: string, is_active: boolean): Promise<User> {
    const { data } = await api.patch<User>(`/admin/users/${userId}/status`, { is_active });
    return data;
  },
  async vendors(query: AdminListQuery = {}): Promise<Vendor[]> {
    const { data } = await api.get('/admin/vendors', { params: cleanParams(query) });
    return unwrapList<Vendor>(data);
  },
  async setVendorApproval(vendorId: string, approved: boolean, reason?: string): Promise<Vendor> {
    const { data } = await api.post<Vendor>(`/admin/vendors/${vendorId}/${approved ? 'approve' : 'reject'}`, {
      reason,
    });
    return data;
  },
  async riders(query: AdminListQuery = {}): Promise<RiderProfile[]> {
    const { data } = await api.get('/admin/riders', { params: cleanParams(query) });
    return unwrapList<RiderProfile>(data);
  },
  async setRiderApproval(riderId: string, approved: boolean, reason?: string): Promise<RiderProfile> {
    const { data } = await api.post<RiderProfile>(`/admin/riders/${riderId}/${approved ? 'approve' : 'reject'}`, {
      reason,
    });
    return data;
  },
  async orders(query: { status?: OrderStatus | ''; search?: string } = {}): Promise<Order[]> {
    const { data } = await api.get('/admin/orders', { params: cleanParams(query) });
    return unwrapList<Order>(data);
  },
  async analytics(days = 30): Promise<AnalyticsData> {
    const { data } = await api.get<AnalyticsData>('/admin/analytics', { params: { days } });
    return data;
  },
};
