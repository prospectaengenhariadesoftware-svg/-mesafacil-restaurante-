-- MesaFácil — Reforço de integridade produto-categoria por tenant

alter table public.tenant_product_categories
  add constraint tenant_product_categories_id_tenant_unique unique (id, tenant_id);

alter table public.tenant_products
  add constraint tenant_products_category_same_tenant
  foreign key (category_id, tenant_id)
  references public.tenant_product_categories(id, tenant_id)
  on delete restrict;
