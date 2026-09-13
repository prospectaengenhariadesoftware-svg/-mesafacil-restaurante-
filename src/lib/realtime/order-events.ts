export type OrderPanelSource = 'pedidos' | 'cozinha';

export const ORDER_REALTIME_TABLES = ['tenant_customer_orders', 'tenant_customer_order_items'] as const;
export const ORDER_REALTIME_REFRESH_DEBOUNCE_MS = 700;

type OrderRealtimeTable = (typeof ORDER_REALTIME_TABLES)[number];
type MaybeTenantRecord = Record<string, unknown> | null | undefined;

export function buildOrderRealtimeChannelName(tenantId: string, source: OrderPanelSource): string {
  return `tenant:${tenantId}:orders:${source}`;
}

export function isOrderRealtimeTable(table: string): table is OrderRealtimeTable {
  return ORDER_REALTIME_TABLES.includes(table as OrderRealtimeTable);
}

export function matchesOrderRealtimeTenant(newRecord: MaybeTenantRecord, oldRecord: MaybeTenantRecord, tenantId: string): boolean {
  return newRecord?.tenant_id === tenantId || oldRecord?.tenant_id === tenantId;
}
