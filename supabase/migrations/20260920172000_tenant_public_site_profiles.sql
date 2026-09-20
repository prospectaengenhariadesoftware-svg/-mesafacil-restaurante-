-- MesaFácil — tenant public site profiles and anonymous-safe public RPC.

create table if not exists public.tenant_public_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  display_name text not null,
  public_slug text not null,
  headline text,
  description text,
  phone text,
  whatsapp text,
  instagram text,
  address_line text,
  is_published boolean not null default false,
  show_menu boolean not null default true,
  accepts_reservations boolean not null default false,
  accepts_online_orders boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_public_profiles_display_name_len check (char_length(trim(display_name)) between 3 and 120),
  constraint tenant_public_profiles_public_slug_format check (public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint tenant_public_profiles_public_slug_len check (char_length(public_slug) between 3 and 80),
  constraint tenant_public_profiles_headline_len check (headline is null or char_length(headline) <= 140),
  constraint tenant_public_profiles_description_len check (description is null or char_length(description) <= 1000),
  constraint tenant_public_profiles_phone_len check (phone is null or char_length(phone) <= 40),
  constraint tenant_public_profiles_whatsapp_len check (whatsapp is null or char_length(whatsapp) <= 120),
  constraint tenant_public_profiles_instagram_len check (instagram is null or char_length(instagram) <= 120),
  constraint tenant_public_profiles_address_line_len check (address_line is null or char_length(address_line) <= 180)
);

create unique index if not exists tenant_public_profiles_public_slug_unique_idx on public.tenant_public_profiles(public_slug);
create index if not exists idx_tenant_public_profiles_tenant on public.tenant_public_profiles(tenant_id, is_published);

alter table public.tenant_public_profiles enable row level security;
alter table public.tenant_public_profiles force row level security;

drop policy if exists "tenant_public_profiles_select_own_tenant" on public.tenant_public_profiles;
create policy "tenant_public_profiles_select_own_tenant"
on public.tenant_public_profiles
for select
to authenticated
using (public.current_user_has_tenant_access(tenant_id));

drop trigger if exists set_tenant_public_profiles_updated_at on public.tenant_public_profiles;
create trigger set_tenant_public_profiles_updated_at before update on public.tenant_public_profiles
for each row execute function public.set_updated_at();

create or replace function public.audit_tenant_public_profile_changes()
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
      when tg_op = 'INSERT' then 'CREATE_TENANT_PUBLIC_PROFILE'
      when tg_op = 'UPDATE' then 'UPDATE_TENANT_PUBLIC_PROFILE'
      when tg_op = 'DELETE' then 'DELETE_TENANT_PUBLIC_PROFILE'
    end,
    'tenant_public_profile',
    coalesce(new.id, old.id),
    jsonb_build_object('operation', tg_op, 'is_published', coalesce(new.is_published, old.is_published))
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists tenant_public_profiles_audit_changes on public.tenant_public_profiles;
create trigger tenant_public_profiles_audit_changes
after insert or update or delete on public.tenant_public_profiles
for each row execute function public.audit_tenant_public_profile_changes();

create or replace function public.update_tenant_public_site(
  site_tenant_id uuid,
  site_display_name text,
  site_public_slug text,
  site_headline text,
  site_description text,
  site_phone text,
  site_whatsapp text,
  site_instagram text,
  site_address_line text,
  site_is_published boolean,
  site_show_menu boolean,
  site_accepts_reservations boolean,
  site_accepts_online_orders boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_slug text;
  profile_id uuid;
begin
  if auth.uid() is null then
    raise exception 'ACESSO NEGADO: usuário não autenticado' using errcode = '42501';
  end if;

  if not public.current_user_has_tenant_role(site_tenant_id, ARRAY['owner','admin']::public.tenant_role[]) then
    raise exception 'ACESSO NEGADO: apenas owner/admin podem editar o site público.' using errcode = '42501';
  end if;

  if char_length(trim(coalesce(site_display_name, ''))) < 3 or char_length(trim(coalesce(site_display_name, ''))) > 120 then
    raise exception 'Nome público inválido' using errcode = '23514';
  end if;

  normalized_slug := public.slugify_public(coalesce(site_public_slug, site_display_name));
  if char_length(normalized_slug) < 3 or char_length(normalized_slug) > 80 or normalized_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Slug público inválido' using errcode = '23514';
  end if;

  if site_headline is not null and char_length(trim(site_headline)) > 140 then
    raise exception 'Chamada principal inválida' using errcode = '23514';
  end if;
  if site_description is not null and char_length(trim(site_description)) > 1000 then
    raise exception 'Descrição do site inválida' using errcode = '23514';
  end if;
  if site_phone is not null and char_length(trim(site_phone)) > 40 then
    raise exception 'Telefone inválido' using errcode = '23514';
  end if;
  if site_whatsapp is not null and char_length(trim(site_whatsapp)) > 120 then
    raise exception 'WhatsApp inválido' using errcode = '23514';
  end if;
  if site_instagram is not null and char_length(trim(site_instagram)) > 120 then
    raise exception 'Instagram inválido' using errcode = '23514';
  end if;
  if site_address_line is not null and char_length(trim(site_address_line)) > 180 then
    raise exception 'Endereço inválido' using errcode = '23514';
  end if;

  insert into public.tenant_public_profiles (
    tenant_id, display_name, public_slug, headline, description, phone, whatsapp, instagram, address_line,
    is_published, show_menu, accepts_reservations, accepts_online_orders, created_by, updated_by
  ) values (
    site_tenant_id,
    trim(site_display_name),
    normalized_slug,
    nullif(trim(coalesce(site_headline, '')), ''),
    nullif(trim(coalesce(site_description, '')), ''),
    nullif(trim(coalesce(site_phone, '')), ''),
    nullif(trim(coalesce(site_whatsapp, '')), ''),
    nullif(trim(coalesce(site_instagram, '')), ''),
    nullif(trim(coalesce(site_address_line, '')), ''),
    coalesce(site_is_published, false),
    coalesce(site_show_menu, true),
    coalesce(site_accepts_reservations, false),
    coalesce(site_accepts_online_orders, false),
    auth.uid(),
    auth.uid()
  )
  on conflict (tenant_id) do update
    set display_name = excluded.display_name,
        public_slug = excluded.public_slug,
        headline = excluded.headline,
        description = excluded.description,
        phone = excluded.phone,
        whatsapp = excluded.whatsapp,
        instagram = excluded.instagram,
        address_line = excluded.address_line,
        is_published = excluded.is_published,
        show_menu = excluded.show_menu,
        accepts_reservations = excluded.accepts_reservations,
        accepts_online_orders = excluded.accepts_online_orders,
        updated_by = auth.uid(),
        updated_at = timezone('utc', now())
  returning id into profile_id;

  return profile_id;
end;
$$;

revoke all on function public.update_tenant_public_site(uuid, text, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean) from public;
grant execute on function public.update_tenant_public_site(uuid, text, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean) to authenticated;

create or replace function public.get_public_site_by_slug(site_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'display_name', p.display_name,
      'public_slug', p.public_slug,
      'headline', p.headline,
      'description', p.description,
      'phone', p.phone,
      'whatsapp', p.whatsapp,
      'instagram', p.instagram,
      'address_line', p.address_line,
      'show_menu', p.show_menu,
      'accepts_reservations', p.accepts_reservations,
      'accepts_online_orders', p.accepts_online_orders
    ),
    'tenant', jsonb_build_object(
      'name', t.name,
      'public_slug', t.public_slug,
      'status', t.status
    ),
    'categories', case when p.show_menu then coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'name', c.name,
          'description', c.description,
          'products', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'public_code', pr.public_code,
                'name', pr.name,
                'description', pr.description,
                'price_cents', pr.price_cents,
                'image_url', pr.image_url,
                'is_available', pr.is_available
              )
              order by pr.name
            )
            from public.tenant_products pr
            where pr.tenant_id = t.id
              and pr.category_id = c.id
              and pr.is_available = true
          ), '[]'::jsonb)
        )
        order by c.display_order, c.name
      )
      from public.tenant_product_categories c
      where c.tenant_id = t.id
        and c.is_active = true
    ), '[]'::jsonb) else '[]'::jsonb end
  ) into result
  from public.tenant_public_profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.public_slug = public.slugify_public(site_slug)
    and p.is_published = true
    and t.status in ('active', 'trialing');

  return result;
end;
$$;

revoke all on function public.get_public_site_by_slug(text) from public;
grant execute on function public.get_public_site_by_slug(text) to anon, authenticated;
