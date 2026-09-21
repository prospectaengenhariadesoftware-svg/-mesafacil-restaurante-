import { describe, expect, it } from 'vitest';

import {
  RESERVATION_REALTIME_REFRESH_DEBOUNCE_MS,
  RESERVATION_REALTIME_TABLE,
  buildReservationRealtimeChannelName,
  isNewPublicReservationEvent,
  matchesReservationRealtimeTenant,
} from './reservation-events';

describe('reservation realtime event helpers', () => {
  const tenantId = 'abababab-1111-4aba-8aba-abababababab';

  it('uses the canonical reservation table', () => {
    expect(RESERVATION_REALTIME_TABLE).toBe('tenant_table_reservations');
  });

  it('builds a tenant-scoped reservations channel name', () => {
    expect(buildReservationRealtimeChannelName(tenantId)).toBe(`tenant:${tenantId}:reservations`);
  });

  it('matches tenant ids from new or old realtime records', () => {
    expect(matchesReservationRealtimeTenant({ tenant_id: tenantId }, {}, tenantId)).toBe(true);
    expect(matchesReservationRealtimeTenant({}, { tenant_id: tenantId }, tenantId)).toBe(true);
    expect(matchesReservationRealtimeTenant({ tenant_id: 'bcbcbcbc-1111-4bcb-8bcb-bcbcbcbcbcbc' }, {}, tenantId)).toBe(false);
  });

  it('flags only new public-site reservation inserts for popup alerts', () => {
    expect(isNewPublicReservationEvent('INSERT', { tenant_id: tenantId, source: 'public_site' }, tenantId)).toBe(true);
    expect(isNewPublicReservationEvent('UPDATE', { tenant_id: tenantId, source: 'public_site' }, tenantId)).toBe(false);
    expect(isNewPublicReservationEvent('INSERT', { tenant_id: tenantId, source: 'manual' }, tenantId)).toBe(false);
  });

  it('uses a short positive debounce to avoid refresh storms', () => {
    expect(RESERVATION_REALTIME_REFRESH_DEBOUNCE_MS).toBeGreaterThanOrEqual(300);
    expect(RESERVATION_REALTIME_REFRESH_DEBOUNCE_MS).toBeLessThanOrEqual(2000);
  });
});
