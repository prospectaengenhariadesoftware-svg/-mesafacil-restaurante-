-- MesaFácil — Public QR menu verification
-- Safe to run: transaction rolls back all test data.

begin;

set local role postgres;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'authenticated', 'authenticated', 'public-menu-owner@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (user_id, name, email, status)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Public Menu Owner', 'public-menu-owner@mesafacil.test', 'active')
on conflict (user_id) do update set status = excluded.status;

insert into public.tenants (id, name, public_slug, status)
values ('eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee', 'Public Menu Tenant', 'public-menu-tenant-test', 'active')
on conflict (id) do update set public_slug = excluded.public_slug, status = excluded.status;

insert into public.tenant_users (tenant_id, user_id, role, status)
values ('eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'owner', 'active')
on conflict (tenant_id, user_id) do update set status = excluded.status, role = excluded.role;

insert into public.tenant_tables (id, tenant_id, number, seats, sector, qr_token, is_active)
values ('eeeeeeee-2222-4eee-8eee-eeeeeeeeeeee', 'eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee', '01', 4, 'Salão', 'eeeeeeee-3333-4eee-8eee-eeeeeeeeeeee', true)
on conflict (id) do update set qr_token = excluded.qr_token, is_active = excluded.is_active;

insert into public.tenant_product_categories (id, tenant_id, name, description, is_active)
values ('eeeeeeee-4444-4eee-8eee-eeeeeeeeeeee', 'eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee', 'Bebidas', 'Sucos e refrigerantes', true)
on conflict (id) do update set is_active = excluded.is_active;

insert into public.tenant_products (id, tenant_id, category_id, name, description, price_cents, is_available)
values ('eeeeeeee-5555-4eee-8eee-eeeeeeeeeeee', 'eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee', 'eeeeeeee-4444-4eee-8eee-eeeeeeeeeeee', 'Suco natural', 'Laranja 500ml', 1250, true)
on conflict (id) do update set is_available = excluded.is_available;

insert into public.tenant_settings (tenant_id, accepts_qr_orders, operating_status)
values ('eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee', true, 'open')
on conflict (tenant_id) do update set accepts_qr_orders = excluded.accepts_qr_orders, operating_status = excluded.operating_status;

set local role anon;
reset request.jwt.claim.sub;
reset request.jwt.claim.role;

do $$
declare
  payload jsonb;
begin
  select public.get_public_menu_by_qr('public-menu-tenant-test', 'eeeeeeee-3333-4eee-8eee-eeeeeeeeeeee') into payload;
  if payload is null then
    raise exception 'Public menu RPC returned null for valid slug/token';
  end if;
  if payload #>> '{tenant,name}' <> 'Public Menu Tenant' then
    raise exception 'Public menu tenant payload mismatch';
  end if;
  if payload #>> '{tenant,id}' is not null then
    raise exception 'Public menu leaked internal tenant id';
  end if;
  if payload #>> '{table,id}' is not null then
    raise exception 'Public menu leaked internal table id';
  end if;
  if payload #>> '{table,number}' <> '01' then
    raise exception 'Public menu table payload mismatch';
  end if;
  if payload #>> '{categories,0,products,0,name}' <> 'Suco natural' then
    raise exception 'Public menu product payload mismatch';
  end if;
  if payload #>> '{categories,0,id}' is not null then
    raise exception 'Public menu leaked internal category id';
  end if;
  if payload #>> '{categories,0,products,0,id}' is not null then
    raise exception 'Public menu leaked internal product id';
  end if;
  if payload #>> '{categories,0,products,0,public_code}' is null then
    raise exception 'Public menu did not return product public code';
  end if;

  select public.get_public_menu_by_qr('public-menu-tenant-test', 'ffffffff-3333-4fff-8fff-ffffffffffff') into payload;
  if payload is not null then
    raise exception 'Public menu RPC returned data for invalid QR token';
  end if;
end $$;

select 'public QR menu tests passed' as result;
rollback;
