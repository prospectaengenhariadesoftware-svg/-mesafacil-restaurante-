-- MesaFácil — Cash payment/settlement verification
-- Safe to run: transaction rolls back all test data.

begin;

set local role postgres;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('eeeeeeee-1000-4000-8000-eeeeeeeeeeee', 'authenticated', 'authenticated', 'cash-a@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('ffffffff-1000-4000-8000-ffffffffffff', 'authenticated', 'authenticated', 'cash-b@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (user_id, name, email, status)
values
  ('eeeeeeee-1000-4000-8000-eeeeeeeeeeee', 'Cash A', 'cash-a@mesafacil.test', 'active'),
  ('ffffffff-1000-4000-8000-ffffffffffff', 'Cash B', 'cash-b@mesafacil.test', 'active')
on conflict (user_id) do update set status = excluded.status;

insert into public.tenants (id, name, public_slug, status)
values
  ('eeeeeeee-2000-4000-8000-eeeeeeeeeeee', 'Tenant Cash A', 'tenant-cash-a-test', 'active'),
  ('ffffffff-2000-4000-8000-ffffffffffff', 'Tenant Cash B', 'tenant-cash-b-test', 'active')
on conflict (id) do update set public_slug = excluded.public_slug, status = excluded.status;

insert into public.tenant_settings (tenant_id, service_fee_basis_points, accepts_qr_orders, operating_status)
values ('eeeeeeee-2000-4000-8000-eeeeeeeeeeee', 1000, true, 'open')
on conflict (tenant_id) do update set service_fee_basis_points = excluded.service_fee_basis_points;

insert into public.tenant_users (tenant_id, user_id, role, status)
values
  ('eeeeeeee-2000-4000-8000-eeeeeeeeeeee', 'eeeeeeee-1000-4000-8000-eeeeeeeeeeee', 'cashier', 'active'),
  ('ffffffff-2000-4000-8000-ffffffffffff', 'ffffffff-1000-4000-8000-ffffffffffff', 'owner', 'active')
on conflict (tenant_id, user_id) do update set role = excluded.role, status = excluded.status;

insert into public.tenant_tables (id, tenant_id, number, seats, sector, qr_token, is_active)
values ('eeeeeeee-3000-4000-8000-eeeeeeeeeeee', 'eeeeeeee-2000-4000-8000-eeeeeeeeeeee', '30', 4, 'Salão', 'eeeeeeee-4000-4000-8000-eeeeeeeeeeee', true)
on conflict (id) do update set is_active = excluded.is_active;

insert into public.tenant_customer_orders (id, tenant_id, table_id, public_order_code, status, total_cents)
values
  ('eeeeeeee-7000-4000-8000-eeeeeeeeeeee', 'eeeeeeee-2000-4000-8000-eeeeeeeeeeee', 'eeeeeeee-3000-4000-8000-eeeeeeeeeeee', 'CASH-001', 'delivered', 4200),
  ('eeeeeeee-7001-4000-8000-eeeeeeeeeeee', 'eeeeeeee-2000-4000-8000-eeeeeeeeeeee', 'eeeeeeee-3000-4000-8000-eeeeeeeeeeee', 'CASH-002', 'ready', 5800),
  ('eeeeeeee-7002-4000-8000-eeeeeeeeeeee', 'eeeeeeee-2000-4000-8000-eeeeeeeeeeee', 'eeeeeeee-3000-4000-8000-eeeeeeeeeeee', 'CASH-003', 'ready', 1000)
on conflict (id) do update set status = excluded.status, total_cents = excluded.total_cents;

set local role authenticated;
set local request.jwt.claim.sub = 'eeeeeeee-1000-4000-8000-eeeeeeeeeeee';
set local request.jwt.claim.role = 'authenticated';

do $$
declare
  payload jsonb;
  payment_count integer;
begin
  begin
    perform public.close_tenant_cash_payment(
      'eeeeeeee-2000-4000-8000-eeeeeeeeeeee',
      'eeeeeeee-3000-4000-8000-eeeeeeeeeeee',
      array['eeeeeeee-7002-4000-8000-eeeeeeeeeeee'::uuid],
      'pix',
      0,
      1000,
      'pagamento parcial não suportado'
    );
    raise exception 'Partial payment was accepted';
  exception when others then
    if sqlerrm = 'Partial payment was accepted' then
      raise;
    end if;
  end;

  select public.close_tenant_cash_payment(
    'eeeeeeee-2000-4000-8000-eeeeeeeeeeee',
    'eeeeeeee-3000-4000-8000-eeeeeeeeeeee',
    array[
      'eeeeeeee-7000-4000-8000-eeeeeeeeeeee'::uuid,
      'eeeeeeee-7001-4000-8000-eeeeeeeeeeee'::uuid
    ],
    'pix',
    500,
    10500,
    'teste de caixa'
  ) into payload;

  if payload #>> '{status}' <> 'paid' then
    raise exception 'Expected paid status';
  end if;
  if (payload #>> '{subtotal_cents}')::integer <> 10000 then
    raise exception 'Expected subtotal 10000';
  end if;
  if (payload #>> '{service_fee_cents}')::integer <> 1000 then
    raise exception 'Expected service fee 1000';
  end if;
  if (payload #>> '{total_due_cents}')::integer <> 10500 then
    raise exception 'Expected total due 10500';
  end if;

  select count(*) into payment_count
  from public.tenant_cash_payment_orders
  where tenant_id = 'eeeeeeee-2000-4000-8000-eeeeeeeeeeee';
  if payment_count <> 2 then
    raise exception 'Expected 2 paid orders';
  end if;

  begin
    perform public.close_tenant_cash_payment(
      'eeeeeeee-2000-4000-8000-eeeeeeeeeeee',
      'eeeeeeee-3000-4000-8000-eeeeeeeeeeee',
      array['eeeeeeee-7000-4000-8000-eeeeeeeeeeee'::uuid],
      'money',
      0,
      5000,
      null
    );
    raise exception 'Duplicate payment was accepted';
  exception when others then
    if sqlerrm = 'Duplicate payment was accepted' then
      raise;
    end if;
  end;

  set local request.jwt.claim.sub = 'ffffffff-1000-4000-8000-ffffffffffff';
  begin
    perform public.close_tenant_cash_payment(
      'eeeeeeee-2000-4000-8000-eeeeeeeeeeee',
      'eeeeeeee-3000-4000-8000-eeeeeeeeeeee',
      array['eeeeeeee-7001-4000-8000-eeeeeeeeeeee'::uuid],
      'pix',
      0,
      5800,
      null
    );
    raise exception 'Cross-tenant cash payment was accepted';
  exception when others then
    if sqlerrm = 'Cross-tenant cash payment was accepted' then
      raise;
    end if;
  end;
end $$;

select 'cash payment tests passed' as result;
rollback;
