export type PublicSiteProfile = {
  display_name: string;
  public_slug: string;
  headline: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  address_line: string | null;
  show_menu: boolean;
  accepts_reservations: boolean;
  accepts_online_orders: boolean;
};

export type PublicSiteProduct = {
  public_code: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  is_available: boolean;
};

export type PublicSiteCategory = {
  name: string;
  description: string | null;
  products: PublicSiteProduct[];
};

export type PublicSitePayload = {
  profile: PublicSiteProfile;
  tenant: {
    name: string;
    public_slug: string;
    status: string;
  };
  categories: PublicSiteCategory[];
};

export type TenantPublicProfile = {
  id: string;
  tenant_id: string;
  display_name: string;
  public_slug: string;
  headline: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  address_line: string | null;
  is_published: boolean;
  show_menu: boolean;
  accepts_reservations: boolean;
  accepts_online_orders: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};
