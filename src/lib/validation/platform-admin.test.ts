import { describe, expect, it } from 'vitest';
import { getTenantStatusActionMetadata, validateTenantStatusActionInput } from './platform-admin';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('platform admin tenant status validation', () => {
  it('validates a tenant block request with explicit confirmation', () => {
    expect(validateTenantStatusActionInput({ tenantId, action: 'block', confirmation: ' bloquear ', notes: 'inadimplência' })).toEqual({
      success: true,
      data: {
        tenantId,
        action: 'block',
        nextStatus: 'blocked',
        confirmation: 'BLOQUEAR',
        notes: 'inadimplência',
      },
    });
  });

  it('validates a tenant unblock request with explicit confirmation', () => {
    expect(validateTenantStatusActionInput({ tenantId, action: 'unblock', confirmation: 'desbloquear' })).toEqual({
      success: true,
      data: {
        tenantId,
        action: 'unblock',
        nextStatus: 'active',
        confirmation: 'DESBLOQUEAR',
        notes: null,
      },
    });
  });

  it('rejects invalid tenant ids, actions and confirmations', () => {
    expect(validateTenantStatusActionInput({ tenantId: 'x', action: 'block', confirmation: 'BLOQUEAR' }).success).toBe(false);
    expect(validateTenantStatusActionInput({ tenantId, action: 'delete', confirmation: 'BLOQUEAR' }).success).toBe(false);
    expect(validateTenantStatusActionInput({ tenantId, action: 'block', confirmation: 'OK' })).toEqual({
      success: false,
      error: 'Digite BLOQUEAR para confirmar esta ação.',
    });
  });

  it('caps notes length and exposes action metadata', () => {
    expect(validateTenantStatusActionInput({ tenantId, action: 'unblock', confirmation: 'DESBLOQUEAR', notes: 'a'.repeat(241) })).toEqual({
      success: false,
      error: 'Observação deve ter no máximo 240 caracteres.',
    });
    expect(getTenantStatusActionMetadata('block').auditAction).toBe('tenant.blocked');
    expect(getTenantStatusActionMetadata('unblock').nextStatus).toBe('active');
  });
});
