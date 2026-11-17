import { api, cleanParams, unwrapList } from './api';
import type { Order, OrderStatus, RiderProfile, RiderStats, VehicleType } from '@/types';

export const riderService = {
  async me(): Promise<RiderProfile> {
    const { data } = await api.get<RiderProfile>('/riders/me');
    return data;
  },
  async updateMe(payload: { vehicle_type?: VehicleType; vehicle_number?: string }): Promise<RiderProfile> {
    const { data } = await api.patch<RiderProfile>('/riders/me', payload);
    return data;
  },
  async setAvailability(is_online: boolean): Promise<RiderProfile> {
    const { data } = await api.patch<RiderProfile>('/riders/me/availability', { is_online });
    return data;
  },
  async stats(): Promise<RiderStats> {
    const { data } = await api.get<RiderStats>('/riders/me/stats');
    return data;
  },

  /** Orders that are ready for pickup and offered to this rider. */
  async available(): Promise<Order[]> {
    const { data } = await api.get('/deliveries/available');
    return unwrapList<Order>(data);
  },
  /** Deliveries assigned to this rider, optionally filtered by status. */
  async deliveries(status?: OrderStatus[]): Promise<Order[]> {
    const { data } = await api.get('/riders/me/deliveries', {
      params: cleanParams({ status: status?.join(',') }),
    });
    return unwrapList<Order>(data);
  },
  async accept(orderId: string): Promise<Order> {
    const { data } = await api.post<Order>(`/deliveries/${orderId}/accept`);
    return data;
  },
  async reject(orderId: string, reason?: string): Promise<void> {
    await api.post(`/deliveries/${orderId}/reject`, { reason });
  },
  async updateProgress(orderId: string, status: OrderStatus): Promise<Order> {
    const { data } = await api.patch<Order>(`/deliveries/${orderId}/status`, { status });
    return data;
  },
};
