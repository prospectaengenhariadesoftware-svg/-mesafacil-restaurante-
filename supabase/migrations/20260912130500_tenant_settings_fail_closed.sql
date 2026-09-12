-- MesaFácil — fail-closed tenant settings for public QR flows.

insert into public.tenant_settings (tenant_id, accepts_qr_orders, operating_status, service_fee_basis_points)
select t.id, false, 'closed', 0
from public.tenants t
where not exists (
  select 1 from public.tenant_settings s where s.tenant_id = t.id
);

create or replace function public.create_default_tenant_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.tenant_settings (tenant_id, accepts_qr_orders, operating_status, service_fee_basis_points)
  values (new.id, false, 'closed', 0)
  on conflict (tenant_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_default_tenant_settings_after_insert on public.tenants;
create trigger create_default_tenant_settings_after_insert
after insert on public.tenants
for each row execute function public.create_default_tenant_settings();

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
      'public_slug', t.public_slug,
      'public_description', s.public_description,
      'operating_status', s.operating_status,
      'accepts_qr_orders', s.accepts_qr_orders,
      'public_notice', s.public_notice,
      'service_fee_basis_points', s.service_fee_basis_points,
      'estimated_prep_minutes', s.estimated_prep_minutes
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
  join public.tenant_settings s on s.tenant_id = t.id
  where t.public_slug = menu_slug
    and t.status in ('active', 'trialing')
    and s.accepts_qr_orders = true
    and s.operating_status = 'open'
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
  join public.tenant_settings s on s.tenant_id = t.id
  where t.public_slug = menu_slug
    and t.status in ('active', 'trialing')
    and s.accepts_qr_orders = true
    and s.operating_status = 'open'
    and tb.qr_token = menu_qr_token
    and tb.is_active = true;

  if tenant_record is null then
    raise exception 'Cardápio indisponível.' using errcode = '22023';
  end if;

  generated_code := to_char(timezone('utc', now()), 'HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  insert into public.tenant_customer_orders (
    tenant_id, table_id, public_order_code, customer_name, customer_note, status, total_cents
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
      tenant_id, order_id, product_id, product_name, unit_price_cents, quantity, notes
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

revoke all on function public.create_default_tenant_settings() from public;
revoke all on function public.get_public_menu_by_qr(text, uuid) from public;
grant execute on function public.get_public_menu_by_qr(text, uuid) to anon, authenticated;
revoke all on function public.create_public_order_by_qr(text, uuid, text, text, jsonb) from public;
grant execute on function public.create_public_order_by_qr(text, uuid, text, text, jsonb) to anon, authenticated;
