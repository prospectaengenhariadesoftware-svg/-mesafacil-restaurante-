export type TenantStatus = 'trialing' | 'active' | 'blocked' | 'cancelled';
export type RestaurantOperatingStatus = 'open' | 'closed' | 'paused';
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
  public_slug?: string | null;
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


export type TenantSettings = {
  id: string;
  tenant_id: string;
  public_description: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  accepts_qr_orders: boolean;
  service_fee_basis_points: number;
  estimated_prep_minutes: number | null;
  operating_status: RestaurantOperatingStatus;
  public_notice: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};
