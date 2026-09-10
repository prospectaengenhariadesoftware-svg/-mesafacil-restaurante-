-- MesaFácil — atomic audit logging for tenant_tables CRUD.
-- Table mutations and audit inserts happen in the same database transaction.

create or replace function public.audit_tenant_table_changes()
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
      'CREATE_TABLE',
      'tenant_tables',
      new.id,
      jsonb_build_object('number', new.number, 'sector', new.sector, 'is_active', new.is_active)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
    values (
      new.tenant_id,
      auth.uid(),
      case when old.is_active = true and new.is_active = false and old.number = new.number and old.seats = new.seats and old.sector is not distinct from new.sector then 'INACTIVATE_TABLE' else 'UPDATE_TABLE' end,
      'tenant_tables',
      new.id,
      jsonb_build_object(
        'number', new.number,
        'old_number', old.number,
        'seats', new.seats,
        'old_seats', old.seats,
        'sector', new.sector,
        'old_sector', old.sector,
        'is_active', new.is_active,
        'old_is_active', old.is_active
      )
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
    values (
      old.tenant_id,
      auth.uid(),
      'DELETE_TABLE',
      'tenant_tables',
      old.id,
      jsonb_build_object('number', old.number, 'sector', old.sector, 'is_active', old.is_active)
    );
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists tenant_tables_audit_changes on public.tenant_tables;
create trigger tenant_tables_audit_changes
after insert or update or delete on public.tenant_tables
for each row execute function public.audit_tenant_table_changes();
