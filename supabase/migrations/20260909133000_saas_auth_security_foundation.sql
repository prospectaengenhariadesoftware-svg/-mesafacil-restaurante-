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
