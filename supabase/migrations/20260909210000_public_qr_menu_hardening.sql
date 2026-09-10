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
