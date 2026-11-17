import { api, cleanParams, unwrapList } from './api';
import type { Product, ProductFilters, ProductInput } from '@/types';

export const productService = {
  async list(filters: ProductFilters = {}): Promise<Product[]> {
    const { data } = await api.get('/products', { params: cleanParams(filters) });
    return unwrapList<Product>(data);
  },
  async get(id: string): Promise<Product> {
    const { data } = await api.get<Product>(`/products/${id}`);
    return data;
  },

  // ---- Vendor-owner endpoints ----
  async mine(filters: Pick<ProductFilters, 'search' | 'category' | 'available'> = {}): Promise<Product[]> {
    const { data } = await api.get('/vendors/me/products', { params: cleanParams(filters) });
    return unwrapList<Product>(data);
  },
  async create(payload: ProductInput): Promise<Product> {
    const { data } = await api.post<Product>('/products', payload);
    return data;
  },
  async update(id: string, payload: Partial<ProductInput>): Promise<Product> {
    const { data } = await api.patch<Product>(`/products/${id}`, payload);
    return data;
  },
  async setAvailability(id: string, is_available: boolean): Promise<Product> {
    const { data } = await api.patch<Product>(`/products/${id}/availability`, { is_available });
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },
  async uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<{ url: string }>('/products/upload-image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
  },
};
