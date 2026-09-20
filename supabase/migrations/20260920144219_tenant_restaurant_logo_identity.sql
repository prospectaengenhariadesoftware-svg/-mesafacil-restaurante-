-- MesaFácil — tenant restaurant logo identity assets.

alter table public.tenant_settings
  add column if not exists logo_path text;

alter table public.tenant_settings
  drop constraint if exists tenant_settings_logo_path_format;
alter table public.tenant_settings
  add constraint tenant_settings_logo_path_format check (
    logo_path is null
    or (
      char_length(logo_path) <= 240
      and logo_path !~ '(\.\.|\\)'
      and logo_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/identity/[^/]+\.(png|jpe?g|webp)$'
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-brand-assets',
  'tenant-brand-assets',
  true,
  1048576,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tenant_brand_assets_public_read" on storage.objects;
create policy "tenant_brand_assets_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'tenant-brand-assets');

drop policy if exists "tenant_brand_assets_insert_owner_admin" on storage.objects;
create policy "tenant_brand_assets_insert_owner_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'tenant-brand-assets'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] = 'identity'
  and storage.filename(name) ~* '^[^/]+\.(png|jpe?g|webp)$'
  and storage.filename(name) !~ '(\.\.|\\)'
  and exists (
    select 1
    from public.tenant_users tu
    where tu.tenant_id = ((storage.foldername(name))[1])::uuid
      and tu.user_id = auth.uid()
      and tu.status = 'active'
      and tu.role = any(ARRAY['owner','admin']::public.tenant_role[])
  )
);

drop policy if exists "tenant_brand_assets_update_owner_admin" on storage.objects;
create policy "tenant_brand_assets_update_owner_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'tenant-brand-assets'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] = 'identity'
  and storage.filename(name) ~* '^[^/]+\.(png|jpe?g|webp)$'
  and storage.filename(name) !~ '(\.\.|\\)'
  and exists (
    select 1
    from public.tenant_users tu
    where tu.tenant_id = ((storage.foldername(name))[1])::uuid
      and tu.user_id = auth.uid()
      and tu.status = 'active'
      and tu.role = any(ARRAY['owner','admin']::public.tenant_role[])
  )
)
with check (
  bucket_id = 'tenant-brand-assets'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] = 'identity'
  and storage.filename(name) ~* '^[^/]+\.(png|jpe?g|webp)$'
  and storage.filename(name) !~ '(\.\.|\\)'
  and exists (
    select 1
    from public.tenant_users tu
    where tu.tenant_id = ((storage.foldername(name))[1])::uuid
      and tu.user_id = auth.uid()
      and tu.status = 'active'
      and tu.role = any(ARRAY['owner','admin']::public.tenant_role[])
  )
);

drop policy if exists "tenant_brand_assets_delete_owner_admin" on storage.objects;
create policy "tenant_brand_assets_delete_owner_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'tenant-brand-assets'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] = 'identity'
  and storage.filename(name) ~* '^[^/]+\.(png|jpe?g|webp)$'
  and storage.filename(name) !~ '(\.\.|\\)'
  and exists (
    select 1
    from public.tenant_users tu
    where tu.tenant_id = ((storage.foldername(name))[1])::uuid
      and tu.user_id = auth.uid()
      and tu.status = 'active'
      and tu.role = any(ARRAY['owner','admin']::public.tenant_role[])
  )
);

-- Replace the old 16-argument settings RPC with the logo-aware contract.
drop function if exists public.update_tenant_configuration(uuid, text, text, text, text, text, text, text, text, text, text, boolean, integer, integer, text, text);

create or replace function public.update_tenant_configuration(
  config_tenant_id uuid,
  config_name text,
  config_legal_name text,
  config_document text,
  config_email text,
  config_phone text,
  config_public_slug text,
  config_logo_path text,
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
  normalized_email text;
  normalized_state text;
  normalized_logo_path text;
begin
  if auth.uid() is null then
    raise exception 'ACESSO NEGADO: usuário não autenticado' using errcode = '42501';
  end if;

  if not public.current_user_has_tenant_role(config_tenant_id, ARRAY['owner','admin']::public.tenant_role[]) then
    raise exception 'ACESSO NEGADO: apenas owner/admin podem editar configurações.' using errcode = '42501';
  end if;

  if char_length(trim(coalesce(config_name, ''))) < 3 or char_length(trim(coalesce(config_name, ''))) > 120 then
    raise exception 'Nome do restaurante inválido' using errcode = '23514';
  end if;

  if config_legal_name is not null and char_length(trim(config_legal_name)) > 160 then
    raise exception 'Razão social inválida' using errcode = '23514';
  end if;
  if config_document is not null and char_length(trim(config_document)) > 32 then
    raise exception 'Documento inválido' using errcode = '23514';
  end if;
  if config_phone is not null and char_length(trim(config_phone)) > 32 then
    raise exception 'Telefone inválido' using errcode = '23514';
  end if;

  normalized_email := nullif(lower(trim(coalesce(config_email, ''))), '');
  if normalized_email is not null and normalized_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'E-mail inválido' using errcode = '23514';
  end if;

  normalized_slug := public.slugify_public(config_public_slug);
  if char_length(normalized_slug) < 3 or char_length(normalized_slug) > 80 or normalized_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Slug público inválido' using errcode = '23514';
  end if;

  normalized_logo_path := nullif(trim(coalesce(config_logo_path, '')), '');
  if normalized_logo_path is not null then
    if char_length(normalized_logo_path) > 240
      or normalized_logo_path !~* ('^' || config_tenant_id::text || '/identity/[^/]+\.(png|jpe?g|webp)$')
      or normalized_logo_path ~ '(\.\.|\\)'
      or not exists (
        select 1
        from storage.objects so
        where so.bucket_id = 'tenant-brand-assets'
          and so.name = normalized_logo_path
      )
    then
      raise exception 'Logo do restaurante inválida' using errcode = '23514';
    end if;
  end if;

  normalized_state := nullif(upper(trim(coalesce(config_state, ''))), '');
  if normalized_state is not null and normalized_state !~ '^[A-Z]{2}$' then
    raise exception 'UF inválida' using errcode = '23514';
  end if;
  if config_public_description is not null and char_length(trim(config_public_description)) > 280 then
    raise exception 'Descrição pública inválida' using errcode = '23514';
  end if;
  if config_address_line is not null and char_length(trim(config_address_line)) > 180 then
    raise exception 'Endereço inválido' using errcode = '23514';
  end if;
  if config_city is not null and char_length(trim(config_city)) > 80 then
    raise exception 'Cidade inválida' using errcode = '23514';
  end if;
  if config_service_fee_basis_points is null or config_service_fee_basis_points < 0 or config_service_fee_basis_points > 10000 then
    raise exception 'Taxa de serviço inválida' using errcode = '23514';
  end if;
  if config_estimated_prep_minutes is not null and (config_estimated_prep_minutes < 1 or config_estimated_prep_minutes > 240) then
    raise exception 'Tempo estimado inválido' using errcode = '23514';
  end if;
  if config_operating_status not in ('open', 'closed', 'paused') then
    raise exception 'Status operacional inválido' using errcode = '23514';
  end if;
  if config_public_notice is not null and char_length(trim(config_public_notice)) > 220 then
    raise exception 'Mensagem pública inválida' using errcode = '23514';
  end if;

  update public.tenants
  set name = trim(config_name),
      legal_name = nullif(trim(coalesce(config_legal_name, '')), ''),
      document = nullif(trim(coalesce(config_document, '')), ''),
      email = normalized_email,
      phone = nullif(trim(coalesce(config_phone, '')), ''),
      public_slug = normalized_slug,
      updated_by = auth.uid()
  where id = config_tenant_id
  returning id into config_tenant_id;

  if config_tenant_id is null then
    raise exception 'Restaurante não encontrado ou sem permissão.' using errcode = '42501';
  end if;

  insert into public.tenant_settings (
    tenant_id, logo_path, public_description, address_line, city, state, accepts_qr_orders,
    service_fee_basis_points, estimated_prep_minutes, operating_status, public_notice, created_by, updated_by
  ) values (
    config_tenant_id,
    normalized_logo_path,
    nullif(trim(coalesce(config_public_description, '')), ''),
    nullif(trim(coalesce(config_address_line, '')), ''),
    nullif(trim(coalesce(config_city, '')), ''),
    normalized_state,
    config_accepts_qr_orders,
    config_service_fee_basis_points,
    config_estimated_prep_minutes,
    config_operating_status,
    nullif(trim(coalesce(config_public_notice, '')), ''),
    auth.uid(),
    auth.uid()
  )
  on conflict (tenant_id) do update
    set logo_path = excluded.logo_path,
        public_description = excluded.public_description,
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

revoke all on function public.update_tenant_configuration(uuid, text, text, text, text, text, text, text, text, text, text, text, boolean, integer, integer, text, text) from public;
grant execute on function public.update_tenant_configuration(uuid, text, text, text, text, text, text, text, text, text, text, text, boolean, integer, integer, text, text) to authenticated;
