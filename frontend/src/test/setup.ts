import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Newer Node versions (v25+) ship an experimental global `localStorage` that is
 * undefined unless Node is started with --localstorage-file, and it shadows jsdom's.
 * Install a small in-memory Storage so tests behave the same on every Node version.
 */
function ensureStorage(name: 'localStorage' | 'sessionStorage') {
  let ok = false;
  try {
    ok = typeof globalThis[name]?.clear === 'function';
  } catch {
    ok = false;
  }
  if (ok) return;
  const data = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
  Object.defineProperty(globalThis, name, { value: storage, configurable: true, writable: true });
}
ensureStorage('localStorage');
ensureStorage('sessionStorage');

afterEach(() => {
  cleanup();
  localStorage.clear();
});
