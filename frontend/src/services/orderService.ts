import { api, cleanParams, unwrapList } from './api';
import type { CreateOrderPayload, Order, OrderStatus } from '@/types';

export const orderService = {
  async create(payload: CreateOrderPayload): Promise<Order> {
    const { data } = await api.post<Order>('/orders', payload);
    return data;
  },
  /** Orders of the signed-in customer. */
  async mine(status?: OrderStatus[]): Promise<Order[]> {
    const { data } = await api.get('/orders/me', { params: cleanParams({ status: status?.join(',') }) });
    return unwrapList<Order>(data);
  },
  async get(id: string): Promise<Order> {
    const { data } = await api.get<Order>(`/orders/${id}`);
    return data;
  },
  async cancel(id: string, reason?: string): Promise<Order> {
    const { data } = await api.post<Order>(`/orders/${id}/cancel`, { reason });
    return data;
  },

  // ---- Vendor actions ----
  async accept(id: string): Promise<Order> {
    const { data } = await api.post<Order>(`/orders/${id}/accept`);
    return data;
  },
  async reject(id: string, reason: string): Promise<Order> {
    const { data } = await api.post<Order>(`/orders/${id}/reject`, { reason });
    return data;
  },
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const { data } = await api.patch<Order>(`/orders/${id}/status`, { status });
    return data;
  },
};
