-- MesaFácil — atomic audit logging for tenant_products CRUD.
-- Product mutations and audit inserts happen in the same database transaction.

create or replace function public.audit_tenant_product_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
    values (
      new.tenant_id,
      auth.uid(),
      'CREATE_PRODUCT',
      'tenant_products',
      new.id,
      jsonb_build_object(
        'name', new.name,
        'category_id', new.category_id,
        'is_available', new.is_available
      )
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
    values (
      new.tenant_id,
      auth.uid(),
      case when old.is_available = true and new.is_available = false and old.name = new.name and old.category_id = new.category_id and old.price_cents = new.price_cents and old.description is not distinct from new.description and old.image_url is not distinct from new.image_url then 'INACTIVATE_PRODUCT' else 'UPDATE_PRODUCT' end,
      'tenant_products',
      new.id,
      jsonb_build_object(
        'name', new.name,
        'category_id', new.category_id,
        'old_category_id', old.category_id,
        'is_available', new.is_available,
        'old_is_available', old.is_available,
        'price_cents', new.price_cents,
        'old_price_cents', old.price_cents
      )
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
    values (
      old.tenant_id,
      auth.uid(),
      'DELETE_PRODUCT',
      'tenant_products',
      old.id,
      jsonb_build_object(
        'name', old.name,
        'category_id', old.category_id,
        'is_available', old.is_available
      )
    );
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists tenant_products_audit_changes on public.tenant_products;
create trigger tenant_products_audit_changes
after insert or update or delete on public.tenant_products
for each row execute function public.audit_tenant_product_changes();
