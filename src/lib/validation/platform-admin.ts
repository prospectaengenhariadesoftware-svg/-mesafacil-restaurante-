import type { TenantStatus } from '@/lib/types/saas';

export type TenantStatusAction = 'block' | 'unblock';

export type TenantStatusActionValidation =
  | { success: true; data: { tenantId: string; action: TenantStatusAction; nextStatus: TenantStatus; confirmation: string; notes: string | null } }
  | { success: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_NOTES_LENGTH = 240;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function normalizePlatformAdminText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function getTenantStatusActionMetadata(action: TenantStatusAction): { nextStatus: TenantStatus; requiredConfirmation: string; auditAction: string; successMessage: string } {
  if (action === 'block') {
    return {
      nextStatus: 'blocked',
      requiredConfirmation: 'BLOQUEAR',
      auditAction: 'tenant.blocked',
      successMessage: 'Tenant bloqueado com auditoria.',
    };
  }

  return {
    nextStatus: 'active',
    requiredConfirmation: 'DESBLOQUEAR',
    auditAction: 'tenant.unblocked',
    successMessage: 'Tenant desbloqueado com auditoria.',
  };
}

export function validateTenantStatusActionInput(input: {
  tenantId: unknown;
  action: unknown;
  confirmation: unknown;
  notes?: unknown;
}): TenantStatusActionValidation {
  const tenantId = normalizePlatformAdminText(input.tenantId);
  if (!isUuid(tenantId)) return { success: false, error: 'Tenant inválido.' };

  const action = normalizePlatformAdminText(input.action);
  if (action !== 'block' && action !== 'unblock') return { success: false, error: 'Ação administrativa inválida.' };

  const metadata = getTenantStatusActionMetadata(action);
  const confirmation = normalizePlatformAdminText(input.confirmation).toUpperCase();
  if (confirmation !== metadata.requiredConfirmation) {
    return { success: false, error: `Digite ${metadata.requiredConfirmation} para confirmar esta ação.` };
  }

  const notes = normalizePlatformAdminText(input.notes);
  if (notes.length > MAX_NOTES_LENGTH) return { success: false, error: 'Observação deve ter no máximo 240 caracteres.' };

  return {
    success: true,
    data: {
      tenantId,
      action,
      nextStatus: metadata.nextStatus,
      confirmation,
      notes: notes || null,
    },
  };
}
