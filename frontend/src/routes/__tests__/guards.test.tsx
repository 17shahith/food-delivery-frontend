import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '../guards';
import type { User } from '@/types';

// A plain function (not vi.fn) so a rejected `me()` isn't reported by the spy as a test error.
let meImpl: () => Promise<User> = async () => {
  throw new Error('not configured');
};
const me = {
  mockReset: () => {
    meImpl = async () => {
      throw new Error('not configured');
    };
  },
  mockResolvedValue: (u: User) => {
    meImpl = async () => u;
  },
  mockImplementation: (fn: () => Promise<User>) => {
    meImpl = fn;
  },
};
const login = vi.fn();
vi.mock('@/services/authService', () => ({
  authService: { me: () => meImpl(), login: (...a: unknown[]) => login(...a), register: vi.fn(), logout: vi.fn() },
}));

const user = (role: User['role']): User => ({
  id: 'u1',
  email: 'x@y.z',
  full_name: 'Test User',
  role,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route element={<ProtectedRoute roles={['customer']} />}>
            <Route path="/" element={<p>customer home</p>} />
          </Route>
          <Route element={<ProtectedRoute roles={['vendor']} />}>
            <Route path="/vendor" element={<p>vendor home</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('route guards', () => {
  beforeEach(() => {
    me.mockReset();
    login.mockReset();
    login.mockImplementation(async (email: string) => user(email.split('@')[0] as User['role']));
  });

  it('signs anonymous visitors in to the module automatically', async () => {
    renderAt('/vendor');
    expect(await screen.findByText('vendor home')).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith('vendor@demo.com', 'demo1234');
  });

  it('lets the right role through without signing in again', async () => {
    localStorage.setItem('qd.tokens', JSON.stringify({ access_token: 't' }));
    me.mockResolvedValue(user('vendor'));
    renderAt('/vendor');
    expect(await screen.findByText('vendor home')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('switches to the module account when another role opens it', async () => {
    localStorage.setItem('qd.tokens', JSON.stringify({ access_token: 't' }));
    me.mockResolvedValue(user('vendor'));
    renderAt('/');
    expect(await screen.findByText('customer home')).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith('customer@demo.com', 'demo1234');
  });

  it('clears an invalid stored session and signs in again', async () => {
    localStorage.setItem('qd.tokens', JSON.stringify({ access_token: 'bad' }));
    me.mockImplementation(async () => {
      throw new Error('401');
    });
    renderAt('/');
    expect(await screen.findByText('customer home')).toBeInTheDocument();
    await waitFor(() => expect(login).toHaveBeenCalled());
  });

  it('shows a retry when automatic sign-in fails', async () => {
    login.mockRejectedValue(new Error('backend down'));
    renderAt('/');
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
