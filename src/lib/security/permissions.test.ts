import { describe, expect, it } from 'vitest';
import { canAccessTenant, hasPermission, isSuperAdminRole, type TenantMembership } from './permissions';

describe('SaaS tenant authorization', () => {
  const ownerA: TenantMembership = {
    tenantId: '11111111-1111-4111-8111-111111111111',
    userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    role: 'owner',
    status: 'active',
  };

  const ownerB: TenantMembership = {
    tenantId: '22222222-2222-4222-8222-222222222222',
    userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    role: 'owner',
    status: 'active',
  };

  it('allows an active owner to access only their own tenant', () => {
    expect(canAccessTenant(ownerA, ownerA.tenantId)).toBe(true);
    expect(canAccessTenant(ownerA, ownerB.tenantId)).toBe(false);
    expect(canAccessTenant(ownerB, ownerA.tenantId)).toBe(false);
  });

  it('denies disabled tenant membership even when tenant_id matches', () => {
    expect(canAccessTenant({ ...ownerA, status: 'disabled' }, ownerA.tenantId)).toBe(false);
  });

  it('does not treat frontend supplied tenant_id as authority', () => {
    const forgedTenantId = ownerB.tenantId;
    expect(canAccessTenant(ownerA, forgedTenantId)).toBe(false);
  });

  it('grants owner tenant management permissions and denies kitchen administrative permissions', () => {
    expect(hasPermission('owner', 'tenant:update')).toBe(true);
    expect(hasPermission('owner', 'tenant_users:invite')).toBe(true);
    expect(hasPermission('kitchen', 'tenant_users:invite')).toBe(false);
    expect(hasPermission('waiter', 'tenant:update')).toBe(false);
  });

  it('keeps super_admin as a platform role, not a tenant membership shortcut', () => {
    expect(isSuperAdminRole('super_admin')).toBe(true);
    expect(hasPermission('super_admin', 'platform:tenants:read')).toBe(true);
    expect(canAccessTenant({ ...ownerA, role: 'super_admin' }, ownerB.tenantId)).toBe(false);
  });
});
