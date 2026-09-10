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
