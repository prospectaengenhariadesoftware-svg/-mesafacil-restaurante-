export type TenantStatus = 'trialing' | 'active' | 'blocked' | 'cancelled';
export type ProfileStatus = 'active' | 'disabled' | 'deleted';
export type TenantUserStatus = 'invited' | 'active' | 'disabled' | 'removed';
export type TenantRole = 'super_admin' | 'owner' | 'admin' | 'manager' | 'waiter' | 'attendant' | 'kitchen' | 'cashier';

export type Tenant = {
  id: string;
  name: string;
  legal_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
};

export type TenantUser = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  status: TenantUserStatus;
  created_at: string;
  updated_at: string;
};

export type TenantMembershipWithTenant = TenantUser & {
  tenants: Tenant | null;
};
