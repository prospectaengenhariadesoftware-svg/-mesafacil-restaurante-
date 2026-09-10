-- MesaFácil — allow privileged maintenance/test seeds while enforcing tenant user RBAC for authenticated app sessions.

create or replace function public.enforce_tenant_user_role_transitions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  effective_tenant_id uuid;
  remaining_active_owner_count integer;
  actor_can_manage_owner boolean;
begin
  effective_tenant_id := coalesce(new.tenant_id, old.tenant_id);

  perform pg_advisory_xact_lock(hashtextextended(effective_tenant_id::text, 20260910152000));

  if current_setting('request.jwt.claim.role', true) = 'authenticated' and auth.uid() is not null then
    actor_can_manage_owner := public.current_user_has_tenant_role(effective_tenant_id, array['owner']::public.tenant_role[]);

    if tg_op in ('INSERT', 'UPDATE') and new.role = 'owner' and not actor_can_manage_owner then
      raise exception 'Apenas owner pode conceder papel owner.' using errcode = '42501';
    end if;

    if tg_op in ('UPDATE', 'DELETE') and old.role = 'owner' and not actor_can_manage_owner then
      raise exception 'Apenas owner pode alterar outro owner.' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    select count(*) into remaining_active_owner_count
    from public.tenant_users tu
    where tu.tenant_id = old.tenant_id
      and tu.id <> old.id
      and tu.role = 'owner'
      and tu.status = 'active';

    if new.role = 'owner' and new.status = 'active' then
      remaining_active_owner_count := remaining_active_owner_count + 1;
    end if;

    if remaining_active_owner_count < 1 then
      raise exception 'O restaurante deve manter ao menos um owner ativo.' using errcode = '23514';
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    select count(*) into remaining_active_owner_count
    from public.tenant_users tu
    where tu.tenant_id = old.tenant_id
      and tu.id <> old.id
      and tu.role = 'owner'
      and tu.status = 'active';

    if remaining_active_owner_count < 1 then
      raise exception 'O restaurante deve manter ao menos um owner ativo.' using errcode = '23514';
    end if;

    return old;
  end if;

  return new;
end;
$$;
