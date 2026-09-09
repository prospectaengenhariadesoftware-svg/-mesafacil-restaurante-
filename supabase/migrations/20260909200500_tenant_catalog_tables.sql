-- MesaFácil — Cadastro inicial de categorias, produtos e mesas
-- Standard tenant identifier: tenant_id

create table if not exists public.tenant_product_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_product_categories_name_len check (char_length(trim(name)) between 2 and 80),
  constraint tenant_product_categories_unique_name unique (tenant_id, name)
);

create table if not exists public.tenant_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid not null references public.tenant_product_categories(id) on delete restrict,
  name text not null,
  description text,
  price_cents integer not null,
  image_url text,
  is_available boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_products_name_len check (char_length(trim(name)) between 2 and 120),
  constraint tenant_products_price_positive check (price_cents > 0),
  constraint tenant_products_unique_name unique (tenant_id, name)
);

create table if not exists public.tenant_tables (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  number text not null,
  seats integer not null default 4,
  sector text,
  qr_token uuid not null default gen_random_uuid(),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_tables_number_len check (char_length(trim(number)) between 1 and 20),
  constraint tenant_tables_seats_valid check (seats between 1 and 99),
  constraint tenant_tables_unique_number unique (tenant_id, number),
  constraint tenant_tables_unique_qr_token unique (qr_token)
);

create index if not exists idx_tenant_product_categories_tenant on public.tenant_product_categories(tenant_id, is_active, display_order, name);
create index if not exists idx_tenant_products_tenant on public.tenant_products(tenant_id, is_available, name);
create index if not exists idx_tenant_products_category on public.tenant_products(category_id);
create index if not exists idx_tenant_tables_tenant on public.tenant_tables(tenant_id, is_active, number);

create trigger set_tenant_product_categories_updated_at
before update on public.tenant_product_categories
for each row execute function public.set_updated_at();

create trigger set_tenant_products_updated_at
before update on public.tenant_products
for each row execute function public.set_updated_at();

create trigger set_tenant_tables_updated_at
before update on public.tenant_tables
for each row execute function public.set_updated_at();

alter table public.tenant_product_categories enable row level security;
alter table public.tenant_product_categories force row level security;
alter table public.tenant_products enable row level security;
alter table public.tenant_products force row level security;
alter table public.tenant_tables enable row level security;
alter table public.tenant_tables force row level security;

-- Categories
CREATE POLICY tenant_product_categories_select_own_tenant
ON public.tenant_product_categories
FOR SELECT
TO authenticated
USING (public.current_user_has_tenant_access(tenant_id));

CREATE POLICY tenant_product_categories_insert_owner_admin_manager
ON public.tenant_product_categories
FOR INSERT
TO authenticated
WITH CHECK (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[]));

CREATE POLICY tenant_product_categories_update_owner_admin_manager
ON public.tenant_product_categories
FOR UPDATE
TO authenticated
USING (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[]))
WITH CHECK (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[]));

CREATE POLICY tenant_product_categories_delete_owner_admin
ON public.tenant_product_categories
FOR DELETE
TO authenticated
USING (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role[]));

-- Products
CREATE POLICY tenant_products_select_own_tenant
ON public.tenant_products
FOR SELECT
TO authenticated
USING (public.current_user_has_tenant_access(tenant_id));

CREATE POLICY tenant_products_insert_owner_admin_manager
ON public.tenant_products
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[])
  and exists (
    select 1 from public.tenant_product_categories c
    where c.id = category_id and c.tenant_id = tenant_products.tenant_id
  )
);

CREATE POLICY tenant_products_update_owner_admin_manager
ON public.tenant_products
FOR UPDATE
TO authenticated
USING (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[]))
WITH CHECK (
  public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[])
  and exists (
    select 1 from public.tenant_product_categories c
    where c.id = category_id and c.tenant_id = tenant_products.tenant_id
  )
);

CREATE POLICY tenant_products_delete_owner_admin
ON public.tenant_products
FOR DELETE
TO authenticated
USING (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role[]));

-- Tables
CREATE POLICY tenant_tables_select_own_tenant
ON public.tenant_tables
FOR SELECT
TO authenticated
USING (public.current_user_has_tenant_access(tenant_id));

CREATE POLICY tenant_tables_insert_owner_admin_manager
ON public.tenant_tables
FOR INSERT
TO authenticated
WITH CHECK (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[]));

CREATE POLICY tenant_tables_update_owner_admin_manager
ON public.tenant_tables
FOR UPDATE
TO authenticated
USING (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[]))
WITH CHECK (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[]));

CREATE POLICY tenant_tables_delete_owner_admin
ON public.tenant_tables
FOR DELETE
TO authenticated
USING (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role[]));
