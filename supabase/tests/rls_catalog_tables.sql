-- MesaFácil — Catalog and table RLS tenant isolation verification
-- Safe to run: transaction rolls back all test data.

begin;

set local role postgres;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'authenticated', 'authenticated', 'catalog-a@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'authenticated', 'authenticated', 'catalog-b@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (user_id, name, email, status)
values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Catalog A', 'catalog-a@mesafacil.test', 'active'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Catalog B', 'catalog-b@mesafacil.test', 'active')
on conflict (user_id) do update set status = excluded.status;

insert into public.tenants (id, name, status)
values
  ('cccccccc-1111-4ccc-8ccc-cccccccccccc', 'Tenant Catalog A', 'active'),
  ('dddddddd-1111-4ddd-8ddd-dddddddddddd', 'Tenant Catalog B', 'active')
on conflict (id) do nothing;

insert into public.tenant_users (tenant_id, user_id, role, status)
values
  ('cccccccc-1111-4ccc-8ccc-cccccccccccc', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'owner', 'active'),
  ('dddddddd-1111-4ddd-8ddd-dddddddddddd', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'owner', 'active')
on conflict (tenant_id, user_id) do update set status = excluded.status, role = excluded.role;

insert into public.tenant_product_categories (id, tenant_id, name, description)
values
  ('cccccccc-2222-4ccc-8ccc-cccccccccccc', 'cccccccc-1111-4ccc-8ccc-cccccccccccc', 'Bebidas A', null),
  ('dddddddd-2222-4ddd-8ddd-dddddddddddd', 'dddddddd-1111-4ddd-8ddd-dddddddddddd', 'Bebidas B', null)
on conflict (id) do nothing;

set local role authenticated;
set local request.jwt.claim.sub = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
set local request.jwt.claim.role = 'authenticated';

-- Owner A can create inside tenant A.
insert into public.tenant_products (tenant_id, category_id, name, price_cents)
values ('cccccccc-1111-4ccc-8ccc-cccccccccccc', 'cccccccc-2222-4ccc-8ccc-cccccccccccc', 'Produto A', 1000);

insert into public.tenant_tables (tenant_id, number, seats, sector)
values ('cccccccc-1111-4ccc-8ccc-cccccccccccc', 'A1', 4, 'Salão');

-- Owner A cannot see tenant B category.
do $$
begin
  if exists (select 1 from public.tenant_product_categories where id = 'dddddddd-2222-4ddd-8ddd-dddddddddddd') then
    raise exception 'RLS failure: owner A can see tenant B category';
  end if;
end $$;

-- Owner A cannot create product in tenant A using tenant B category.
do $$
begin
  begin
    insert into public.tenant_products (tenant_id, category_id, name, price_cents)
    values ('cccccccc-1111-4ccc-8ccc-cccccccccccc', 'dddddddd-2222-4ddd-8ddd-dddddddddddd', 'Cross Product', 1000);
    raise exception 'RLS failure: cross-tenant category accepted';
  exception when insufficient_privilege or foreign_key_violation or check_violation or with_check_option_violation then
    null;
  end;
end $$;

-- Owner A cannot create table in tenant B.
do $$
begin
  begin
    insert into public.tenant_tables (tenant_id, number, seats)
    values ('dddddddd-1111-4ddd-8ddd-dddddddddddd', 'B1', 4);
    raise exception 'RLS failure: owner A created tenant B table';
  exception when insufficient_privilege or with_check_option_violation then
    null;
  end;
end $$;

select 'catalog table RLS tests passed' as result;
rollback;
