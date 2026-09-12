export type TenantCustomerOrder = {
  id: string;
  tenant_id: string;
  table_id: string;
  public_order_code: string;
  customer_name: string | null;
  customer_note: string | null;
  status: 'received' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  total_cents: number;
  created_at: string;
  table_number?: string;
  table_sector?: string | null;
  items: TenantCustomerOrderItem[];
};

export type TenantCustomerOrderItemAddonSnapshot = {
  public_code: string;
  name: string;
  price_delta_cents: number;
};

export type TenantCustomerOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price_cents: number;
  addons_total_cents: number;
  selected_addons: TenantCustomerOrderItemAddonSnapshot[];
  quantity: number;
  notes: string | null;
  line_total_cents: number;
};
