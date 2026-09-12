-- MesaFácil — public menu/order product add-ons.

alter table public.tenant_product_addons
  add column if not exists public_code text;

update public.tenant_product_addons
set public_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
where public_code is null;

alter table public.tenant_product_addons
  alter column public_code set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenant_product_addons_public_code_format'
      and conrelid = 'public.tenant_product_addons'::regclass
  ) then
    alter table public.tenant_product_addons
      add constraint tenant_product_addons_public_code_format check (public_code ~ '^[A-Z0-9]{8,32}$');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenant_product_addons_public_code_unique'
      and conrelid = 'public.tenant_product_addons'::regclass
  ) then
    alter table public.tenant_product_addons
      add constraint tenant_product_addons_public_code_unique unique (tenant_id, public_code);
  end if;
end $$;

create index if not exists idx_tenant_product_addons_public_code
  on public.tenant_product_addons(tenant_id, product_id, public_code)
  where is_available = true;

create or replace function public.ensure_tenant_product_addon_public_code()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.public_code is null or trim(new.public_code) = '' then
    new.public_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  else
    new.public_code := upper(trim(new.public_code));
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_tenant_product_addon_public_code_before_insert on public.tenant_product_addons;
create trigger ensure_tenant_product_addon_public_code_before_insert
before insert on public.tenant_product_addons
for each row execute function public.ensure_tenant_product_addon_public_code();

alter table public.tenant_customer_order_items
  add column if not exists addons_total_cents integer not null default 0,
  add column if not exists selected_addons jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenant_customer_order_items_addons_total_nonnegative'
      and conrelid = 'public.tenant_customer_order_items'::regclass
  ) then
    alter table public.tenant_customer_order_items
      add constraint tenant_customer_order_items_addons_total_nonnegative check (addons_total_cents >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenant_customer_order_items_selected_addons_array'
      and conrelid = 'public.tenant_customer_order_items'::regclass
  ) then
    alter table public.tenant_customer_order_items
      add constraint tenant_customer_order_items_selected_addons_array check (jsonb_typeof(selected_addons) = 'array');
  end if;
end $$;

alter table public.tenant_customer_order_items
  drop column if exists line_total_cents;

alter table public.tenant_customer_order_items
  add column line_total_cents integer generated always as ((unit_price_cents + addons_total_cents) * quantity) stored;

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
                'is_available', p.is_available,
                'addons', coalesce((
                  select jsonb_agg(
                    jsonb_build_object(
                      'public_code', a.public_code,
                      'name', a.name,
                      'description', a.description,
                      'price_delta_cents', a.price_delta_cents,
                      'is_available', a.is_available
                    )
                    order by a.display_order, a.name
                  )
                  from public.tenant_product_addons a
                  where a.tenant_id = t.id
                    and a.product_id = p.id
                    and a.is_available = true
                ), '[]'::jsonb)
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
  addon_code text;
  addon_record record;
  addon_codes text[];
  selected_addons jsonb;
  item_addons_total integer;
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

    selected_addons := '[]'::jsonb;
    item_addons_total := 0;

    if item ? 'addon_codes' then
      if jsonb_typeof(item->'addon_codes') <> 'array' or jsonb_array_length(item->'addon_codes') > 20 then
        raise exception 'Adicionais inválidos.' using errcode = '22023';
      end if;

      select coalesce(array_agg(distinct upper(trim(value))), ARRAY[]::text[])
      into addon_codes
      from jsonb_array_elements_text(item->'addon_codes') as codes(value)
      where upper(trim(value)) ~ '^[A-Z0-9]{8,32}$';

      if coalesce(array_length(addon_codes, 1), 0) <> jsonb_array_length(item->'addon_codes') then
        raise exception 'Adicionais inválidos.' using errcode = '22023';
      end if;

      foreach addon_code in array addon_codes loop
        select public_code, name, price_delta_cents
        into addon_record
        from public.tenant_product_addons
        where tenant_id = tenant_record.tenant_id
          and product_id = item_product.id
          and public_code = addon_code
          and is_available = true;

        if addon_record is null then
          raise exception 'Adicional indisponível.' using errcode = '22023';
        end if;

        selected_addons := selected_addons || jsonb_build_array(jsonb_build_object(
          'public_code', addon_record.public_code,
          'name', addon_record.name,
          'price_delta_cents', addon_record.price_delta_cents
        ));
        item_addons_total := item_addons_total + addon_record.price_delta_cents;
      end loop;
    end if;

    item_notes := nullif(left(trim(coalesce(item->>'notes', '')), 200), '');

    insert into public.tenant_customer_order_items (
      tenant_id, order_id, product_id, product_name, unit_price_cents, addons_total_cents, selected_addons, quantity, notes
    ) values (
      tenant_record.tenant_id,
      new_order_id,
      item_product.id,
      item_product.name,
      item_product.price_cents,
      item_addons_total,
      selected_addons,
      item_quantity,
      item_notes
    );

    computed_total := computed_total + ((item_product.price_cents + item_addons_total) * item_quantity);
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
