-- MesaFácil — RLS tenant isolation verification
-- Safe to run: uses a transaction and rolls back all inserted test data.

begin;

-- Seed test users/tenants as privileged role.
set local role postgres;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a-rls@mesafacil.test', crypt('SenhaForte123!', gen_salt('bf')), now(), now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b-rls@mesafacil.test', crypt('SenhaForte123!', gen_salt('bf')), now(), now(), now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cashier-c-rls@mesafacil.test', crypt('SenhaForte123!', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;

insert into public.tenants (id, name, email, status, public_slug)
values
  ('11111111-1111-4111-8111-111111111111', 'Tenant A RLS', 'tenant-a-rls@mesafacil.test', 'active', 'tenant-a-rls'),
  ('22222222-2222-4222-8222-222222222222', 'Tenant B RLS', 'tenant-b-rls@mesafacil.test', 'active', 'tenant-b-rls')
on conflict (id) do nothing;

insert into public.profiles (user_id, name, email, status)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Owner A RLS', 'owner-a-rls@mesafacil.test', 'active'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Owner B RLS', 'owner-b-rls@mesafacil.test', 'active'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Cashier C RLS', 'cashier-c-rls@mesafacil.test', 'active')
on conflict (user_id) do update set status = excluded.status;

insert into public.tenant_users (tenant_id, user_id, role, status)
values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'owner', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'owner', 'active')
on conflict (tenant_id, user_id) do update set role = excluded.role, status = excluded.status;

-- Owner A session
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  if (select count(*) from public.tenants where id = '11111111-1111-4111-8111-111111111111') <> 1 then
    raise exception 'Owner A should read Tenant A';
  end if;
  if (select count(*) from public.tenants where id = '22222222-2222-4222-8222-222222222222') <> 0 then
    raise exception 'Owner A must not read Tenant B';
  end if;
end $$;

update public.tenants set name = 'Tenant B hacked by A' where id = '22222222-2222-4222-8222-222222222222';
set local role postgres;
do $$
begin
  if (select name from public.tenants where id = '22222222-2222-4222-8222-222222222222') = 'Tenant B hacked by A' then
    raise exception 'Owner A must not update Tenant B';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
delete from public.tenant_users where tenant_id = '22222222-2222-4222-8222-222222222222';
set local role postgres;
do $$
begin
  if (select count(*) from public.tenant_users where tenant_id = '22222222-2222-4222-8222-222222222222') <> 1 then
    raise exception 'Owner A must not delete Tenant B memberships';
  end if;
end $$;

-- Owner A can add an already registered user to Tenant A through the secure RPC.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.add_tenant_user_by_email('11111111-1111-4111-8111-111111111111', 'cashier-c-rls@mesafacil.test', 'cashier', 'active');

do $$
begin
  if (select count(*) from public.tenant_users where tenant_id = '11111111-1111-4111-8111-111111111111' and user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' and role = 'cashier' and status = 'active') <> 1 then
    raise exception 'Owner A should add registered user C to Tenant A';
  end if;
  if (select count(*) from public.profiles where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 1 then
    raise exception 'Owner A should see co-tenant user C profile';
  end if;
end $$;


-- Owner A can update Tenant A restaurant settings through the secure RPC.
select public.update_tenant_configuration(
  '11111111-1111-4111-8111-111111111111',
  'Tenant A Configurado',
  'Tenant A LTDA',
  '12.345.678/0001-90',
  'contato@tenant-a.test',
  '(11) 99999-0000',
  'tenant-a-configurado',
  'Descrição pública do Tenant A',
  'Rua A, 100',
  'São Paulo',
  'SP',
  true,
  1000,
  25,
  'open',
  'Atendimento normal'
);

do $$
begin
  if (select public_slug from public.tenants where id = '11111111-1111-4111-8111-111111111111') <> 'tenant-a-configurado' then
    raise exception 'Owner A should update Tenant A public slug';
  end if;
  if (select count(*) from public.tenant_settings where tenant_id = '11111111-1111-4111-8111-111111111111' and service_fee_basis_points = 1000 and operating_status = 'open') <> 1 then
    raise exception 'Owner A should upsert Tenant A settings';
  end if;
end $$;


-- Owner A must not bypass audited configuration RPC with direct same-tenant tenant profile/status updates.
do $$
declare
  changed_count integer;
begin
  update public.tenants
  set public_slug = 'tenant-a-direct-bypass', status = 'blocked'
  where id = '11111111-1111-4111-8111-111111111111';
  get diagnostics changed_count = row_count;
  if changed_count <> 0 then
    raise exception 'Owner A must not directly update tenant profile/status';
  end if;
end $$;

set local role postgres;
do $$
begin
  if (select public_slug from public.tenants where id = '11111111-1111-4111-8111-111111111111') = 'tenant-a-direct-bypass'
     or (select status from public.tenants where id = '11111111-1111-4111-8111-111111111111') = 'blocked' then
    raise exception 'Owner A direct tenant update bypass changed data';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Cashier C can read same-tenant settings but cannot edit them through direct DML or the secure RPC.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  if (select count(*) from public.tenant_settings where tenant_id = '11111111-1111-4111-8111-111111111111') <> 1 then
    raise exception 'Cashier C should read own tenant settings';
  end if;
end $$;

update public.tenant_settings
set operating_status = 'closed'
where tenant_id = '11111111-1111-4111-8111-111111111111';

set local role postgres;
do $$
begin
  if (select operating_status from public.tenant_settings where tenant_id = '11111111-1111-4111-8111-111111111111') = 'closed' then
    raise exception 'Cashier C must not update tenant settings directly';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  perform public.update_tenant_configuration(
    '11111111-1111-4111-8111-111111111111',
    'Tenant A Cashier Hack',
    null,
    null,
    null,
    null,
    'tenant-a-cashier-hack',
    null,
    null,
    null,
    null,
    true,
    0,
    null,
    'open',
    null
  );
  raise exception 'Cashier C must not update tenant configuration through RPC';
exception when insufficient_privilege then
  null;
end $$;

set local role postgres;
do $$
begin
  if (select public_slug from public.tenants where id = '11111111-1111-4111-8111-111111111111') = 'tenant-a-cashier-hack' then
    raise exception 'Cashier C RPC attempt must not change tenant slug';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Owner A can promote C to admin, but admin C cannot grant owner or modify owner A.
update public.tenant_users
set role = 'admin'
where tenant_id = '11111111-1111-4111-8111-111111111111'
  and user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  update public.tenant_users
  set role = 'owner'
  where tenant_id = '11111111-1111-4111-8111-111111111111'
    and user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  raise exception 'Tenant admin C must not grant owner role';
exception when insufficient_privilege then
  null;
end $$;

do $$
begin
  update public.tenant_users
  set role = 'admin'
  where tenant_id = '11111111-1111-4111-8111-111111111111'
    and user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  raise exception 'Tenant admin C must not demote owner A';
exception when insufficient_privilege then
  null;
end $$;

delete from public.tenant_users
where tenant_id = '11111111-1111-4111-8111-111111111111'
  and user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

set local role postgres;
do $$
begin
  if (select count(*) from public.tenant_users where tenant_id = '11111111-1111-4111-8111-111111111111' and user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and role = 'owner') <> 1 then
    raise exception 'Tenant admin C must not delete owner A';
  end if;
end $$;

-- Even owner A cannot leave the tenant with zero active owners.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  update public.tenant_users
  set status = 'disabled'
  where tenant_id = '11111111-1111-4111-8111-111111111111'
    and user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  raise exception 'Owner A must not disable the last active owner';
exception when check_violation then
  null;
end $$;

-- Owner A cannot use the RPC to add a user to Tenant B.
do $$
begin
  perform public.add_tenant_user_by_email('22222222-2222-4222-8222-222222222222', 'cashier-c-rls@mesafacil.test', 'cashier', 'active');
  raise exception 'Owner A must not add users to Tenant B';
exception when insufficient_privilege then
  null;
end $$;

-- RLS blocks direct cross-tenant team updates.
update public.tenant_users
set role = 'admin'
where tenant_id = '22222222-2222-4222-8222-222222222222'
  and user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
set local role postgres;
do $$
begin
  if (select role from public.tenant_users where tenant_id = '22222222-2222-4222-8222-222222222222' and user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') = 'admin' then
    raise exception 'Owner A must not update Tenant B team role';
  end if;
end $$;

-- Owner B session
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  if (select count(*) from public.tenants where id = '22222222-2222-4222-8222-222222222222') <> 1 then
    raise exception 'Owner B should read Tenant B';
  end if;
  if (select count(*) from public.tenants where id = '11111111-1111-4111-8111-111111111111') <> 0 then
    raise exception 'Owner B must not read Tenant A';
  end if;
end $$;


do $$
begin
  if (select count(*) from public.tenant_settings where tenant_id = '11111111-1111-4111-8111-111111111111') <> 0 then
    raise exception 'Owner B must not read Tenant A settings';
  end if;
end $$;

update public.tenant_settings
set public_notice = 'Tenant B invadiu Tenant A'
where tenant_id = '11111111-1111-4111-8111-111111111111';

set local role postgres;
do $$
begin
  if (select public_notice from public.tenant_settings where tenant_id = '11111111-1111-4111-8111-111111111111') = 'Tenant B invadiu Tenant A' then
    raise exception 'Owner B must not update Tenant A settings';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

update public.tenants set name = 'Tenant A hacked by B' where id = '11111111-1111-4111-8111-111111111111';
set local role postgres;
do $$
begin
  if (select name from public.tenants where id = '11111111-1111-4111-8111-111111111111') = 'Tenant A hacked by B' then
    raise exception 'Owner B must not update Tenant A';
  end if;
end $$;

-- Disabled membership cannot read own tenant.
set local role postgres;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);
update public.tenant_users set status = 'disabled' where tenant_id = '11111111-1111-4111-8111-111111111111' and user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  if (select count(*) from public.tenants where id = '11111111-1111-4111-8111-111111111111') <> 0 then
    raise exception 'Disabled Admin C must not read Tenant A';
  end if;
end $$;

rollback;

select 'RLS tenant isolation tests passed' as result;
