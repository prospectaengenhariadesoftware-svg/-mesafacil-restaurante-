export type PublicMenuProduct = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  is_available: boolean;
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  description: string | null;
  products: PublicMenuProduct[];
};

export type PublicMenuPayload = {
  tenant: {
    id: string;
    name: string;
    public_slug: string;
  };
  table: {
    number: string;
    seats: number;
    sector: string | null;
  };
  categories: PublicMenuCategory[];
};
