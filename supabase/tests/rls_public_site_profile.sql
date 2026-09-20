-- MesaFácil — Public site profile isolation verification
-- Safe to run: transaction rolls back test data.

begin;

set local role postgres;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('71111111-aaaa-4111-8aaa-111111111111', 'authenticated', 'authenticated', 'site-a@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('72222222-bbbb-4222-8bbb-222222222222', 'authenticated', 'authenticated', 'site-b@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('73333333-cccc-4333-8ccc-333333333333', 'authenticated', 'authenticated', 'site-waiter@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (user_id, name, email, status)
values
  ('71111111-aaaa-4111-8aaa-111111111111', 'Site Owner A', 'site-a@mesafacil.test', 'active'),
  ('72222222-bbbb-4222-8bbb-222222222222', 'Site Owner B', 'site-b@mesafacil.test', 'active'),
  ('73333333-cccc-4333-8ccc-333333333333', 'Site Waiter A', 'site-waiter@mesafacil.test', 'active')
on conflict (user_id) do update set status = excluded.status;

insert into public.tenants (id, name, public_slug, status)
values
  ('71111111-1111-4111-8111-111111111111', 'Site Tenant A', 'site-tenant-a-test', 'active'),
  ('72222222-2222-4222-8222-222222222222', 'Site Tenant B', 'site-tenant-b-test', 'active')
on conflict (id) do update set status = excluded.status, public_slug = excluded.public_slug;

insert into public.tenant_users (tenant_id, user_id, role, status)
values
  ('71111111-1111-4111-8111-111111111111', '71111111-aaaa-4111-8aaa-111111111111', 'owner', 'active'),
  ('72222222-2222-4222-8222-222222222222', '72222222-bbbb-4222-8bbb-222222222222', 'owner', 'active'),
  ('71111111-1111-4111-8111-111111111111', '73333333-cccc-4333-8ccc-333333333333', 'waiter', 'active')
on conflict (tenant_id, user_id) do update set status = excluded.status, role = excluded.role;

insert into public.tenant_product_categories (id, tenant_id, name, display_order, is_active)
values
  ('71111111-7777-4111-8111-111111111111', '71111111-1111-4111-8111-111111111111', 'Pizzas', 1, true),
  ('72222222-7777-4222-8222-222222222222', '72222222-2222-4222-8222-222222222222', 'Segredos B', 1, true)
on conflict (id) do nothing;

insert into public.tenant_products (id, tenant_id, category_id, name, description, price_cents, image_url, is_available, public_code)
values
  ('71111111-8888-4111-8111-111111111111', '71111111-1111-4111-8111-111111111111', '71111111-7777-4111-8111-111111111111', 'Pizza Margherita', 'Molho, queijo e manjericão', 4990, null, true, 'SITEA123456'),
  ('72222222-8888-4222-8222-222222222222', '72222222-2222-4222-8222-222222222222', '72222222-7777-4222-8222-222222222222', 'Produto Secreto B', 'Não pode vazar', 9990, null, true, 'SITEB123456')
on conflict (tenant_id, public_code) do nothing;

set local role authenticated;
set local request.jwt.claim.sub = '71111111-aaaa-4111-8aaa-111111111111';
set local request.jwt.claim.role = 'authenticated';

select public.update_tenant_public_site(
  '71111111-1111-4111-8111-111111111111'::uuid,
  'Pizzaria Pública A',
  'site-publico-a',
  'Pizza artesanal aberta hoje',
  'Descrição pública segura do Tenant A.',
  '(11) 99999-1111',
  'https://wa.me/5511999991111',
  '@sitepublicoa',
  'Rua A, 100',
  true,
  true,
  false,
  true
);

-- Same-tenant waiter cannot publish/edit the public site.
set local request.jwt.claim.sub = '73333333-cccc-4333-8ccc-333333333333';
do $$
begin
  perform public.update_tenant_public_site(
    '71111111-1111-4111-8111-111111111111'::uuid,
    'Tentativa Garçom', 'tentativa-garcom', null, null, null, null, null, null,
    true, true, false, false
  );
  raise exception 'RLS failure: waiter updated public site';
exception when insufficient_privilege then
  null;
end $$;

-- Owner A cannot update Tenant B profile.
set local request.jwt.claim.sub = '71111111-aaaa-4111-8aaa-111111111111';
do $$
begin
  perform public.update_tenant_public_site(
    '72222222-2222-4222-8222-222222222222'::uuid,
    'Tentativa Cross Tenant', 'cross-tenant-site', null, null, null, null, null, null,
    true, true, false, false
  );
  raise exception 'RLS failure: owner A updated tenant B public site';
exception when insufficient_privilege then
  null;
end $$;

set local role anon;
do $$
declare
  payload jsonb;
begin
  payload := public.get_public_site_by_slug('site-publico-a');

  if payload is null then
    raise exception 'Public site payload should be visible for a published active tenant';
  end if;

  if payload #>> '{profile,display_name}' <> 'Pizzaria Pública A' then
    raise exception 'Public site payload returned wrong profile: %', payload;
  end if;

  if payload::text like '%72222222-2222-4222-8222-222222222222%' or payload::text like '%Produto Secreto B%' then
    raise exception 'Tenant B data leaked in Tenant A public site payload: %', payload;
  end if;

  if public.get_public_site_by_slug('site-tenant-b-test') is not null then
    raise exception 'Unpublished Tenant B public site should not be visible';
  end if;
end $$;

select 'public site profile tests passed' as result;

rollback;
