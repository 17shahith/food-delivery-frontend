import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { estimateEtaMinutes, haversineKm, isValidCoord } from '../geo';
import { formatDistance, formatMinutes, initials, shortId, timeAgo } from '../format';
import { buildTimeline, riderNextStatus, vendorNextStatus, isTrackable } from '../orderStatus';
import { getErrorMessage } from '../errors';
import { validateEmail, validatePassword, validatePhone, validatePrice } from '../validation';
import { cn } from '../cn';
import { cleanParams, unwrapList } from '@/services/api';
import { niceTicks } from '@/components/charts/Charts';

describe('geo', () => {
  it('computes haversine distance', () => {
    // Bangalore MG Road → Indiranagar is ~4.5 km
    const d = haversineKm({ latitude: 12.9756, longitude: 77.6066 }, { latitude: 12.9784, longitude: 77.6408 });
    expect(d).toBeGreaterThan(3.5);
    expect(d).toBeLessThan(4.5);
    expect(haversineKm({ latitude: 1, longitude: 1 }, { latitude: 1, longitude: 1 })).toBe(0);
  });
  it('estimates ETA', () => {
    expect(estimateEtaMinutes(0)).toBe(0);
    expect(estimateEtaMinutes(22, 22)).toBeCloseTo(78, 0); // 1.3 road factor
  });
  it('validates coordinates', () => {
    expect(isValidCoord({ latitude: 12, longitude: 77 })).toBe(true);
    expect(isValidCoord({ latitude: NaN, longitude: 77 })).toBe(false);
    expect(isValidCoord({ latitude: 95, longitude: 0 })).toBe(false);
    expect(isValidCoord(null)).toBe(false);
  });
});

describe('format', () => {
  it('formats distances and minutes', () => {
    expect(formatDistance(0.45)).toBe('450 m');
    expect(formatDistance(2.345)).toBe('2.3 km');
    expect(formatDistance(null)).toBe('—');
    expect(formatMinutes(12.4)).toBe('12 min');
    expect(formatMinutes(75)).toBe('1h 15m');
  });
  it('builds initials and short ids', () => {
    expect(initials('Asha Rao Kumar')).toBe('AR');
    expect(initials('')).toBe('?');
    expect(shortId('abcd1234-ef56-7890')).toBe('#ABCD1234');
  });
  it('formats relative time', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    expect(timeAgo('2026-01-01T11:59:50Z', now)).toBe('just now');
    expect(timeAgo('2026-01-01T11:30:00Z', now)).toBe('30m ago');
    expect(timeAgo('2026-01-01T09:00:00Z', now)).toBe('3h ago');
  });
});

describe('order status', () => {
  const at = (s: string) => ({ status: s as never, created_at: `2026-01-01T10:0${s.length % 10}:00Z` });

  it('marks steps done/current/upcoming', () => {
    const steps = buildTimeline('preparing', [at('placed'), at('accepted'), at('preparing')]);
    expect(steps).toHaveLength(8);
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
    expect(steps[0]!.timestamp).toBeDefined();
    expect(steps[3]!.timestamp).toBeUndefined();
  });
  it('marks every step done once delivered', () => {
    expect(buildTimeline('delivered').every((s) => s.state === 'done')).toBe(true);
  });
  it('halts after the last reached step for rejected orders', () => {
    const steps = buildTimeline('rejected', [at('placed'), at('rejected')]);
    expect(steps[0]!.state).toBe('done');
    expect(steps[1]!.state).toBe('halted');
    expect(steps[2]!.state).toBe('upcoming');
  });
  it('exposes next actions per role', () => {
    expect(vendorNextStatus('accepted')).toBe('preparing');
    expect(vendorNextStatus('preparing')).toBe('ready_for_pickup');
    expect(vendorNextStatus('placed')).toBeNull();
    expect(riderNextStatus('rider_assigned')).toBe('picked_up');
    expect(riderNextStatus('out_for_delivery')).toBe('delivered');
    expect(riderNextStatus('delivered')).toBeNull();
    expect(isTrackable('picked_up')).toBe(true);
    expect(isTrackable('preparing')).toBe(false);
  });
});

describe('errors', () => {
  const axiosErr = (status: number, data: unknown) =>
    new AxiosError('fail', 'ERR', undefined, undefined, {
      status,
      data,
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
    });

  it('reads FastAPI string detail', () => {
    expect(getErrorMessage(axiosErr(400, { detail: 'Shop is closed' }))).toBe('Shop is closed');
  });
  it('reads FastAPI validation arrays', () => {
    const msg = getErrorMessage(axiosErr(422, { detail: [{ loc: ['body', 'email'], msg: 'invalid email' }] }));
    expect(msg).toBe('email: invalid email');
  });
  it('falls back by status code and network failure', () => {
    expect(getErrorMessage(axiosErr(403, {}))).toMatch(/permission/);
    expect(getErrorMessage(new AxiosError('Network Error'))).toMatch(/reach the server/);
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });
});

describe('validation', () => {
  it('validates fields', () => {
    expect(validateEmail('a@b.co')).toBeNull();
    expect(validateEmail('nope')).not.toBeNull();
    expect(validatePassword('short1')).not.toBeNull();
    expect(validatePassword('longenough')).not.toBeNull();
    expect(validatePassword('longenough1')).toBeNull();
    expect(validatePhone('')).toBeNull();
    expect(validatePhone('', true)).not.toBeNull();
    expect(validatePhone('+91 98765 43210')).toBeNull();
    expect(validatePrice('0')).not.toBeNull();
    expect(validatePrice('49.5')).toBeNull();
  });
});

describe('helpers', () => {
  it('cn joins classes', () => {
    expect(cn('a', false, undefined, { b: true, c: false }, 'd')).toBe('a b d');
  });
  it('unwrapList handles arrays and envelopes', () => {
    expect(unwrapList([1, 2])).toEqual([1, 2]);
    expect(unwrapList({ items: [3], total: 1 })).toEqual([3]);
    expect(unwrapList({ data: [4] })).toEqual([4]);
    expect(unwrapList(null)).toEqual([]);
  });
  it('cleanParams drops empty values', () => {
    expect(cleanParams({ a: 1, b: '', c: undefined, d: null, e: false })).toEqual({ a: 1, e: false });
  });
  it('niceTicks produces round steps covering the max', () => {
    const t = niceTicks(87);
    expect(t[0]).toBe(0);
    expect(t[t.length - 1]!).toBeGreaterThanOrEqual(87);
    expect(t).toEqual([0, 25, 50, 75, 100]);
  });
});
