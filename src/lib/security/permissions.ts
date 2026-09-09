export type TenantRole =
  | 'super_admin'
  | 'owner'
  | 'admin'
  | 'manager'
  | 'waiter'
  | 'attendant'
  | 'kitchen'
  | 'cashier';

export type MembershipStatus = 'active' | 'invited' | 'disabled' | 'removed';

export type Permission =
  | 'platform:tenants:read'
  | 'platform:tenants:block'
  | 'tenant:read'
  | 'tenant:update'
  | 'tenant_users:read'
  | 'tenant_users:invite'
  | 'tenant_users:update'
  | 'tenant_users:disable'
  | 'profile:read'
  | 'profile:update'
  | 'audit_logs:read';

export type TenantMembership = {
  tenantId: string;
  userId: string;
  role: TenantRole;
  status: MembershipStatus;
};

function permissions(values: Permission[]): Set<Permission> {
  return new Set<Permission>(values);
}

const rolePermissions: Record<TenantRole, Set<Permission>> = {
  super_admin: permissions(['platform:tenants:read', 'platform:tenants:block', 'audit_logs:read']),
  owner: permissions([
    'tenant:read',
    'tenant:update',
    'tenant_users:read',
    'tenant_users:invite',
    'tenant_users:update',
    'tenant_users:disable',
    'profile:read',
    'profile:update',
    'audit_logs:read',
  ]),
  admin: permissions([
    'tenant:read',
    'tenant:update',
    'tenant_users:read',
    'tenant_users:invite',
    'tenant_users:update',
    'profile:read',
    'profile:update',
  ]),
  manager: permissions(['tenant:read', 'tenant_users:read', 'profile:read', 'profile:update']),
  waiter: permissions(['tenant:read', 'profile:read', 'profile:update']),
  attendant: permissions(['tenant:read', 'profile:read', 'profile:update']),
  kitchen: permissions(['tenant:read', 'profile:read', 'profile:update']),
  cashier: permissions(['tenant:read', 'profile:read', 'profile:update']),
};

export function isSuperAdminRole(role: TenantRole): boolean {
  return role === 'super_admin';
}

export function isActiveMembership(membership: TenantMembership | null | undefined): membership is TenantMembership {
  return Boolean(membership && membership.status === 'active');
}

export function canAccessTenant(membership: TenantMembership | null | undefined, requestedTenantId: string): boolean {
  if (!isActiveMembership(membership)) return false;
  return membership.tenantId === requestedTenantId;
}

export function hasPermission(role: TenantRole, permission: Permission): boolean {
  return rolePermissions[role]?.has(permission) ?? false;
}

export function requireTenantAccess(membership: TenantMembership | null | undefined, requestedTenantId: string): TenantMembership {
  if (!isActiveMembership(membership) || membership.tenantId !== requestedTenantId) {
    throw new Error('ACESSO NEGADO: usuário não pertence ao tenant solicitado.');
  }
  return membership;
}

export function requireTenantPermission(
  membership: TenantMembership | null | undefined,
  requestedTenantId: string,
  permission: Permission,
): TenantMembership {
  const validMembership = requireTenantAccess(membership, requestedTenantId);
  if (!hasPermission(validMembership.role, permission)) {
    throw new Error('ACESSO NEGADO: permissão insuficiente.');
  }
  return validMembership;
}
