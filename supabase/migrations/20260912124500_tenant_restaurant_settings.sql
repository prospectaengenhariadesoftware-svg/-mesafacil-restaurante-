-- MesaFácil — tenant restaurant settings and audited update RPC.

create table if not exists public.tenant_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  public_description text,
  address_line text,
  city text,
  state text,
  accepts_qr_orders boolean not null default true,
  service_fee_basis_points integer not null default 0,
  estimated_prep_minutes integer,
  operating_status text not null default 'open',
  public_notice text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_settings_public_description_len check (public_description is null or char_length(public_description) <= 280),
  constraint tenant_settings_address_line_len check (address_line is null or char_length(address_line) <= 180),
  constraint tenant_settings_city_len check (city is null or char_length(city) <= 80),
  constraint tenant_settings_state_format check (state is null or state ~ '^[A-Z]{2}$'),
  constraint tenant_settings_service_fee_valid check (service_fee_basis_points between 0 and 10000),
  constraint tenant_settings_estimated_prep_valid check (estimated_prep_minutes is null or estimated_prep_minutes between 1 and 240),
  constraint tenant_settings_operating_status_valid check (operating_status in ('open', 'closed', 'paused')),
  constraint tenant_settings_public_notice_len check (public_notice is null or char_length(public_notice) <= 220)
);

create index if not exists idx_tenant_settings_tenant_id on public.tenant_settings(tenant_id);
create index if not exists idx_tenant_settings_operating_status on public.tenant_settings(tenant_id, operating_status);

alter table public.tenants
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.tenants
  add constraint tenants_name_len_max check (char_length(trim(name)) between 3 and 120) not valid;
alter table public.tenants validate constraint tenants_name_len_max;

alter table public.tenant_settings enable row level security;
alter table public.tenant_settings force row level security;

drop policy if exists "tenant_settings_select_own_tenant" on public.tenant_settings;
create policy "tenant_settings_select_own_tenant"
on public.tenant_settings
for select
to authenticated
using (public.current_user_has_tenant_access(tenant_id));

drop policy if exists "tenant_settings_insert_owner_admin" on public.tenant_settings;
create policy "tenant_settings_insert_owner_admin"
on public.tenant_settings
for insert
to authenticated
with check (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role[]));

drop policy if exists "tenant_settings_update_owner_admin" on public.tenant_settings;
create policy "tenant_settings_update_owner_admin"
on public.tenant_settings
for update
to authenticated
using (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role[]))
with check (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role[]));

drop policy if exists "tenant_settings_delete_owner" on public.tenant_settings;
create policy "tenant_settings_delete_owner"
on public.tenant_settings
for delete
to authenticated
using (public.current_user_has_tenant_role(tenant_id, ARRAY['owner']::public.tenant_role[]));

drop trigger if exists set_tenant_settings_updated_at on public.tenant_settings;
create trigger set_tenant_settings_updated_at before update on public.tenant_settings
for each row execute function public.set_updated_at();

create or replace function public.audit_tenant_settings_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
  values (
    coalesce(new.tenant_id, old.tenant_id),
    auth.uid(),
    case
      when tg_op = 'INSERT' then 'CREATE_TENANT_SETTINGS'
      when tg_op = 'UPDATE' then 'UPDATE_TENANT_SETTINGS'
      when tg_op = 'DELETE' then 'DELETE_TENANT_SETTINGS'
    end,
    'tenant_settings',
    coalesce(new.id, old.id),
    jsonb_build_object('operation', tg_op)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists tenant_settings_audit_changes on public.tenant_settings;
create trigger tenant_settings_audit_changes
after insert or update or delete on public.tenant_settings
for each row execute function public.audit_tenant_settings_changes();

create or replace function public.audit_tenant_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
  values (
    new.id,
    auth.uid(),
    'UPDATE_TENANT_PROFILE',
    'tenant',
    new.id,
    jsonb_build_object(
      'old_public_slug', old.public_slug,
      'new_public_slug', new.public_slug,
      'old_status', old.status,
      'new_status', new.status
    )
  );
  return new;
end;
$$;

drop trigger if exists tenants_profile_audit_changes on public.tenants;
create trigger tenants_profile_audit_changes
after update of name, legal_name, document, email, phone, public_slug, status on public.tenants
for each row execute function public.audit_tenant_profile_changes();

create or replace function public.update_tenant_configuration(
  config_tenant_id uuid,
  config_name text,
  config_legal_name text,
  config_document text,
  config_email text,
  config_phone text,
  config_public_slug text,
  config_public_description text,
  config_address_line text,
  config_city text,
  config_state text,
  config_accepts_qr_orders boolean,
  config_service_fee_basis_points integer,
  config_estimated_prep_minutes integer,
  config_operating_status text,
  config_public_notice text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_slug text;
  settings_id uuid;
begin
  if auth.uid() is null then
    raise exception 'ACESSO NEGADO: usuário não autenticado' using errcode = '42501';
  end if;

  if not public.current_user_has_tenant_role(config_tenant_id, ARRAY['owner','admin']::public.tenant_role[]) then
    raise exception 'ACESSO NEGADO: apenas owner/admin podem editar configurações.' using errcode = '42501';
  end if;

  if char_length(trim(config_name)) < 3 or char_length(trim(config_name)) > 120 then
    raise exception 'Nome do restaurante inválido' using errcode = '23514';
  end if;

  normalized_slug := public.slugify_public(config_public_slug);
  if char_length(normalized_slug) < 3 or char_length(normalized_slug) > 80 or normalized_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Slug público inválido' using errcode = '23514';
  end if;

  update public.tenants
  set name = trim(config_name),
      legal_name = nullif(trim(coalesce(config_legal_name, '')), ''),
      document = nullif(trim(coalesce(config_document, '')), ''),
      email = nullif(lower(trim(coalesce(config_email, ''))), ''),
      phone = nullif(trim(coalesce(config_phone, '')), ''),
      public_slug = normalized_slug,
      updated_by = auth.uid()
  where id = config_tenant_id
  returning id into config_tenant_id;

  if config_tenant_id is null then
    raise exception 'Restaurante não encontrado ou sem permissão.' using errcode = '42501';
  end if;

  insert into public.tenant_settings (
    tenant_id,
    public_description,
    address_line,
    city,
    state,
    accepts_qr_orders,
    service_fee_basis_points,
    estimated_prep_minutes,
    operating_status,
    public_notice,
    created_by,
    updated_by
  ) values (
    config_tenant_id,
    nullif(trim(coalesce(config_public_description, '')), ''),
    nullif(trim(coalesce(config_address_line, '')), ''),
    nullif(trim(coalesce(config_city, '')), ''),
    nullif(upper(trim(coalesce(config_state, ''))), ''),
    config_accepts_qr_orders,
    config_service_fee_basis_points,
    config_estimated_prep_minutes,
    config_operating_status,
    nullif(trim(coalesce(config_public_notice, '')), ''),
    auth.uid(),
    auth.uid()
  )
  on conflict (tenant_id) do update
    set public_description = excluded.public_description,
        address_line = excluded.address_line,
        city = excluded.city,
        state = excluded.state,
        accepts_qr_orders = excluded.accepts_qr_orders,
        service_fee_basis_points = excluded.service_fee_basis_points,
        estimated_prep_minutes = excluded.estimated_prep_minutes,
        operating_status = excluded.operating_status,
        public_notice = excluded.public_notice,
        updated_by = auth.uid(),
        updated_at = timezone('utc', now())
  returning id into settings_id;

  return settings_id;
end;
$$;

revoke all on function public.update_tenant_configuration(uuid, text, text, text, text, text, text, text, text, text, text, boolean, integer, integer, text, text) from public;
grant execute on function public.update_tenant_configuration(uuid, text, text, text, text, text, text, text, text, text, text, boolean, integer, integer, text, text) to authenticated;
