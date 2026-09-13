-- MesaFácil — tenant-scoped product image storage bucket and policies.
-- Product images are public menu assets, but writes must remain authenticated and tenant-scoped.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-product-images',
  'tenant-product-images',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tenant_product_images_public_read" on storage.objects;
create policy "tenant_product_images_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'tenant-product-images');

drop policy if exists "tenant_product_images_insert_own_tenant" on storage.objects;
create policy "tenant_product_images_insert_own_tenant"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'tenant-product-images'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.current_user_has_tenant_access(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "tenant_product_images_update_own_tenant" on storage.objects;
create policy "tenant_product_images_update_own_tenant"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'tenant-product-images'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.current_user_has_tenant_access(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'tenant-product-images'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.current_user_has_tenant_access(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "tenant_product_images_delete_own_tenant" on storage.objects;
create policy "tenant_product_images_delete_own_tenant"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'tenant-product-images'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.current_user_has_tenant_access(((storage.foldername(name))[1])::uuid)
);
