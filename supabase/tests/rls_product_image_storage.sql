-- MesaFácil — Product image Storage tenant isolation verification
-- Safe to run: transaction rolls back test data and storage object rows.

begin;

set local role postgres;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('abababab-abab-4aba-8aba-abababababab', 'authenticated', 'authenticated', 'storage-a@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc', 'authenticated', 'authenticated', 'storage-b@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd', 'authenticated', 'authenticated', 'storage-inactive@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'authenticated', 'authenticated', 'storage-waiter@mesafacil.test', crypt('x', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (user_id, name, email, status)
values
  ('abababab-abab-4aba-8aba-abababababab', 'Storage A', 'storage-a@mesafacil.test', 'active'),
  ('bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc', 'Storage B', 'storage-b@mesafacil.test', 'active'),
  ('cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd', 'Storage Inactive', 'storage-inactive@mesafacil.test', 'active'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Storage Waiter', 'storage-waiter@mesafacil.test', 'active')
on conflict (user_id) do update set status = excluded.status;

insert into public.tenants (id, name, public_slug, status)
values
  ('abababab-1111-4aba-8aba-abababababab', 'Tenant Storage A', 'tenant-storage-a-test', 'active'),
  ('bcbcbcbc-1111-4bcb-8bcb-bcbcbcbcbcbc', 'Tenant Storage B', 'tenant-storage-b-test', 'active')
on conflict (id) do nothing;

insert into public.tenant_users (tenant_id, user_id, role, status)
values
  ('abababab-1111-4aba-8aba-abababababab', 'abababab-abab-4aba-8aba-abababababab', 'owner', 'active'),
  ('bcbcbcbc-1111-4bcb-8bcb-bcbcbcbcbcbc', 'bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc', 'owner', 'active'),
  ('abababab-1111-4aba-8aba-abababababab', 'cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd', 'manager', 'disabled'),
  ('abababab-1111-4aba-8aba-abababababab', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'waiter', 'active')
on conflict (tenant_id, user_id) do update set status = excluded.status, role = excluded.role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenant-product-images', 'tenant-product-images', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

set local role authenticated;
set local request.jwt.claim.sub = 'abababab-abab-4aba-8aba-abababababab';
set local request.jwt.claim.role = 'authenticated';

-- User A can insert into Tenant A image path.
insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
values (
  'tenant-product-images',
  'abababab-1111-4aba-8aba-abababababab/products/abababab-2222-4aba-8aba-abababababab/suco.png',
  'abababab-abab-4aba-8aba-abababababab',
  'abababab-abab-4aba-8aba-abababababab',
  '{"mimetype":"image/png","size":32}'::jsonb
);

-- User A cannot insert into Tenant B image path.
do $$
begin
  insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
  values (
    'tenant-product-images',
    'bcbcbcbc-1111-4bcb-8bcb-bcbcbcbcbcbc/products/bcbcbcbc-2222-4bcb-8bcb-bcbcbcbcbcbc/cafe.png',
    'abababab-abab-4aba-8aba-abababababab',
    'abababab-abab-4aba-8aba-abababababab',
    '{"mimetype":"image/png","size":32}'::jsonb
  );
  raise exception 'RLS failure: user A inserted into tenant B storage path';
exception when insufficient_privilege then
  null;
end $$;

-- User A cannot move existing object to Tenant B path through UPDATE.
do $$
begin
  update storage.objects
  set name = 'bcbcbcbc-1111-4bcb-8bcb-bcbcbcbcbcbc/products/bcbcbcbc-2222-4bcb-8bcb-bcbcbcbcbcbc/moved.png'
  where bucket_id = 'tenant-product-images'
    and name = 'abababab-1111-4aba-8aba-abababababab/products/abababab-2222-4aba-8aba-abababababab/suco.png';
  raise exception 'RLS failure: user A moved image to tenant B path';
exception when insufficient_privilege then
  null;
end $$;

-- User A cannot write invalid path without tenant UUID prefix.
do $$
begin
  insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
  values (
    'tenant-product-images',
    'products/no-tenant-prefix.png',
    'abababab-abab-4aba-8aba-abababababab',
    'abababab-abab-4aba-8aba-abababababab',
    '{"mimetype":"image/png","size":32}'::jsonb
  );
  raise exception 'RLS failure: user A inserted invalid image path';
exception when insufficient_privilege then
  null;
end $$;

-- Inactive Tenant A member cannot write Tenant A image path.
set local request.jwt.claim.sub = 'cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd';

do $$
begin
  insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
  values (
    'tenant-product-images',
    'abababab-1111-4aba-8aba-abababababab/products/abababab-3333-4aba-8aba-abababababab/inactive.png',
    'cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd',
    'cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd',
    '{"mimetype":"image/png","size":32}'::jsonb
  );
  raise exception 'RLS failure: inactive user inserted product image';
exception when insufficient_privilege then
  null;
end $$;

-- Active same-tenant non-catalog roles cannot mutate product-image Storage objects directly.
set local request.jwt.claim.sub = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

do $$
begin
  insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
  values (
    'tenant-product-images',
    'abababab-1111-4aba-8aba-abababababab/products/abababab-5555-4aba-8aba-abababababab/waiter.png',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '{"mimetype":"image/png","size":32}'::jsonb
  );
  raise exception 'RLS failure: waiter inserted product image';
exception when insufficient_privilege then
  null;
end $$;

-- Public/anonymous users can read public product image object metadata but cannot write.
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
    where bucket_id = 'tenant-product-images'
      and name = 'abababab-1111-4aba-8aba-abababababab/products/abababab-2222-4aba-8aba-abababababab/suco.png'
  ) then
    raise exception 'Anon should read product image object metadata for public bucket';
  end if;
end $$;

do $$
begin
  insert into storage.objects (bucket_id, name, metadata)
  values (
    'tenant-product-images',
    'abababab-1111-4aba-8aba-abababababab/products/abababab-4444-4aba-8aba-abababababab/public-write.png',
    '{"mimetype":"image/png","size":32}'::jsonb
  );
  raise exception 'RLS failure: anon inserted product image';
exception when insufficient_privilege then
  null;
end $$;

select 'product image storage RLS tests passed' as result;

rollback;
