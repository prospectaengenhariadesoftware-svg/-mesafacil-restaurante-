import type { TenantRole, TenantUserStatus } from '@/lib/types/saas';

type ValidationResult<T> = { success: true; data: T } | { success: false; error: string };

export type EditableTenantRole = Exclude<TenantRole, 'super_admin'>;
export type EditableTenantUserStatus = Exclude<TenantUserStatus, 'invited' | 'removed'>;

export type TeamMemberInput = {
  role: EditableTenantRole;
  status: EditableTenantUserStatus;
};

export type TeamInviteInput = TeamMemberInput & {
  email: string;
};

const EDITABLE_ROLES: EditableTenantRole[] = ['owner', 'admin', 'manager', 'waiter', 'attendant', 'kitchen', 'cashier'];
const EDITABLE_STATUSES: EditableTenantUserStatus[] = ['active', 'disabled'];

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanEmail(value: unknown): string {
  return cleanText(value).toLowerCase();
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function validateTeamInviteInput(input: Record<string, unknown>): ValidationResult<TeamInviteInput> {
  const email = cleanEmail(input.email);
  if (!isEmail(email)) return { success: false, error: 'Informe um e-mail válido de usuário já cadastrado.' };

  const member = validateTeamMemberInput(input);
  if (member.success === false) return { success: false, error: member.error };
  if (member.data.role === 'owner') {
    return { success: false, error: 'Owner deve ser gerenciado em fluxo explícito de propriedade.' };
  }
  return { success: true, data: { email, ...member.data } };
}

export function validateTeamMemberInput(input: Record<string, unknown>): ValidationResult<TeamMemberInput> {
  const role = cleanText(input.role) as EditableTenantRole;
  const status = cleanText(input.status) as EditableTenantUserStatus;

  if (!EDITABLE_ROLES.includes(role)) {
    return { success: false, error: 'Papel inválido para equipe do restaurante.' };
  }
  if (!EDITABLE_STATUSES.includes(status)) {
    return { success: false, error: 'Status inválido para equipe do restaurante.' };
  }

  return { success: true, data: { role, status } };
}

export function isProtectedOwnerDemotion({
  currentRole,
  nextRole,
  nextStatus,
  activeOwnerCount,
}: Readonly<{
  currentRole: TenantRole;
  nextRole: TenantRole;
  nextStatus: TenantUserStatus;
  activeOwnerCount: number;
}>): boolean {
  if (currentRole !== 'owner') return false;
  if (activeOwnerCount > 1) return false;
  return nextRole !== 'owner' || nextStatus !== 'active';
}
