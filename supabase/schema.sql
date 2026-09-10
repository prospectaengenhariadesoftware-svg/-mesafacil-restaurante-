-- MesaFácil MVP — Supabase initial schema
-- Apply in Supabase SQL editor or as a migration.

create extension if not exists "pgcrypto";

create type public.restaurant_role as enum ('admin', 'attendant', 'kitchen', 'cashier');
create type public.order_status as enum ('received', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
create type public.order_type as enum ('dine_in', 'takeaway', 'delivery');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  phone text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_users (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.restaurant_role not null default 'attendant',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  number text not null,
  label text,
  qr_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, number)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  image_url text,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid references public.tables(id) on delete set null,
  order_number integer not null,
  status public.order_status not null default 'received',
  type public.order_type not null default 'dine_in',
  customer_name text,
  notes text,
  total_cents integer not null check (total_cents >= 0),
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique (restaurant_id, order_number)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  notes text,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index idx_tables_qr_token on public.tables(qr_token);
create index idx_categories_restaurant on public.categories(restaurant_id);
create index idx_products_restaurant on public.products(restaurant_id);
create index idx_products_category on public.products(category_id);
create index idx_orders_restaurant_status on public.orders(restaurant_id, status);
create index idx_orders_created_at on public.orders(created_at desc);
create index idx_order_items_order on public.order_items(order_id);

alter table public.restaurants enable row level security;
alter table public.restaurant_users enable row level security;
alter table public.tables enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security;
-- MesaFácil — Etapa 1: Fundação técnica, autenticação e segurança SaaS
-- Standard tenant identifier: tenant_id

create extension if not exists "pgcrypto";

-- Enums
DO $$ BEGIN
  CREATE TYPE public.tenant_status AS ENUM ('trialing', 'active', 'blocked', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.profile_status AS ENUM ('active', 'disabled', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.tenant_user_status AS ENUM ('invited', 'active', 'disabled', 'removed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.tenant_role AS ENUM (
    'super_admin',
    'owner',
    'admin',
    'manager',
    'waiter',
    'attendant',
    'kitchen',
    'cashier'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Updated timestamp helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Core SaaS tables
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 3),
  legal_name text,
  document text,
  email text,
  phone text,
  status public.tenant_status not null default 'trialing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 2),
  email text not null,
  phone text,
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tenant_role not null,
  status public.tenant_user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'support',
  status public.profile_status not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_tenants_status on public.tenants(status);
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_tenant_users_tenant_id on public.tenant_users(tenant_id);
create index if not exists idx_tenant_users_user_id on public.tenant_users(user_id);
create index if not exists idx_tenant_users_role on public.tenant_users(role);
create index if not exists idx_tenant_users_active_lookup on public.tenant_users(user_id, tenant_id, status);
create index if not exists idx_platform_admins_user_id on public.platform_admins(user_id);
create index if not exists idx_audit_logs_tenant_id on public.audit_logs(tenant_id);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- Triggers
DROP TRIGGER IF EXISTS set_tenants_updated_at ON public.tenants;
CREATE TRIGGER set_tenants_updated_at BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_tenant_users_updated_at ON public.tenant_users;
CREATE TRIGGER set_tenant_users_updated_at BEFORE UPDATE ON public.tenant_users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_platform_admins_updated_at ON public.platform_admins;
CREATE TRIGGER set_platform_admins_updated_at BEFORE UPDATE ON public.platform_admins
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Security helper functions
create or replace function public.is_platform_super_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = check_user_id
      and pa.status = 'active'
  );
$$;

create or replace function public.current_user_has_tenant_access(check_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tenant_users tu
    where tu.tenant_id = check_tenant_id
      and tu.user_id = auth.uid()
      and tu.status = 'active'
  ) or public.is_platform_super_admin(auth.uid());
$$;

create or replace function public.current_user_has_tenant_role(check_tenant_id uuid, allowed_roles public.tenant_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tenant_users tu
    where tu.tenant_id = check_tenant_id
      and tu.user_id = auth.uid()
      and tu.status = 'active'
      and tu.role = any(allowed_roles)
  ) or public.is_platform_super_admin(auth.uid());
$$;

create or replace function public.create_profile_for_current_user(
  profile_name text,
  profile_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_profile_id uuid;
  current_email text;
begin
  if auth.uid() is null then
    raise exception 'ACESSO NEGADO: usuário não autenticado';
  end if;

  if char_length(trim(profile_name)) < 2 then
    raise exception 'Nome inválido';
  end if;

  select email into current_email from auth.users where id = auth.uid();

  insert into public.profiles (user_id, name, email, phone)
  values (auth.uid(), trim(profile_name), coalesce(current_email, ''), nullif(trim(coalesce(profile_phone, '')), ''))
  on conflict (user_id) do update
    set name = excluded.name,
        email = excluded.email,
        phone = excluded.phone,
        updated_at = now()
  returning id into new_profile_id;

  return new_profile_id;
end;
$$;

create or replace function public.create_tenant_for_current_user(
  tenant_name text,
  tenant_legal_name text default null,
  tenant_document text default null,
  tenant_email text default null,
  tenant_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'ACESSO NEGADO: usuário não autenticado';
  end if;

  if char_length(trim(tenant_name)) < 3 then
    raise exception 'Nome do restaurante inválido';
  end if;

  insert into public.tenants (name, legal_name, document, email, phone, status)
  values (
    trim(tenant_name),
    nullif(trim(coalesce(tenant_legal_name, '')), ''),
    nullif(trim(coalesce(tenant_document, '')), ''),
    nullif(lower(trim(coalesce(tenant_email, ''))), ''),
    nullif(trim(coalesce(tenant_phone, '')), ''),
    'trialing'
  )
  returning id into new_tenant_id;

  insert into public.tenant_users (tenant_id, user_id, role, status)
  values (new_tenant_id, auth.uid(), 'owner', 'active');

  insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
  values (new_tenant_id, auth.uid(), 'tenant.created', 'tenant', new_tenant_id, '{}'::jsonb);

  return new_tenant_id;
end;
$$;

grant execute on function public.create_profile_for_current_user(text, text) to authenticated;
grant execute on function public.create_tenant_for_current_user(text, text, text, text, text) to authenticated;
grant execute on function public.current_user_has_tenant_access(uuid) to authenticated;
grant execute on function public.current_user_has_tenant_role(uuid, public.tenant_role[]) to authenticated;
grant execute on function public.is_platform_super_admin(uuid) to authenticated;

-- Enable RLS
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_users enable row level security;
alter table public.platform_admins enable row level security;
alter table public.audit_logs enable row level security;

-- Force RLS for table owners except SECURITY DEFINER functions/service role
alter table public.tenants force row level security;
alter table public.profiles force row level security;
alter table public.tenant_users force row level security;
alter table public.platform_admins force row level security;
alter table public.audit_logs force row level security;

-- Drop old policies to keep migration idempotent during staging resets
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('tenants', 'profiles', 'tenant_users', 'platform_admins', 'audit_logs')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- tenants policies
CREATE POLICY "tenants_select_own_or_platform_admin"
ON public.tenants
FOR SELECT
TO authenticated
USING (public.current_user_has_tenant_access(id));

CREATE POLICY "tenants_insert_platform_admin_only"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "tenants_update_owner_admin_or_platform_admin"
ON public.tenants
FOR UPDATE
TO authenticated
USING (public.current_user_has_tenant_role(id, ARRAY['owner','admin']::public.tenant_role[]))
WITH CHECK (public.current_user_has_tenant_role(id, ARRAY['owner','admin']::public.tenant_role[]));

CREATE POLICY "tenants_delete_owner_or_platform_admin"
ON public.tenants
FOR DELETE
TO authenticated
USING (public.current_user_has_tenant_role(id, ARRAY['owner']::public.tenant_role[]));

-- profiles policies
CREATE POLICY "profiles_select_self_or_platform_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_platform_super_admin(auth.uid()));

CREATE POLICY "profiles_insert_self"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_self"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_delete_self_or_platform_admin"
ON public.profiles
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_platform_super_admin(auth.uid()));

-- tenant_users policies
CREATE POLICY "tenant_users_select_own_tenant"
ON public.tenant_users
FOR SELECT
TO authenticated
USING (public.current_user_has_tenant_access(tenant_id));

CREATE POLICY "tenant_users_insert_owner_admin_or_platform_admin"
ON public.tenant_users
FOR INSERT
TO authenticated
WITH CHECK (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role[]));

CREATE POLICY "tenant_users_update_owner_admin_or_platform_admin"
ON public.tenant_users
FOR UPDATE
TO authenticated
USING (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role[]))
WITH CHECK (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role[]));

CREATE POLICY "tenant_users_delete_owner_or_platform_admin"
ON public.tenant_users
FOR DELETE
TO authenticated
USING (public.current_user_has_tenant_role(tenant_id, ARRAY['owner']::public.tenant_role[]));

-- platform_admins policies
CREATE POLICY "platform_admins_select_platform_admin_only"
ON public.platform_admins
FOR SELECT
TO authenticated
USING (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "platform_admins_insert_platform_admin_only"
ON public.platform_admins
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "platform_admins_update_platform_admin_only"
ON public.platform_admins
FOR UPDATE
TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "platform_admins_delete_platform_admin_only"
ON public.platform_admins
FOR DELETE
TO authenticated
USING (public.is_platform_super_admin(auth.uid()));

-- audit_logs policies
CREATE POLICY "audit_logs_select_own_tenant_or_platform_admin"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (tenant_id IS NOT NULL AND public.current_user_has_tenant_access(tenant_id));

CREATE POLICY "audit_logs_insert_own_tenant_or_platform_admin"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    tenant_id IS NULL
    OR public.current_user_has_tenant_access(tenant_id)
  )
);

CREATE POLICY "audit_logs_update_platform_admin_only"
ON public.audit_logs
FOR UPDATE
TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "audit_logs_delete_platform_admin_only"
ON public.audit_logs
FOR DELETE
TO authenticated
USING (public.is_platform_super_admin(auth.uid()));
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
-- MesaFácil — Reforço de integridade produto-categoria por tenant

alter table public.tenant_product_categories
  add constraint tenant_product_categories_id_tenant_unique unique (id, tenant_id);

alter table public.tenant_products
  add constraint tenant_products_category_same_tenant
  foreign key (category_id, tenant_id)
  references public.tenant_product_categories(id, tenant_id)
  on delete restrict;
-- MesaFácil — Public QR menu foundation
-- Adds public tenant slug and a safe RPC for anonymous menu access by QR token.

create extension if not exists unaccent with schema public;

create or replace function public.slugify_public(value text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      regexp_replace(
        regexp_replace(
          lower(unaccent(value)),
          '[^a-z0-9]+', '-', 'g'
        ),
        '(^-|-$)', '', 'g'
      ),
      ''
    ),
    'restaurante'
  );
$$;

alter table public.tenants
  add column if not exists public_slug text;

update public.tenants
set public_slug = left(public.slugify_public(name), 71) || '-' || left(replace(id::text, '-', ''), 8)
where public_slug is null;

alter table public.tenants
  alter column public_slug set not null;

alter table public.tenants
  add constraint tenants_public_slug_format check (public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

alter table public.tenants
  add constraint tenants_public_slug_len check (char_length(public_slug) between 1 and 80);

create unique index if not exists tenants_public_slug_unique_idx on public.tenants(public_slug);

create or replace function public.get_public_menu_by_qr(menu_slug text, menu_qr_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'tenant', jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'public_slug', t.public_slug
    ),
    'table', jsonb_build_object(
      'id', tb.id,
      'number', tb.number,
      'seats', tb.seats,
      'sector', tb.sector
    ),
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'description', c.description,
          'products', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', p.id,
                'name', p.name,
                'description', p.description,
                'price_cents', p.price_cents,
                'image_url', p.image_url,
                'is_available', p.is_available
              )
              order by p.name
            )
            from public.tenant_products p
            where p.tenant_id = t.id
              and p.category_id = c.id
              and p.is_available = true
          ), '[]'::jsonb)
        )
        order by c.display_order, c.name
      )
      from public.tenant_product_categories c
      where c.tenant_id = t.id
        and c.is_active = true
    ), '[]'::jsonb)
  ) into result
  from public.tenants t
  join public.tenant_tables tb on tb.tenant_id = t.id
  where t.public_slug = menu_slug
    and t.status in ('active', 'trialing')
    and tb.qr_token = menu_qr_token
    and tb.is_active = true;

  return result;
end;
$$;

revoke all on function public.get_public_menu_by_qr(text, uuid) from public;
grant execute on function public.get_public_menu_by_qr(text, uuid) to anon, authenticated;
-- MesaFácil — Public QR menu hardening
-- Aligns slug length with frontend validation and removes internal table id from public payload.

update public.tenants
set public_slug = left(public.slugify_public(name), 71) || '-' || left(replace(id::text, '-', ''), 8)
where char_length(public_slug) > 80;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_public_slug_len'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_public_slug_len check (char_length(public_slug) between 1 and 80);
  end if;
end $$;

create or replace function public.get_public_menu_by_qr(menu_slug text, menu_qr_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'tenant', jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'public_slug', t.public_slug
    ),
    'table', jsonb_build_object(
      'number', tb.number,
      'seats', tb.seats,
      'sector', tb.sector
    ),
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'description', c.description,
          'products', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', p.id,
                'name', p.name,
                'description', p.description,
                'price_cents', p.price_cents,
                'image_url', p.image_url,
                'is_available', p.is_available
              )
              order by p.name
            )
            from public.tenant_products p
            where p.tenant_id = t.id
              and p.category_id = c.id
              and p.is_available = true
          ), '[]'::jsonb)
        )
        order by c.display_order, c.name
      )
      from public.tenant_product_categories c
      where c.tenant_id = t.id
        and c.is_active = true
    ), '[]'::jsonb)
  ) into result
  from public.tenants t
  join public.tenant_tables tb on tb.tenant_id = t.id
  where t.public_slug = menu_slug
    and t.status in ('active', 'trialing')
    and tb.qr_token = menu_qr_token
    and tb.is_active = true;

  return result;
end;
$$;

revoke all on function public.get_public_menu_by_qr(text, uuid) from public;
grant execute on function public.get_public_menu_by_qr(text, uuid) to anon, authenticated;
-- MesaFácil — Public customer orders by QR
-- Uses tenant_id; does not use legacy restaurant_id tables.

create table if not exists public.tenant_customer_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  table_id uuid not null references public.tenant_tables(id) on delete restrict,
  public_order_code text not null,
  customer_name text,
  customer_note text,
  status text not null default 'received',
  total_cents integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_customer_orders_status_check check (status in ('received','confirmed','preparing','ready','delivered','cancelled')),
  constraint tenant_customer_orders_total_nonnegative check (total_cents >= 0),
  constraint tenant_customer_orders_customer_name_len check (customer_name is null or char_length(trim(customer_name)) between 2 and 80),
  constraint tenant_customer_orders_customer_note_len check (customer_note is null or char_length(customer_note) <= 300),
  constraint tenant_customer_orders_code_unique unique (tenant_id, public_order_code)
);

create table if not exists public.tenant_customer_order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_id uuid not null references public.tenant_customer_orders(id) on delete cascade,
  product_id uuid not null references public.tenant_products(id) on delete restrict,
  product_name text not null,
  unit_price_cents integer not null,
  quantity integer not null,
  notes text,
  line_total_cents integer generated always as (unit_price_cents * quantity) stored,
  created_at timestamptz not null default timezone('utc', now()),
  constraint tenant_customer_order_items_qty_check check (quantity between 1 and 99),
  constraint tenant_customer_order_items_price_check check (unit_price_cents > 0),
  constraint tenant_customer_order_items_notes_len check (notes is null or char_length(notes) <= 200)
);

alter table public.tenant_customer_orders
  add constraint tenant_customer_orders_id_tenant_unique unique (id, tenant_id);

alter table public.tenant_customer_order_items
  add constraint tenant_customer_order_items_order_same_tenant
  foreign key (order_id, tenant_id)
  references public.tenant_customer_orders(id, tenant_id)
  on delete cascade;

alter table public.tenant_products
  add constraint tenant_products_id_tenant_unique unique (id, tenant_id);

alter table public.tenant_customer_order_items
  add constraint tenant_customer_order_items_product_same_tenant
  foreign key (product_id, tenant_id)
  references public.tenant_products(id, tenant_id)
  on delete restrict;

create index if not exists idx_tenant_customer_orders_tenant_status on public.tenant_customer_orders(tenant_id, status, created_at desc);
create index if not exists idx_tenant_customer_orders_table on public.tenant_customer_orders(table_id, created_at desc);
create index if not exists idx_tenant_customer_order_items_order on public.tenant_customer_order_items(order_id);

create trigger set_tenant_customer_orders_updated_at
before update on public.tenant_customer_orders
for each row execute function public.set_updated_at();

alter table public.tenant_customer_orders enable row level security;
alter table public.tenant_customer_orders force row level security;
alter table public.tenant_customer_order_items enable row level security;
alter table public.tenant_customer_order_items force row level security;

create policy tenant_customer_orders_select_own_tenant
on public.tenant_customer_orders
for select
to authenticated
using (public.current_user_has_tenant_access(tenant_id));

create policy tenant_customer_order_items_select_own_tenant
on public.tenant_customer_order_items
for select
to authenticated
using (public.current_user_has_tenant_access(tenant_id));

create or replace function public.create_public_order_by_qr(
  menu_slug text,
  menu_qr_token uuid,
  customer_name_input text,
  customer_note_input text,
  order_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tenant_record record;
  new_order_id uuid;
  generated_code text;
  item jsonb;
  item_product record;
  item_quantity integer;
  item_notes text;
  computed_total integer := 0;
  inserted_count integer := 0;
begin
  if order_items is null or jsonb_typeof(order_items) <> 'array' or jsonb_array_length(order_items) = 0 then
    raise exception 'Selecione pelo menos um produto.' using errcode = '22023';
  end if;

  select t.id as tenant_id, tb.id as table_id, tb.number as table_number
  into tenant_record
  from public.tenants t
  join public.tenant_tables tb on tb.tenant_id = t.id
  where t.public_slug = menu_slug
    and t.status in ('active', 'trialing')
    and tb.qr_token = menu_qr_token
    and tb.is_active = true;

  if tenant_record is null then
    raise exception 'Cardápio indisponível.' using errcode = '22023';
  end if;

  generated_code := to_char(timezone('utc', now()), 'HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  insert into public.tenant_customer_orders (
    tenant_id,
    table_id,
    public_order_code,
    customer_name,
    customer_note,
    status,
    total_cents
  ) values (
    tenant_record.tenant_id,
    tenant_record.table_id,
    generated_code,
    nullif(trim(customer_name_input), ''),
    nullif(left(trim(coalesce(customer_note_input, '')), 300), ''),
    'received',
    0
  ) returning id into new_order_id;

  for item in select * from jsonb_array_elements(order_items) loop
    item_quantity := nullif(item->>'quantity', '')::integer;
    if item_quantity is null or item_quantity < 1 or item_quantity > 99 then
      raise exception 'Quantidade inválida.' using errcode = '22023';
    end if;

    select id, name, price_cents
    into item_product
    from public.tenant_products
    where id = (item->>'product_id')::uuid
      and tenant_id = tenant_record.tenant_id
      and is_available = true;

    if item_product is null then
      raise exception 'Produto indisponível.' using errcode = '22023';
    end if;

    item_notes := nullif(left(trim(coalesce(item->>'notes', '')), 200), '');

    insert into public.tenant_customer_order_items (
      tenant_id,
      order_id,
      product_id,
      product_name,
      unit_price_cents,
      quantity,
      notes
    ) values (
      tenant_record.tenant_id,
      new_order_id,
      item_product.id,
      item_product.name,
      item_product.price_cents,
      item_quantity,
      item_notes
    );

    computed_total := computed_total + (item_product.price_cents * item_quantity);
    inserted_count := inserted_count + 1;
  end loop;

  if inserted_count = 0 then
    raise exception 'Selecione pelo menos um produto.' using errcode = '22023';
  end if;

  update public.tenant_customer_orders
  set total_cents = computed_total
  where id = new_order_id;

  return jsonb_build_object(
    'public_order_code', generated_code,
    'table_number', tenant_record.table_number,
    'status', 'received',
    'total_cents', computed_total
  );
end;
$$;

revoke all on function public.create_public_order_by_qr(text, uuid, text, text, jsonb) from public;
grant execute on function public.create_public_order_by_qr(text, uuid, text, text, jsonb) to anon, authenticated;
-- MesaFácil — Public order privacy hardening
-- Removes internal UUIDs from the public menu/order flow and uses product public_code.

alter table public.tenant_products
  add column if not exists public_code text;

update public.tenant_products
set public_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
where public_code is null;

alter table public.tenant_products
  alter column public_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

alter table public.tenant_products
  alter column public_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenant_products_public_code_unique'
      and conrelid = 'public.tenant_products'::regclass
  ) then
    alter table public.tenant_products
      add constraint tenant_products_public_code_unique unique (tenant_id, public_code);
  end if;
end $$;

create or replace function public.get_public_menu_by_qr(menu_slug text, menu_qr_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'tenant', jsonb_build_object(
      'name', t.name,
      'public_slug', t.public_slug
    ),
    'table', jsonb_build_object(
      'number', tb.number,
      'seats', tb.seats,
      'sector', tb.sector
    ),
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'name', c.name,
          'description', c.description,
          'products', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'public_code', p.public_code,
                'name', p.name,
                'description', p.description,
                'price_cents', p.price_cents,
                'image_url', p.image_url,
                'is_available', p.is_available
              )
              order by p.name
            )
            from public.tenant_products p
            where p.tenant_id = t.id
              and p.category_id = c.id
              and p.is_available = true
          ), '[]'::jsonb)
        )
        order by c.display_order, c.name
      )
      from public.tenant_product_categories c
      where c.tenant_id = t.id
        and c.is_active = true
    ), '[]'::jsonb)
  ) into result
  from public.tenants t
  join public.tenant_tables tb on tb.tenant_id = t.id
  where t.public_slug = menu_slug
    and t.status in ('active', 'trialing')
    and tb.qr_token = menu_qr_token
    and tb.is_active = true;

  return result;
end;
$$;

create or replace function public.create_public_order_by_qr(
  menu_slug text,
  menu_qr_token uuid,
  customer_name_input text,
  customer_note_input text,
  order_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tenant_record record;
  new_order_id uuid;
  generated_code text;
  item jsonb;
  item_product record;
  item_quantity integer;
  item_notes text;
  item_public_code text;
  computed_total integer := 0;
  inserted_count integer := 0;
begin
  if order_items is null or jsonb_typeof(order_items) <> 'array' or jsonb_array_length(order_items) = 0 then
    raise exception 'Selecione pelo menos um produto.' using errcode = '22023';
  end if;

  select t.id as tenant_id, tb.id as table_id, tb.number as table_number
  into tenant_record
  from public.tenants t
  join public.tenant_tables tb on tb.tenant_id = t.id
  where t.public_slug = menu_slug
    and t.status in ('active', 'trialing')
    and tb.qr_token = menu_qr_token
    and tb.is_active = true;

  if tenant_record is null then
    raise exception 'Cardápio indisponível.' using errcode = '22023';
  end if;

  generated_code := to_char(timezone('utc', now()), 'HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  insert into public.tenant_customer_orders (
    tenant_id,
    table_id,
    public_order_code,
    customer_name,
    customer_note,
    status,
    total_cents
  ) values (
    tenant_record.tenant_id,
    tenant_record.table_id,
    generated_code,
    nullif(trim(customer_name_input), ''),
    nullif(left(trim(coalesce(customer_note_input, '')), 300), ''),
    'received',
    0
  ) returning id into new_order_id;

  for item in select * from jsonb_array_elements(order_items) loop
    item_public_code := nullif(trim(coalesce(item->>'product_code', '')), '');
    if item_public_code is null or item_public_code !~ '^[A-Z0-9]{8,32}$' then
      raise exception 'Produto indisponível.' using errcode = '22023';
    end if;

    if (item->>'quantity') !~ '^[0-9]{1,2}$' then
      raise exception 'Quantidade inválida.' using errcode = '22023';
    end if;
    item_quantity := (item->>'quantity')::integer;
    if item_quantity < 1 or item_quantity > 99 then
      raise exception 'Quantidade inválida.' using errcode = '22023';
    end if;

    select id, name, price_cents
    into item_product
    from public.tenant_products
    where public_code = item_public_code
      and tenant_id = tenant_record.tenant_id
      and is_available = true;

    if item_product is null then
      raise exception 'Produto indisponível.' using errcode = '22023';
    end if;

    item_notes := nullif(left(trim(coalesce(item->>'notes', '')), 200), '');

    insert into public.tenant_customer_order_items (
      tenant_id,
      order_id,
      product_id,
      product_name,
      unit_price_cents,
      quantity,
      notes
    ) values (
      tenant_record.tenant_id,
      new_order_id,
      item_product.id,
      item_product.name,
      item_product.price_cents,
      item_quantity,
      item_notes
    );

    computed_total := computed_total + (item_product.price_cents * item_quantity);
    inserted_count := inserted_count + 1;
  end loop;

  if inserted_count = 0 then
    raise exception 'Selecione pelo menos um produto.' using errcode = '22023';
  end if;

  update public.tenant_customer_orders
  set total_cents = computed_total
  where id = new_order_id;

  return jsonb_build_object(
    'public_order_code', generated_code,
    'table_number', tenant_record.table_number,
    'status', 'received',
    'total_cents', computed_total
  );
end;
$$;

revoke all on function public.get_public_menu_by_qr(text, uuid) from public;
grant execute on function public.get_public_menu_by_qr(text, uuid) to anon, authenticated;
revoke all on function public.create_public_order_by_qr(text, uuid, text, text, jsonb) from public;
grant execute on function public.create_public_order_by_qr(text, uuid, text, text, jsonb) to anon, authenticated;


-- MesaFácil — Operational order status flow
-- Protects status changes through a narrow RPC instead of free table updates.

revoke update on public.tenant_customer_orders from anon, authenticated;

drop policy if exists tenant_customer_orders_update_owner_admin_manager_ops
on public.tenant_customer_orders;

create or replace function public.advance_tenant_customer_order_status(
  target_tenant_id uuid,
  target_order_id uuid,
  requested_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  order_record record;
  next_status text;
begin
  if not public.current_user_has_tenant_role(
    target_tenant_id,
    array['owner','admin','manager','waiter','attendant','kitchen']::public.tenant_role[]
  ) then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select id, tenant_id, public_order_code, status, total_cents
  into order_record
  from public.tenant_customer_orders
  where id = target_order_id
    and tenant_id = target_tenant_id
  for update;

  if order_record is null then
    raise exception 'Pedido não encontrado.' using errcode = '22023';
  end if;

  if requested_status = 'cancelled' then
    if order_record.status in ('delivered', 'cancelled') then
      raise exception 'Pedido finalizado não pode ser cancelado.' using errcode = '22023';
    end if;
    next_status := 'cancelled';
  else
    next_status := case order_record.status
      when 'received' then 'confirmed'
      when 'confirmed' then 'preparing'
      when 'preparing' then 'ready'
      when 'ready' then 'delivered'
      else order_record.status
    end;
  end if;

  if next_status = order_record.status then
    raise exception 'Pedido já está em status final.' using errcode = '22023';
  end if;

  update public.tenant_customer_orders
  set status = next_status,
      updated_at = timezone('utc', now())
  where id = target_order_id
    and tenant_id = target_tenant_id;

  return jsonb_build_object(
    'public_order_code', order_record.public_order_code,
    'status', next_status,
    'total_cents', order_record.total_cents
  );
end;
$$;

revoke all on function public.advance_tenant_customer_order_status(uuid, uuid, text) from public;
grant execute on function public.advance_tenant_customer_order_status(uuid, uuid, text) to authenticated;
