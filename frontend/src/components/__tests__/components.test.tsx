import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OrderTimeline } from '../orders/OrderTimeline';
import { OrderCard } from '../orders/OrderCard';
import { ApprovalBadge, Button, ConfirmDialog, EmptyState, ErrorState, QuantityStepper, StatusBadge, Toggle } from '../ui';
import type { Order } from '@/types';

describe('OrderTimeline', () => {
  it('renders all 8 steps and marks the current one', () => {
    render(
      <OrderTimeline
        status="out_for_delivery"
        history={[
          { status: 'placed', created_at: '2026-01-01T10:00:00Z' },
          { status: 'out_for_delivery', created_at: '2026-01-01T10:40:00Z' },
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(8);
    expect(items[6]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Order Placed')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });
  it('shows the rejection state', () => {
    render(<OrderTimeline status="rejected" history={[{ status: 'rejected', created_at: '2026-01-01T10:00:00Z', note: 'Out of stock' }]} />);
    expect(screen.getByText('Order rejected')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });
});

describe('badges', () => {
  it('labels order and approval states', () => {
    render(
      <>
        <StatusBadge status="ready_for_pickup" />
        <ApprovalBadge status="pending" />
      </>,
    );
    expect(screen.getByText('Ready for Pickup')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});

describe('controls', () => {
  it('Button shows loading and disables', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('Toggle flips state', async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Online" />);
    await userEvent.click(screen.getByRole('switch', { name: 'Online' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('QuantityStepper respects bounds', async () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={1} min={1} max={2} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('ConfirmDialog requires a reason when configured', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open onClose={() => undefined} onConfirm={onConfirm} title="Reject?" confirmLabel="Reject" withReason reasonRequired />,
    );
    const confirm = screen.getByRole('button', { name: 'Reject' });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox'), 'Out of stock');
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('Out of stock');
  });

  it('Empty and error states render actions', async () => {
    const retry = vi.fn();
    render(
      <>
        <EmptyState title="Nothing here" />
        <ErrorState message="Server down" onRetry={retry} />
      </>,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(retry).toHaveBeenCalled();
  });
});

describe('OrderCard', () => {
  it('summarises an order and links to it', () => {
    const order = {
      id: 'abcdef12-0000',
      customer_id: 'c',
      vendor_id: 'v',
      status: 'placed',
      items: [{ product_id: 'p', product_name: 'Milk', quantity: 2, unit_price: 30, subtotal: 60 }],
      subtotal: 60,
      delivery_fee: 0,
      total: 60,
      payment_method: 'cod',
      delivery_address: { line1: 'x', city: 'y', latitude: 1, longitude: 1 },
      vendor: { id: 'v', name: 'Fresh Mart', address: 'z', latitude: 1, longitude: 1 },
      status_history: [],
      created_at: new Date().toISOString(),
    } as Order;
    render(
      <MemoryRouter>
        <OrderCard order={order} to="/orders/abcdef12-0000" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Fresh Mart')).toBeInTheDocument();
    expect(screen.getByText(/2 items/)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/orders/abcdef12-0000');
  });
});
