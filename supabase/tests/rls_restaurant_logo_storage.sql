-- MesaFácil — Restaurant logo Storage tenant isolation verification
-- Safe to run: transaction rolls back test data and storage object rows.

begin;

set local role postgres;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-aaaa-4111-8aaa-111111111111', 'authenticated', 'authenticated', 'brand-a@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('22222222-bbbb-4222-8bbb-222222222222', 'authenticated', 'authenticated', 'brand-b@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('33333333-cccc-4333-8ccc-333333333333', 'authenticated', 'authenticated', 'brand-waiter@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('44444444-dddd-4444-8ddd-444444444444', 'authenticated', 'authenticated', 'brand-platform@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (user_id, name, email, status)
values
  ('11111111-aaaa-4111-8aaa-111111111111', 'Brand A', 'brand-a@mesafacil.test', 'active'),
  ('22222222-bbbb-4222-8bbb-222222222222', 'Brand B', 'brand-b@mesafacil.test', 'active'),
  ('33333333-cccc-4333-8ccc-333333333333', 'Brand Waiter', 'brand-waiter@mesafacil.test', 'active'),
  ('44444444-dddd-4444-8ddd-444444444444', 'Brand Platform', 'brand-platform@mesafacil.test', 'active')
on conflict (user_id) do update set status = excluded.status;

insert into public.platform_admins (user_id, role, status)
values ('44444444-dddd-4444-8ddd-444444444444', 'owner', 'active')
on conflict (user_id) do update set status = excluded.status, role = excluded.role;

insert into public.tenants (id, name, public_slug, status)
values
  ('11111111-1111-4111-8111-111111111111', 'Tenant Brand A', 'tenant-brand-a-test', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'Tenant Brand B', 'tenant-brand-b-test', 'active')
on conflict (id) do nothing;

insert into public.tenant_users (tenant_id, user_id, role, status)
values
  ('11111111-1111-4111-8111-111111111111', '11111111-aaaa-4111-8aaa-111111111111', 'owner', 'active'),
  ('22222222-2222-4222-8222-222222222222', '22222222-bbbb-4222-8bbb-222222222222', 'owner', 'active'),
  ('11111111-1111-4111-8111-111111111111', '33333333-cccc-4333-8ccc-333333333333', 'waiter', 'active')
on conflict (tenant_id, user_id) do update set status = excluded.status, role = excluded.role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenant-brand-assets', 'tenant-brand-assets', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

set local role authenticated;
set local request.jwt.claim.sub = '11111111-aaaa-4111-8aaa-111111111111';
set local request.jwt.claim.role = 'authenticated';

-- Owner A can insert into Tenant A logo path.
insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
values (
  'tenant-brand-assets',
  '11111111-1111-4111-8111-111111111111/identity/logo.png',
  '11111111-aaaa-4111-8aaa-111111111111',
  '11111111-aaaa-4111-8aaa-111111111111',
  '{"mimetype":"image/png","size":32}'::jsonb
);

-- Owner A can persist the owned logo path through the audited settings RPC.
select public.update_tenant_configuration(
  '11111111-1111-4111-8111-111111111111'::uuid,
  'Tenant Brand A',
  null,
  null,
  null,
  null,
  'tenant-brand-a-test',
  '11111111-1111-4111-8111-111111111111/identity/logo.png',
  null,
  null,
  null,
  null,
  false,
  0,
  null,
  'closed',
  null
);

-- The old settings RPC signature must not remain available after the logo-aware migration.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'update_tenant_configuration'
      and p.pronargs = 16
  ) then
    raise exception 'Old update_tenant_configuration signature still exists';
  end if;
end $$;

-- Direct RPC calls cannot persist arbitrary/external logo paths.
do $$
begin
  perform public.update_tenant_configuration(
    '11111111-1111-4111-8111-111111111111'::uuid,
    'Tenant Brand A',
    null,
    null,
    null,
    null,
    'tenant-brand-a-test',
    'https://evil.example/logo.png',
    null,
    null,
    null,
    null,
    false,
    0,
    null,
    'closed',
    null
  );
  raise exception 'RPC failure: arbitrary external logo path accepted';
exception when check_violation then
  null;
end $$;

-- Direct RPC calls cannot persist another tenant's logo path.
do $$
begin
  perform public.update_tenant_configuration(
    '11111111-1111-4111-8111-111111111111'::uuid,
    'Tenant Brand A',
    null,
    null,
    null,
    null,
    'tenant-brand-a-test',
    '22222222-2222-4222-8222-222222222222/identity/logo.png',
    null,
    null,
    null,
    null,
    false,
    0,
    null,
    'closed',
    null
  );
  raise exception 'RPC failure: cross-tenant logo path accepted';
exception when check_violation then
  null;
end $$;

-- Owner A cannot insert into Tenant B logo path.
do $$
begin
  insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
  values (
    'tenant-brand-assets',
    '22222222-2222-4222-8222-222222222222/identity/logo.png',
    '11111111-aaaa-4111-8aaa-111111111111',
    '11111111-aaaa-4111-8aaa-111111111111',
    '{"mimetype":"image/png","size":32}'::jsonb
  );
  raise exception 'RLS failure: owner A inserted logo into tenant B path';
exception when insufficient_privilege then
  null;
end $$;

-- Same-tenant waiter cannot mutate brand assets.
set local request.jwt.claim.sub = '33333333-cccc-4333-8ccc-333333333333';

do $$
begin
  insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
  values (
    'tenant-brand-assets',
    '11111111-1111-4111-8111-111111111111/identity/waiter.png',
    '33333333-cccc-4333-8ccc-333333333333',
    '33333333-cccc-4333-8ccc-333333333333',
    '{"mimetype":"image/png","size":32}'::jsonb
  );
  raise exception 'RLS failure: waiter inserted restaurant logo';
exception when insufficient_privilege then
  null;
end $$;

-- Platform super admin without tenant membership cannot mutate tenant brand assets.
set local request.jwt.claim.sub = '44444444-dddd-4444-8ddd-444444444444';

do $$
begin
  insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
  values (
    'tenant-brand-assets',
    '11111111-1111-4111-8111-111111111111/identity/platform-admin.png',
    '44444444-dddd-4444-8ddd-444444444444',
    '44444444-dddd-4444-8ddd-444444444444',
    '{"mimetype":"image/png","size":32}'::jsonb
  );
  raise exception 'RLS failure: platform super admin without tenant membership inserted restaurant logo';
exception when insufficient_privilege then
  null;
end $$;

-- Public/anonymous users can read public logo object metadata but cannot write.
set local role anon;
do $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
end $$;

do $$
begin
  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'tenant-brand-assets'
      and name = '11111111-1111-4111-8111-111111111111/identity/logo.png'
  ) then
    raise exception 'Anon should read restaurant logo object metadata for public bucket';
  end if;
end $$;

do $$
begin
  insert into storage.objects (bucket_id, name, metadata)
  values (
    'tenant-brand-assets',
    '11111111-1111-4111-8111-111111111111/identity/public-write.png',
    '{"mimetype":"image/png","size":32}'::jsonb
  );
  raise exception 'RLS failure: anon inserted restaurant logo';
exception when insufficient_privilege then
  null;
end $$;

select 'restaurant logo storage RLS tests passed' as result;

rollback;
