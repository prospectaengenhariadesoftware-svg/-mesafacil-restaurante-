-- MesaFácil — Public order creation verification
-- Safe to run: transaction rolls back all test data.

begin;

set local role postgres;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('aaaaaaaa-1000-4000-8000-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'order-a@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('bbbbbbbb-1000-4000-8000-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'order-b@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (user_id, name, email, status)
values
  ('aaaaaaaa-1000-4000-8000-aaaaaaaaaaaa', 'Order A', 'order-a@mesafacil.test', 'active'),
  ('bbbbbbbb-1000-4000-8000-bbbbbbbbbbbb', 'Order B', 'order-b@mesafacil.test', 'active')
on conflict (user_id) do update set status = excluded.status;

insert into public.tenants (id, name, public_slug, status)
values
  ('aaaaaaaa-2000-4000-8000-aaaaaaaaaaaa', 'Tenant Order A', 'tenant-order-a-test', 'active'),
  ('bbbbbbbb-2000-4000-8000-bbbbbbbbbbbb', 'Tenant Order B', 'tenant-order-b-test', 'active')
on conflict (id) do update set public_slug = excluded.public_slug, status = excluded.status;

insert into public.tenant_users (tenant_id, user_id, role, status)
values
  ('aaaaaaaa-2000-4000-8000-aaaaaaaaaaaa', 'aaaaaaaa-1000-4000-8000-aaaaaaaaaaaa', 'owner', 'active'),
  ('bbbbbbbb-2000-4000-8000-bbbbbbbbbbbb', 'bbbbbbbb-1000-4000-8000-bbbbbbbbbbbb', 'owner', 'active')
on conflict (tenant_id, user_id) do update set role = excluded.role, status = excluded.status;

insert into public.tenant_tables (id, tenant_id, number, seats, sector, qr_token, is_active)
values ('aaaaaaaa-3000-4000-8000-aaaaaaaaaaaa', 'aaaaaaaa-2000-4000-8000-aaaaaaaaaaaa', '10', 4, 'Salão', 'aaaaaaaa-4000-4000-8000-aaaaaaaaaaaa', true)
on conflict (id) do update set qr_token = excluded.qr_token, is_active = excluded.is_active;

insert into public.tenant_product_categories (id, tenant_id, name, is_active)
values
  ('aaaaaaaa-5000-4000-8000-aaaaaaaaaaaa', 'aaaaaaaa-2000-4000-8000-aaaaaaaaaaaa', 'Lanches', true),
  ('bbbbbbbb-5000-4000-8000-bbbbbbbbbbbb', 'bbbbbbbb-2000-4000-8000-bbbbbbbbbbbb', 'Bebidas B', true)
on conflict (id) do update set is_active = excluded.is_active;

insert into public.tenant_products (id, tenant_id, category_id, public_code, name, description, price_cents, is_available)
values
  ('aaaaaaaa-6000-4000-8000-aaaaaaaaaaaa', 'aaaaaaaa-2000-4000-8000-aaaaaaaaaaaa', 'aaaaaaaa-5000-4000-8000-aaaaaaaaaaaa', 'PRODA0000001', 'X-Teste', 'Lanche teste', 2500, true),
  ('aaaaaaaa-6000-4000-8000-aaaaaaaaaaab', 'aaaaaaaa-2000-4000-8000-aaaaaaaaaaaa', 'aaaaaaaa-5000-4000-8000-aaaaaaaaaaaa', 'PRODA0000002', 'Outro produto A', 'Mesmo tenant', 3100, true),
  ('bbbbbbbb-6000-4000-8000-bbbbbbbbbbbb', 'bbbbbbbb-2000-4000-8000-bbbbbbbbbbbb', 'bbbbbbbb-5000-4000-8000-bbbbbbbbbbbb', 'PRODB0000001', 'Produto B', 'Outro tenant', 9900, true)
on conflict (id) do update set is_available = excluded.is_available;

insert into public.tenant_product_addons (id, tenant_id, product_id, public_code, name, price_delta_cents, is_available)
values
  ('aaaaaaaa-6100-4000-8000-aaaaaaaaaaaa', 'aaaaaaaa-2000-4000-8000-aaaaaaaaaaaa', 'aaaaaaaa-6000-4000-8000-aaaaaaaaaaaa', 'ADDONA000001', 'Bacon extra', 500, true),
  ('aaaaaaaa-6100-4000-8000-aaaaaaaaaaab', 'aaaaaaaa-2000-4000-8000-aaaaaaaaaaaa', 'aaaaaaaa-6000-4000-8000-aaaaaaaaaaaa', 'ADDONA000002', 'Queijo extra', 300, true),
  ('aaaaaaaa-6100-4000-8000-aaaaaaaaaaac', 'aaaaaaaa-2000-4000-8000-aaaaaaaaaaaa', 'aaaaaaaa-6000-4000-8000-aaaaaaaaaaaa', 'ADDONA000003', 'Indisponível', 700, false),
  ('aaaaaaaa-6100-4000-8000-aaaaaaaaaaad', 'aaaaaaaa-2000-4000-8000-aaaaaaaaaaaa', 'aaaaaaaa-6000-4000-8000-aaaaaaaaaaab', 'ADDONA000004', 'Addon de outro produto A', 400, true),
  ('bbbbbbbb-6100-4000-8000-bbbbbbbbbbbb', 'bbbbbbbb-2000-4000-8000-bbbbbbbbbbbb', 'bbbbbbbb-6000-4000-8000-bbbbbbbbbbbb', 'ADDONB000001', 'Addon B', 900, true)
on conflict (id) do update set public_code = excluded.public_code, is_available = excluded.is_available, price_delta_cents = excluded.price_delta_cents;

insert into public.tenant_settings (tenant_id, accepts_qr_orders, operating_status)
values
  ('aaaaaaaa-2000-4000-8000-aaaaaaaaaaaa', true, 'open'),
  ('bbbbbbbb-2000-4000-8000-bbbbbbbbbbbb', true, 'open')
on conflict (tenant_id) do update set accepts_qr_orders = excluded.accepts_qr_orders, operating_status = excluded.operating_status;

set local role anon;
reset request.jwt.claim.sub;
reset request.jwt.claim.role;

do $$
declare
  payload jsonb;
  invalid_payload jsonb;
  created_order_id uuid;
  stored_total integer;
  stored_items integer;
  stored_addons jsonb;
begin
  select public.create_public_order_by_qr(
    'tenant-order-a-test',
    'aaaaaaaa-4000-4000-8000-aaaaaaaaaaaa',
    'Cliente Teste',
    'Sem cebola',
    jsonb_build_array(jsonb_build_object('product_code', 'PRODA0000001', 'quantity', 2, 'notes', 'Ponto certo', 'addon_codes', jsonb_build_array('ADDONA000001', 'ADDONA000002')))
  ) into payload;

  if payload #>> '{public_order_code}' is null then
    raise exception 'Public order did not return code';
  end if;
  if payload #>> '{order_id}' is not null then
    raise exception 'Public order leaked internal order id';
  end if;
  if (payload #>> '{total_cents}')::integer <> 6600 then
    raise exception 'Public order total mismatch with add-ons';
  end if;

  set local role postgres;
  select id, total_cents into created_order_id, stored_total
  from public.tenant_customer_orders
  where tenant_id = 'aaaaaaaa-2000-4000-8000-aaaaaaaaaaaa'
  order by created_at desc
  limit 1;

  select count(*) into stored_items
  from public.tenant_customer_order_items
  where order_id = created_order_id
    and product_name = 'X-Teste'
    and unit_price_cents = 2500
    and addons_total_cents = 800
    and line_total_cents = 6600
    and quantity = 2;

  select selected_addons into stored_addons
  from public.tenant_customer_order_items
  where order_id = created_order_id
    and product_name = 'X-Teste'
  limit 1;

  if stored_total <> 6600 or stored_items <> 1 then
    raise exception 'Stored public order snapshot mismatch with add-ons';
  end if;
  if jsonb_array_length(stored_addons) <> 2 or stored_addons #>> '{0,name}' <> 'Bacon extra' then
    raise exception 'Stored add-ons snapshot mismatch';
  end if;

  set local role anon;
  begin
    select public.create_public_order_by_qr(
      'tenant-order-a-test',
      'aaaaaaaa-4000-4000-8000-aaaaaaaaaaaa',
      'Cliente Teste',
      null,
      jsonb_build_array(jsonb_build_object('product_code', 'PRODB0000001', 'quantity', 1))
    ) into invalid_payload;
    raise exception 'Cross-tenant product was accepted';
  exception when others then
    if sqlerrm = 'Cross-tenant product was accepted' then
      raise;
    end if;
  end;


  begin
    select public.create_public_order_by_qr(
      'tenant-order-a-test',
      'aaaaaaaa-4000-4000-8000-aaaaaaaaaaaa',
      'Cliente Teste',
      null,
      jsonb_build_array(jsonb_build_object('product_code', 'PRODA0000001', 'quantity', 1, 'addon_codes', jsonb_build_array('ADDONB000001')))
    ) into invalid_payload;
    raise exception 'Cross-tenant add-on was accepted';
  exception when others then
    if sqlerrm = 'Cross-tenant add-on was accepted' then
      raise;
    end if;
  end;

  begin
    select public.create_public_order_by_qr(
      'tenant-order-a-test',
      'aaaaaaaa-4000-4000-8000-aaaaaaaaaaaa',
      'Cliente Teste',
      null,
      jsonb_build_array(jsonb_build_object('product_code', 'PRODA0000001', 'quantity', 1, 'addon_codes', jsonb_build_array('ADDONA000003')))
    ) into invalid_payload;
    raise exception 'Unavailable add-on was accepted';
  exception when others then
    if sqlerrm = 'Unavailable add-on was accepted' then
      raise;
    end if;
  end;


  begin
    select public.create_public_order_by_qr(
      'tenant-order-a-test',
      'aaaaaaaa-4000-4000-8000-aaaaaaaaaaaa',
      'Cliente Teste',
      null,
      jsonb_build_array(jsonb_build_object('product_code', 'PRODA0000001', 'quantity', 1, 'addon_codes', jsonb_build_array('ADDONA000004')))
    ) into invalid_payload;
    raise exception 'Wrong-product add-on was accepted';
  exception when others then
    if sqlerrm = 'Wrong-product add-on was accepted' then
      raise;
    end if;
  end;
end $$;

select 'public order creation tests passed' as result;
rollback;
