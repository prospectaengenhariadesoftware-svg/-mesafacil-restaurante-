export const RESERVATION_REALTIME_TABLE = 'tenant_table_reservations';
export const RESERVATION_REALTIME_REFRESH_DEBOUNCE_MS = 700;

type MaybeTenantRecord = Record<string, unknown> | null | undefined;

export function buildReservationRealtimeChannelName(tenantId: string): string {
  return `tenant:${tenantId}:reservations`;
}

export function matchesReservationRealtimeTenant(newRecord: MaybeTenantRecord, oldRecord: MaybeTenantRecord, tenantId: string): boolean {
  return newRecord?.tenant_id === tenantId || oldRecord?.tenant_id === tenantId;
}

export function isNewPublicReservationEvent(eventType: string, newRecord: MaybeTenantRecord, tenantId: string): boolean {
  return eventType === 'INSERT' && newRecord?.tenant_id === tenantId && newRecord?.source === 'public_site';
}
