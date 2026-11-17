import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from '../guards';
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
vi.mock('@/services/authService', () => ({
  authService: { me: () => meImpl(), login: vi.fn(), register: vi.fn(), logout: vi.fn() },
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
          <Route path="/login" element={<PublicOnlyRoute><p>login page</p></PublicOnlyRoute>} />
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
  beforeEach(() => me.mockReset());

  it('redirects anonymous users to login', async () => {
    renderAt('/vendor');
    expect(await screen.findByText('login page')).toBeInTheDocument();
  });

  it('lets the right role through', async () => {
    localStorage.setItem('qd.tokens', JSON.stringify({ access_token: 't' }));
    me.mockResolvedValue(user('vendor'));
    renderAt('/vendor');
    expect(await screen.findByText('vendor home')).toBeInTheDocument();
  });

  it('sends other roles to their own dashboard', async () => {
    localStorage.setItem('qd.tokens', JSON.stringify({ access_token: 't' }));
    me.mockResolvedValue(user('vendor'));
    renderAt('/');
    expect(await screen.findByText('vendor home')).toBeInTheDocument();
  });

  it('keeps signed-in users off the login page', async () => {
    localStorage.setItem('qd.tokens', JSON.stringify({ access_token: 't' }));
    me.mockResolvedValue(user('customer'));
    renderAt('/login');
    expect(await screen.findByText('customer home')).toBeInTheDocument();
  });

  it('clears an invalid stored session', async () => {
    localStorage.setItem('qd.tokens', JSON.stringify({ access_token: 'bad' }));
    me.mockImplementation(async () => {
      throw new Error('401');
    });
    renderAt('/');
    expect(await screen.findByText('login page')).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem('qd.tokens')).toBeNull());
  });
});
