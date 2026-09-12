export type PublicMenuAddon = {
  public_code: string;
  name: string;
  description: string | null;
  price_delta_cents: number;
  is_available: boolean;
};

export type PublicMenuProduct = {
  public_code: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  is_available: boolean;
  addons: PublicMenuAddon[];
};

export type PublicMenuCategory = {
  name: string;
  description: string | null;
  products: PublicMenuProduct[];
};

export type PublicMenuPayload = {
  tenant: {
    name: string;
    public_slug: string;
    public_description?: string | null;
    operating_status?: string;
    accepts_qr_orders?: boolean;
    public_notice?: string | null;
    service_fee_basis_points?: number;
    estimated_prep_minutes?: number | null;
  };
  table: {
    number: string;
    seats: number;
    sector: string | null;
  };
  categories: PublicMenuCategory[];
};
