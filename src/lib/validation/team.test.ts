import { describe, expect, it } from 'vitest';
import { validateTeamInviteInput, validateTeamMemberInput, isProtectedOwnerDemotion } from './team';

describe('team validation', () => {
  it('normalizes invite by existing auth email with safe role/status', () => {
    expect(validateTeamInviteInput({ email: ' OPERADOR@EXEMPLO.COM ', role: 'cashier', status: 'active' })).toEqual({
      success: true,
      data: { email: 'operador@exemplo.com', role: 'cashier', status: 'active' },
    });
    expect(validateTeamInviteInput({ email: 'sem-email', role: 'cashier', status: 'active' }).success).toBe(false);
    expect(validateTeamInviteInput({ email: 'admin@exemplo.com', role: 'super_admin', status: 'active' }).success).toBe(false);
    expect(validateTeamInviteInput({ email: 'owner@exemplo.com', role: 'owner', status: 'active' }).success).toBe(false);
  });

  it('normalizes editable team member role and status', () => {
    expect(validateTeamMemberInput({ role: 'manager', status: 'active' })).toEqual({
      success: true,
      data: { role: 'manager', status: 'active' },
    });
    expect(validateTeamMemberInput({ role: 'kitchen', status: 'disabled' })).toEqual({
      success: true,
      data: { role: 'kitchen', status: 'disabled' },
    });
  });

  it('rejects unsafe roles and statuses in tenant team management', () => {
    expect(validateTeamMemberInput({ role: 'super_admin', status: 'active' }).success).toBe(false);
    expect(validateTeamMemberInput({ role: 'owner', status: 'removed' }).success).toBe(false);
    expect(validateTeamMemberInput({ role: 'admin', status: 'deleted' }).success).toBe(false);
  });

  it('detects operations that would remove or demote the last owner', () => {
    expect(isProtectedOwnerDemotion({ currentRole: 'owner', nextRole: 'admin', nextStatus: 'active', activeOwnerCount: 1 })).toBe(true);
    expect(isProtectedOwnerDemotion({ currentRole: 'owner', nextRole: 'owner', nextStatus: 'disabled', activeOwnerCount: 1 })).toBe(true);
    expect(isProtectedOwnerDemotion({ currentRole: 'owner', nextRole: 'admin', nextStatus: 'active', activeOwnerCount: 2 })).toBe(false);
    expect(isProtectedOwnerDemotion({ currentRole: 'admin', nextRole: 'manager', nextStatus: 'active', activeOwnerCount: 1 })).toBe(false);
  });
});
