import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { HttpError, handleRequest } from './server';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Axios adapter that answers every request from the in-browser demo backend. */
export async function demoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await delay(150 + Math.random() * 200); // feel like a network

  const base = (config.baseURL ?? '').replace(/\/+$/, '');
  let url = config.url ?? '';
  if (base && url.startsWith(base)) url = url.slice(base.length);
  const [path, qs] = url.split('?');

  const query: Record<string, string> = {};
  new URLSearchParams(qs ?? '').forEach((v, k) => (query[k] = v));
  for (const [k, v] of Object.entries(config.params ?? {})) {
    if (v !== undefined && v !== null && v !== '') query[k] = String(v);
  }

  let body: unknown = config.data;
  if (typeof body === 'string' && body) {
    try {
      body = JSON.parse(body);
    } catch {
      /* leave as string */
    }
  }

  const authHeader = AxiosHeaders.from(config.headers).get('Authorization');
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : null;

  try {
    const data = await handleRequest((config.method ?? 'get').toUpperCase(), path || '/', query, body, token);
    return { data, status: 200, statusText: 'OK', headers: {}, config, request: {} };
  } catch (err) {
    if (err instanceof HttpError) {
      const response = {
        data: { detail: err.message },
        status: err.status,
        statusText: '',
        headers: {},
        config,
        request: {},
      } as AxiosResponse;
      throw new AxiosError(err.message, err.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST', config, {}, response);
    }
    throw err;
  }
}
