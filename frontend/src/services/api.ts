import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/utils/env';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import type { Paginated } from '@/types';

export interface StoredTokens {
  access_token: string;
  refresh_token?: string | null;
}

export const tokenStore = {
  get: () => storage.get<StoredTokens | null>(STORAGE_KEYS.tokens, null),
  set: (tokens: StoredTokens) => storage.set(STORAGE_KEYS.tokens, tokens),
  clear: () => storage.remove(STORAGE_KEYS.tokens),
};

export const AUTH_EXPIRED_EVENT = 'qd:auth-expired';
export const TOKENS_REFRESHED_EVENT = 'qd:tokens-refreshed';

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

if (env.demoMode) {
  // Demo: answer requests from the in-browser mock backend (code-split, loaded on first call).
  api.defaults.adapter = async (config) => (await import('./mock/adapter')).demoAdapter(config);
}

api.interceptors.request.use((config) => {
  const tokens = tokenStore.get();
  if (tokens?.access_token) {
    config.headers.set('Authorization', `Bearer ${tokens.access_token}`);
  }
  return config;
});

let refreshPromise: Promise<StoredTokens | null> | null = null;

async function refreshTokens(): Promise<StoredTokens | null> {
  const current = tokenStore.get();
  if (!current?.refresh_token || env.demoMode) return null;
  try {
    const { data } = await axios.post<StoredTokens>(`${env.apiBaseUrl}/auth/refresh`, {
      refresh_token: current.refresh_token,
    });
    const next = { access_token: data.access_token, refresh_token: data.refresh_token ?? current.refresh_token };
    tokenStore.set(next);
    window.dispatchEvent(new CustomEvent(TOKENS_REFRESHED_EVENT, { detail: next }));
    return next;
  } catch {
    return null;
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const isAuthCall = original?.url?.startsWith('/auth/login') || original?.url?.startsWith('/auth/register');
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      refreshPromise ??= refreshTokens().finally(() => {
        refreshPromise = null;
      });
      const next = await refreshPromise;
      if (next) {
        original.headers.set('Authorization', `Bearer ${next.access_token}`);
        return api(original);
      }
      tokenStore.clear();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

/** Accepts either a bare array or a paginated `{ items }` envelope from the API. */
export function unwrapList<T>(data: T[] | Paginated<T> | { data: T[] } | null | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if ('items' in data && Array.isArray(data.items)) return data.items;
  if ('data' in data && Array.isArray(data.data)) return data.data;
  return [];
}

/** Drops undefined / empty-string params so they aren't sent as `?x=`. */
export function cleanParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Partial<T>;
}
