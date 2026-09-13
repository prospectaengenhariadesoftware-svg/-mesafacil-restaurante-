-- MesaFácil — harden product image Storage policies.
-- Public product images are readable, but object mutations must match catalog CRUD roles.

-- Replace the initial broad active-member policies with catalog-management RBAC
-- and a stricter path convention: <tenant_uuid>/products/<product_uuid>/<safe-file>.

drop policy if exists "tenant_product_images_insert_own_tenant" on storage.objects;
create policy "tenant_product_images_insert_own_tenant"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'tenant-product-images'
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] = 'products'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.current_user_has_tenant_role(((storage.foldername(name))[1])::uuid, ARRAY['owner','admin','manager']::public.tenant_role[])
);

drop policy if exists "tenant_product_images_update_own_tenant" on storage.objects;
create policy "tenant_product_images_update_own_tenant"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'tenant-product-images'
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] = 'products'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.current_user_has_tenant_role(((storage.foldername(name))[1])::uuid, ARRAY['owner','admin','manager']::public.tenant_role[])
)
with check (
  bucket_id = 'tenant-product-images'
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] = 'products'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.current_user_has_tenant_role(((storage.foldername(name))[1])::uuid, ARRAY['owner','admin','manager']::public.tenant_role[])
);

drop policy if exists "tenant_product_images_delete_own_tenant" on storage.objects;
create policy "tenant_product_images_delete_own_tenant"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'tenant-product-images'
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] = 'products'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.current_user_has_tenant_role(((storage.foldername(name))[1])::uuid, ARRAY['owner','admin','manager']::public.tenant_role[])
);
