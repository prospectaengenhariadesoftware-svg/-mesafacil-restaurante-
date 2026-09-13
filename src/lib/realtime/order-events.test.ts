import { describe, expect, it } from 'vitest';

import {
  ORDER_REALTIME_REFRESH_DEBOUNCE_MS,
  buildOrderRealtimeChannelName,
  isOrderRealtimeTable,
  matchesOrderRealtimeTenant,
} from './order-events';

describe('order realtime event helpers', () => {
  const tenantId = 'abababab-1111-4aba-8aba-abababababab';

  it('builds a tenant-scoped channel name without leaking broader tenant filters', () => {
    expect(buildOrderRealtimeChannelName(tenantId, 'pedidos')).toBe(`tenant:${tenantId}:orders:pedidos`);
    expect(buildOrderRealtimeChannelName(tenantId, 'cozinha')).toBe(`tenant:${tenantId}:orders:cozinha`);
  });

  it('limits realtime refreshes to order header and order item tables', () => {
    expect(isOrderRealtimeTable('tenant_customer_orders')).toBe(true);
    expect(isOrderRealtimeTable('tenant_customer_order_items')).toBe(true);
    expect(isOrderRealtimeTable('tenant_products')).toBe(false);
  });

  it('matches tenant ids from new or old realtime records', () => {
    expect(matchesOrderRealtimeTenant({ tenant_id: tenantId }, {}, tenantId)).toBe(true);
    expect(matchesOrderRealtimeTenant({}, { tenant_id: tenantId }, tenantId)).toBe(true);
    expect(matchesOrderRealtimeTenant({ tenant_id: 'bcbcbcbc-1111-4bcb-8bcb-bcbcbcbcbcbc' }, {}, tenantId)).toBe(false);
  });

  it('uses a short positive debounce to avoid refresh storms', () => {
    expect(ORDER_REALTIME_REFRESH_DEBOUNCE_MS).toBeGreaterThanOrEqual(300);
    expect(ORDER_REALTIME_REFRESH_DEBOUNCE_MS).toBeLessThanOrEqual(2000);
  });
});
