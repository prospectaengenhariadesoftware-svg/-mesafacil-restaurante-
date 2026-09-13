-- MesaFácil — MVP customer-to-delivery smoke verification
-- Safe to run: transaction rolls back all test data.
-- Covers: QR menu order creation, internal order visibility, kitchen/status flow,
-- cashier settlement, reporting source data, and cross-tenant isolation.

begin;

set local role postgres;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('eeeeeeee-1000-4000-8000-eeeeeeeeeeee', 'authenticated', 'authenticated', 'mvp-a@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('ffffffff-1000-4000-8000-ffffffffffff', 'authenticated', 'authenticated', 'mvp-b@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (user_id, name, email, status)
values
  ('eeeeeeee-1000-4000-8000-eeeeeeeeeeee', 'MVP A', 'mvp-a@mesafacil.test', 'active'),
  ('ffffffff-1000-4000-8000-ffffffffffff', 'MVP B', 'mvp-b@mesafacil.test', 'active')
on conflict (user_id) do update set status = excluded.status;

insert into public.tenants (id, name, public_slug, status)
values
  ('eeeeeeee-2000-4000-8000-eeeeeeeeeeee', 'Tenant MVP A', 'tenant-mvp-a-test', 'active'),
  ('ffffffff-2000-4000-8000-ffffffffffff', 'Tenant MVP B', 'tenant-mvp-b-test', 'active')
on conflict (id) do update set public_slug = excluded.public_slug, status = excluded.status;

insert into public.tenant_users (tenant_id, user_id, role, status)
values
  ('eeeeeeee-2000-4000-8000-eeeeeeeeeeee', 'eeeeeeee-1000-4000-8000-eeeeeeeeeeee', 'owner', 'active'),
  ('ffffffff-2000-4000-8000-ffffffffffff', 'ffffffff-1000-4000-8000-ffffffffffff', 'owner', 'active')
on conflict (tenant_id, user_id) do update set role = excluded.role, status = excluded.status;

insert into public.tenant_tables (id, tenant_id, number, seats, sector, qr_token, is_active)
values
  ('eeeeeeee-3000-4000-8000-eeeeeeeeeeee', 'eeeeeeee-2000-4000-8000-eeeeeeeeeeee', '42', 4, 'Salão', 'eeeeeeee-4000-4000-8000-eeeeeeeeeeee', true),
  ('ffffffff-3000-4000-8000-ffffffffffff', 'ffffffff-2000-4000-8000-ffffffffffff', '99', 4, 'Varanda', 'ffffffff-4000-4000-8000-ffffffffffff', true)
on conflict (id) do update set qr_token = excluded.qr_token, is_active = excluded.is_active;

insert into public.tenant_product_categories (id, tenant_id, name, is_active)
values
  ('eeeeeeee-5000-4000-8000-eeeeeeeeeeee', 'eeeeeeee-2000-4000-8000-eeeeeeeeeeee', 'Pratos', true),
  ('ffffffff-5000-4000-8000-ffffffffffff', 'ffffffff-2000-4000-8000-ffffffffffff', 'Pratos B', true)
on conflict (id) do update set is_active = excluded.is_active;

insert into public.tenant_products (id, tenant_id, category_id, public_code, name, description, price_cents, is_available)
values
  ('eeeeeeee-6000-4000-8000-eeeeeeeeeeee', 'eeeeeeee-2000-4000-8000-eeeeeeeeeeee', 'eeeeeeee-5000-4000-8000-eeeeeeeeeeee', 'MVPA00000001', 'Prato MVP', 'Produto do smoke MVP', 4500, true),
  ('ffffffff-6000-4000-8000-ffffffffffff', 'ffffffff-2000-4000-8000-ffffffffffff', 'ffffffff-5000-4000-8000-ffffffffffff', 'MVPB00000001', 'Prato MVP B', 'Produto de outro tenant', 9900, true)
on conflict (id) do update set public_code = excluded.public_code, price_cents = excluded.price_cents, is_available = excluded.is_available;

insert into public.tenant_settings (tenant_id, accepts_qr_orders, operating_status, service_fee_basis_points)
values
  ('eeeeeeee-2000-4000-8000-eeeeeeeeeeee', true, 'open', 1000),
  ('ffffffff-2000-4000-8000-ffffffffffff', true, 'open', 0)
on conflict (tenant_id) do update set
  accepts_qr_orders = excluded.accepts_qr_orders,
  operating_status = excluded.operating_status,
  service_fee_basis_points = excluded.service_fee_basis_points;

set local role anon;
reset request.jwt.claim.sub;
reset request.jwt.claim.role;

do $$
declare
  public_menu_payload jsonb;
  public_payload jsonb;
  created_order_id uuid;
  created_payment_id uuid;
  visible_order_count integer;
  order_status text;
  status_payload jsonb;
  payment_payload jsonb;
  invalid_public_payload jsonb;
  report_orders_count integer;
  report_delivered_count integer;
  report_paid_revenue integer;
  report_paid_items_count integer;
  cross_tenant_count integer;
begin
  -- Customer opens the QR menu and receives only customer-safe public catalog data.
  select public.get_public_menu_by_qr(
    'tenant-mvp-a-test',
    'eeeeeeee-4000-4000-8000-eeeeeeeeeeee'
  ) into public_menu_payload;

  if public_menu_payload is null then
    raise exception 'MVP smoke: public QR menu did not open';
  end if;
  if public_menu_payload #>> '{tenant,public_slug}' <> 'tenant-mvp-a-test' then
    raise exception 'MVP smoke: public QR menu tenant slug mismatch';
  end if;
  if public_menu_payload #>> '{table,number}' <> '42' then
    raise exception 'MVP smoke: public QR menu table mismatch';
  end if;
  if not jsonb_path_exists(public_menu_payload, '$.categories[*].products[*] ? (@.public_code == "MVPA00000001")') then
    raise exception 'MVP smoke: public QR menu did not expose expected public product code';
  end if;
  if public_menu_payload::text ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' then
    raise exception 'MVP smoke: public QR menu leaked internal UUIDs';
  end if;

  -- Public order RPC must reject cross-tenant products even with a valid QR from another tenant.
  begin
    select public.create_public_order_by_qr(
      'tenant-mvp-b-test',
      'ffffffff-4000-4000-8000-ffffffffffff',
      'Cliente invasor',
      null,
      jsonb_build_array(jsonb_build_object('product_code', 'MVPA00000001', 'quantity', 1))
    ) into invalid_public_payload;
    raise exception 'MVP smoke: public cross-tenant product was accepted';
  exception when others then
    if sqlerrm = 'MVP smoke: public cross-tenant product was accepted' then
      raise;
    end if;
  end;

  -- Customer sends an order without login through the validated QR capability.
  select public.create_public_order_by_qr(
    'tenant-mvp-a-test',
    'eeeeeeee-4000-4000-8000-eeeeeeeeeeee',
    'Cliente MVP',
    'Mesa aguardando smoke',
    jsonb_build_array(jsonb_build_object('product_code', 'MVPA00000001', 'quantity', 2, 'notes', 'Sem pimenta'))
  ) into public_payload;

  if public_payload #>> '{public_order_code}' is null then
    raise exception 'MVP smoke: public order did not return a customer-safe code';
  end if;
  if public_payload #>> '{order_id}' is not null then
    raise exception 'MVP smoke: public order leaked internal order id';
  end if;
  if (public_payload #>> '{total_cents}')::integer <> 9000 then
    raise exception 'MVP smoke: public order total mismatch';
  end if;

  set local role postgres;
  select id, status
  into created_order_id, order_status
  from public.tenant_customer_orders
  where tenant_id = 'eeeeeeee-2000-4000-8000-eeeeeeeeeeee'
    and public_order_code = public_payload #>> '{public_order_code}'
  limit 1;

  if created_order_id is null or order_status <> 'received' then
    raise exception 'MVP smoke: created order not stored as received';
  end if;

  -- Internal authenticated user for Tenant A can see the order in the operational panel source data.
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-1000-4000-8000-eeeeeeeeeeee';
  set local request.jwt.claim.role = 'authenticated';

  select count(*) into visible_order_count
  from public.tenant_customer_orders
  where tenant_id = 'eeeeeeee-2000-4000-8000-eeeeeeeeeeee'
    and id = created_order_id;

  if visible_order_count <> 1 then
    raise exception 'MVP smoke: authenticated tenant user cannot see created order';
  end if;

  -- Kitchen/operations advances the order through the full MVP status flow to delivered.
  select public.advance_tenant_customer_order_status('eeeeeeee-2000-4000-8000-eeeeeeeeeeee', created_order_id, null) into status_payload;
  if status_payload #>> '{status}' <> 'confirmed' then
    raise exception 'MVP smoke: expected confirmed status';
  end if;

  select public.advance_tenant_customer_order_status('eeeeeeee-2000-4000-8000-eeeeeeeeeeee', created_order_id, null) into status_payload;
  if status_payload #>> '{status}' <> 'preparing' then
    raise exception 'MVP smoke: expected preparing status';
  end if;

  select public.advance_tenant_customer_order_status('eeeeeeee-2000-4000-8000-eeeeeeeeeeee', created_order_id, null) into status_payload;
  if status_payload #>> '{status}' <> 'ready' then
    raise exception 'MVP smoke: expected ready status';
  end if;

  select public.advance_tenant_customer_order_status('eeeeeeee-2000-4000-8000-eeeeeeeeeeee', created_order_id, null) into status_payload;
  if status_payload #>> '{status}' <> 'delivered' then
    raise exception 'MVP smoke: expected delivered status';
  end if;

  -- Cashier settlement makes the delivered order count toward paid reports/top products.
  select public.close_tenant_cash_payment(
    'eeeeeeee-2000-4000-8000-eeeeeeeeeeee',
    'eeeeeeee-3000-4000-8000-eeeeeeeeeeee',
    array[created_order_id],
    'pix',
    0,
    9900,
    'Smoke MVP pago'
  ) into payment_payload;

  if payment_payload #>> '{status}' <> 'paid' then
    raise exception 'MVP smoke: expected paid cash payment';
  end if;
  if (payment_payload #>> '{total_due_cents}')::integer <> 9900 then
    raise exception 'MVP smoke: service-fee-adjusted total mismatch';
  end if;

  created_payment_id := (payment_payload #>> '{payment_id}')::uuid;

  -- Source data used by the reports page shows this exact delivered order, payment and paid item.
  select count(*) into report_orders_count
  from public.tenant_customer_orders
  where tenant_id = 'eeeeeeee-2000-4000-8000-eeeeeeeeeeee'
    and id = created_order_id
    and created_at >= date_trunc('day', timezone('utc', now()));

  select count(*) into report_delivered_count
  from public.tenant_customer_orders
  where tenant_id = 'eeeeeeee-2000-4000-8000-eeeeeeeeeeee'
    and id = created_order_id
    and status = 'delivered'
    and created_at >= date_trunc('day', timezone('utc', now()));

  select coalesce(sum(total_due_cents), 0) into report_paid_revenue
  from public.tenant_cash_payments
  where tenant_id = 'eeeeeeee-2000-4000-8000-eeeeeeeeeeee'
    and id = created_payment_id
    and status = 'paid'
    and created_at >= date_trunc('day', timezone('utc', now()));

  select count(*) into report_paid_items_count
  from public.tenant_customer_order_items item
  join public.tenant_cash_payment_orders paid
    on paid.order_id = item.order_id
   and paid.tenant_id = item.tenant_id
  join public.tenant_cash_payments payment
    on payment.id = paid.payment_id
   and payment.tenant_id = paid.tenant_id
  where item.tenant_id = 'eeeeeeee-2000-4000-8000-eeeeeeeeeeee'
    and item.order_id = created_order_id
    and payment.id = created_payment_id
    and payment.status = 'paid'
    and item.product_name = 'Prato MVP';

  if report_orders_count <> 1 or report_delivered_count <> 1 or report_paid_revenue <> 9900 or report_paid_items_count <> 1 then
    raise exception 'MVP smoke: report source data did not include the exact delivered/paid order';
  end if;

  -- Tenant B must not see Tenant A order through RLS even when guessing the ID.
  set local request.jwt.claim.sub = 'ffffffff-1000-4000-8000-ffffffffffff';
  select count(*) into cross_tenant_count
  from public.tenant_customer_orders
  where id = created_order_id;

  if cross_tenant_count <> 0 then
    raise exception 'MVP smoke: cross-tenant order visibility leak';
  end if;
end $$;

select 'MVP customer-to-delivery smoke tests passed' as result;
rollback;
