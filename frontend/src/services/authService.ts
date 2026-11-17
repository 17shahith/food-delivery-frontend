import { api, tokenStore } from './api';
import { authorizeRealtime, clearRealtimeAuth, supabase } from './supabase';
import type { Address, AddressInput, AuthResponse, RegisterPayload, User } from '@/types';
import { unwrapList } from './api';

async function persistSession(res: AuthResponse): Promise<User> {
  tokenStore.set({ access_token: res.access_token, refresh_token: res.refresh_token });
  await authorizeRealtime(res.access_token, res.refresh_token);
  return res.user;
}

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    return persistSession(data);
  },

  async register(payload: RegisterPayload): Promise<User | null> {
    const { data } = await api.post<AuthResponse | { message: string }>('/auth/register', payload);
    // Some setups require email confirmation and return no token.
    if ('access_token' in data) return persistSession(data);
    return null;
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },

  async updateProfile(payload: Partial<Pick<User, 'full_name' | 'phone' | 'avatar_url'>>): Promise<User> {
    const { data } = await api.patch<User>('/auth/me', payload);
    return data;
  },

  async changePassword(current_password: string, new_password: string): Promise<void> {
    await api.post('/auth/change-password', { current_password, new_password });
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', {
      email,
      redirect_to: `${window.location.origin}/reset-password`,
    });
  },

  /**
   * Completes password recovery. The Supabase recovery link places a session in the
   * URL which supabase-js picks up (detectSessionInUrl); we then update the password.
   */
  async resetPassword(newPassword: string): Promise<void> {
    if (!supabase) throw new Error('Password reset is unavailable: Supabase is not configured.');
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('This reset link is invalid or has expired. Request a new one.');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    await supabase.auth.signOut({ scope: 'local' });
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      /* logging out locally regardless */
    }
    tokenStore.clear();
    await clearRealtimeAuth();
  },

  // ---- Customer addresses ----
  async listAddresses(): Promise<Address[]> {
    const { data } = await api.get('/customers/me/addresses');
    return unwrapList<Address>(data);
  },
  async createAddress(payload: AddressInput): Promise<Address> {
    const { data } = await api.post<Address>('/customers/me/addresses', payload);
    return data;
  },
  async updateAddress(id: string, payload: Partial<AddressInput>): Promise<Address> {
    const { data } = await api.patch<Address>(`/customers/me/addresses/${id}`, payload);
    return data;
  },
  async deleteAddress(id: string): Promise<void> {
    await api.delete(`/customers/me/addresses/${id}`);
  },
};
