-- MesaFácil — Operational order status flow verification
-- Safe to run: transaction rolls back all test data.

begin;

set local role postgres;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('cccccccc-1000-4000-8000-cccccccccccc', 'authenticated', 'authenticated', 'status-a@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('dddddddd-1000-4000-8000-dddddddddddd', 'authenticated', 'authenticated', 'status-b@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (user_id, name, email, status)
values
  ('cccccccc-1000-4000-8000-cccccccccccc', 'Status A', 'status-a@mesafacil.test', 'active'),
  ('dddddddd-1000-4000-8000-dddddddddddd', 'Status B', 'status-b@mesafacil.test', 'active')
on conflict (user_id) do update set status = excluded.status;

insert into public.tenants (id, name, public_slug, status)
values
  ('cccccccc-2000-4000-8000-cccccccccccc', 'Tenant Status A', 'tenant-status-a-test', 'active'),
  ('dddddddd-2000-4000-8000-dddddddddddd', 'Tenant Status B', 'tenant-status-b-test', 'active')
on conflict (id) do update set public_slug = excluded.public_slug, status = excluded.status;

insert into public.tenant_users (tenant_id, user_id, role, status)
values
  ('cccccccc-2000-4000-8000-cccccccccccc', 'cccccccc-1000-4000-8000-cccccccccccc', 'kitchen', 'active'),
  ('dddddddd-2000-4000-8000-dddddddddddd', 'dddddddd-1000-4000-8000-dddddddddddd', 'owner', 'active')
on conflict (tenant_id, user_id) do update set role = excluded.role, status = excluded.status;

insert into public.tenant_tables (id, tenant_id, number, seats, sector, qr_token, is_active)
values ('cccccccc-3000-4000-8000-cccccccccccc', 'cccccccc-2000-4000-8000-cccccccccccc', '20', 4, 'Salão', 'cccccccc-4000-4000-8000-cccccccccccc', true)
on conflict (id) do update set is_active = excluded.is_active;

insert into public.tenant_customer_orders (id, tenant_id, table_id, public_order_code, status, total_cents)
values ('cccccccc-7000-4000-8000-cccccccccccc', 'cccccccc-2000-4000-8000-cccccccccccc', 'cccccccc-3000-4000-8000-cccccccccccc', 'STAT-001', 'received', 4200)
on conflict (id) do update set status = excluded.status;

set local role authenticated;
set local request.jwt.claim.sub = 'cccccccc-1000-4000-8000-cccccccccccc';
set local request.jwt.claim.role = 'authenticated';

do $$
declare
  payload jsonb;
  current_status text;
begin
  select public.advance_tenant_customer_order_status(
    'cccccccc-2000-4000-8000-cccccccccccc',
    'cccccccc-7000-4000-8000-cccccccccccc',
    null
  ) into payload;

  if payload #>> '{status}' <> 'confirmed' then
    raise exception 'Expected confirmed status after first advance';
  end if;

  select public.advance_tenant_customer_order_status(
    'cccccccc-2000-4000-8000-cccccccccccc',
    'cccccccc-7000-4000-8000-cccccccccccc',
    null
  ) into payload;

  if payload #>> '{status}' <> 'preparing' then
    raise exception 'Expected preparing status after second advance';
  end if;

  begin
    update public.tenant_customer_orders
    set total_cents = 1
    where id = 'cccccccc-7000-4000-8000-cccccccccccc';
    raise exception 'Direct update was allowed';
  exception when insufficient_privilege then
    null;
  end;

  set local request.jwt.claim.sub = 'dddddddd-1000-4000-8000-dddddddddddd';
  begin
    select public.advance_tenant_customer_order_status(
      'cccccccc-2000-4000-8000-cccccccccccc',
      'cccccccc-7000-4000-8000-cccccccccccc',
      null
    ) into payload;
    raise exception 'Cross-tenant status update was accepted';
  exception when others then
    if sqlerrm = 'Cross-tenant status update was accepted' then
      raise;
    end if;
  end;

  set local request.jwt.claim.sub = 'cccccccc-1000-4000-8000-cccccccccccc';
  select public.advance_tenant_customer_order_status(
    'cccccccc-2000-4000-8000-cccccccccccc',
    'cccccccc-7000-4000-8000-cccccccccccc',
    'cancelled'
  ) into payload;

  if payload #>> '{status}' <> 'cancelled' then
    raise exception 'Expected cancelled status';
  end if;

  select status into current_status
  from public.tenant_customer_orders
  where id = 'cccccccc-7000-4000-8000-cccccccccccc';

  if current_status <> 'cancelled' then
    raise exception 'Stored status mismatch';
  end if;
end $$;

select 'order status flow tests passed' as result;
rollback;
