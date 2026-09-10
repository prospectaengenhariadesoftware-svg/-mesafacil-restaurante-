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

create policy tenant_customer_orders_update_owner_admin_manager_ops
on public.tenant_customer_orders
for update
to authenticated
using (public.current_user_has_tenant_role(tenant_id, array['owner','admin','manager','waiter','attendant','kitchen']::public.tenant_role[]))
with check (public.current_user_has_tenant_role(tenant_id, array['owner','admin','manager','waiter','attendant','kitchen']::public.tenant_role[]));

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
