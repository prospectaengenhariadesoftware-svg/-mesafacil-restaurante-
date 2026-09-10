-- MesaFácil — harden tenant team RBAC invariants after review.
-- This migration is intentionally corrective because 20260910152000 was already
-- applied remotely before the independent review identified these invariants.

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

drop trigger if exists tenant_users_enforce_role_transitions on public.tenant_users;
create trigger tenant_users_enforce_role_transitions
before insert or update or delete on public.tenant_users
for each row execute function public.enforce_tenant_user_role_transitions();

create or replace function public.add_tenant_user_by_email(
  target_tenant_id uuid,
  target_email text,
  target_role public.tenant_role,
  target_status public.tenant_user_status default 'active'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_email text;
  target_user_id uuid;
  membership_id uuid;
  existing_membership public.tenant_users%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Não foi possível adicionar o membro.' using errcode = '42501';
  end if;

  if not public.current_user_has_tenant_role(target_tenant_id, array['owner','admin']::public.tenant_role[]) then
    raise exception 'Não foi possível adicionar o membro.' using errcode = '42501';
  end if;

  if target_role = 'super_admin' or target_role = 'owner' then
    raise exception 'Não foi possível adicionar o membro.' using errcode = '22023';
  end if;

  if target_status not in ('active','disabled') then
    raise exception 'Não foi possível adicionar o membro.' using errcode = '22023';
  end if;

  normalized_email := lower(trim(coalesce(target_email, '')));
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Não foi possível adicionar o membro.' using errcode = '22023';
  end if;

  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = normalized_email
  limit 1;

  if target_user_id is null then
    raise exception 'Não foi possível adicionar o membro.' using errcode = 'P0002';
  end if;

  insert into public.profiles (user_id, name, email, status)
  values (target_user_id, normalized_email, normalized_email, 'active')
  on conflict (user_id) do update
    set email = excluded.email,
        updated_at = now();

  select * into existing_membership
  from public.tenant_users tu
  where tu.tenant_id = target_tenant_id
    and tu.user_id = target_user_id
  for update;

  if found then
    if existing_membership.role = 'owner' then
      raise exception 'Não foi possível adicionar o membro.' using errcode = '42501';
    end if;

    update public.tenant_users
    set role = target_role,
        status = target_status,
        updated_at = now()
    where id = existing_membership.id
    returning id into membership_id;
  else
    insert into public.tenant_users (tenant_id, user_id, role, status)
    values (target_tenant_id, target_user_id, target_role, target_status)
    returning id into membership_id;
  end if;

  return membership_id;
end;
$$;

revoke all on function public.add_tenant_user_by_email(uuid, text, public.tenant_role, public.tenant_user_status) from public;
grant execute on function public.add_tenant_user_by_email(uuid, text, public.tenant_role, public.tenant_user_status) to authenticated;
