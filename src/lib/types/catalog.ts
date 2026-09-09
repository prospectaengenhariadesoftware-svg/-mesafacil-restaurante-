export type ProductCategory = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  tenant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  tenant_product_categories?: ProductCategory | null;
};

export type RestaurantTable = {
  id: string;
  tenant_id: string;
  number: string;
  seats: number;
  sector: string | null;
  qr_token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
