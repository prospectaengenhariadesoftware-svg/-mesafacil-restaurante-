-- MesaFácil — product add-ons/complements with tenant-safe RLS and transactional audit.

create table if not exists public.tenant_product_addons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.tenant_products(id) on delete cascade,
  name text not null,
  description text,
  price_delta_cents integer not null default 0,
  is_available boolean not null default true,
  display_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_product_addons_name_len check (char_length(trim(name)) between 2 and 80),
  constraint tenant_product_addons_price_delta_valid check (price_delta_cents between 0 and 100000),
  constraint tenant_product_addons_display_order_valid check (display_order between 0 and 999),
  constraint tenant_product_addons_unique_name unique (tenant_id, product_id, name)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenant_product_addons_product_same_tenant'
      and conrelid = 'public.tenant_product_addons'::regclass
  ) then
    alter table public.tenant_product_addons
      add constraint tenant_product_addons_product_same_tenant
      foreign key (product_id, tenant_id)
      references public.tenant_products(id, tenant_id)
      on delete cascade;
  end if;
end $$;

create index if not exists idx_tenant_product_addons_tenant on public.tenant_product_addons(tenant_id, is_available, display_order, name);
create index if not exists idx_tenant_product_addons_product on public.tenant_product_addons(product_id, is_available, display_order, name);

drop trigger if exists set_tenant_product_addons_updated_at on public.tenant_product_addons;
create trigger set_tenant_product_addons_updated_at
before update on public.tenant_product_addons
for each row execute function public.set_updated_at();

alter table public.tenant_product_addons enable row level security;
alter table public.tenant_product_addons force row level security;

drop policy if exists tenant_product_addons_select_own_tenant on public.tenant_product_addons;
create policy tenant_product_addons_select_own_tenant
on public.tenant_product_addons
for select
to authenticated
using (public.current_user_has_tenant_access(tenant_id));

drop policy if exists tenant_product_addons_insert_owner_admin_manager on public.tenant_product_addons;
create policy tenant_product_addons_insert_owner_admin_manager
on public.tenant_product_addons
for insert
to authenticated
with check (
  public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[])
  and exists (
    select 1 from public.tenant_products p
    where p.id = product_id and p.tenant_id = tenant_product_addons.tenant_id
  )
);

drop policy if exists tenant_product_addons_update_owner_admin_manager on public.tenant_product_addons;
create policy tenant_product_addons_update_owner_admin_manager
on public.tenant_product_addons
for update
to authenticated
using (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[]))
with check (
  public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[])
  and exists (
    select 1 from public.tenant_products p
    where p.id = product_id and p.tenant_id = tenant_product_addons.tenant_id
  )
);

drop policy if exists tenant_product_addons_delete_owner_admin on public.tenant_product_addons;
create policy tenant_product_addons_delete_owner_admin
on public.tenant_product_addons
for delete
to authenticated
using (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role[]));

create or replace function public.audit_tenant_product_addon_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
    values (new.tenant_id, auth.uid(), 'CREATE_PRODUCT_ADDON', 'tenant_product_addons', new.id,
      jsonb_build_object('name', new.name, 'product_id', new.product_id, 'price_delta_cents', new.price_delta_cents, 'is_available', new.is_available));
    return new;
  end if;

  if tg_op = 'UPDATE' then
    insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
    values (new.tenant_id, auth.uid(),
      case when old.is_available = true and new.is_available = false and old.name = new.name and old.product_id = new.product_id and old.price_delta_cents = new.price_delta_cents and old.description is not distinct from new.description then 'INACTIVATE_PRODUCT_ADDON' else 'UPDATE_PRODUCT_ADDON' end,
      'tenant_product_addons', new.id,
      jsonb_build_object('name', new.name, 'product_id', new.product_id, 'old_product_id', old.product_id, 'price_delta_cents', new.price_delta_cents, 'old_price_delta_cents', old.price_delta_cents, 'is_available', new.is_available, 'old_is_available', old.is_available));
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
    values (old.tenant_id, auth.uid(), 'DELETE_PRODUCT_ADDON', 'tenant_product_addons', old.id,
      jsonb_build_object('name', old.name, 'product_id', old.product_id, 'price_delta_cents', old.price_delta_cents, 'is_available', old.is_available));
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists tenant_product_addons_audit_changes on public.tenant_product_addons;
create trigger tenant_product_addons_audit_changes
after insert or update or delete on public.tenant_product_addons
for each row execute function public.audit_tenant_product_addon_changes();
