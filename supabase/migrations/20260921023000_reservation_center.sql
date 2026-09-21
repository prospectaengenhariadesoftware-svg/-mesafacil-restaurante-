-- MesaFácil — central de reservas com agendamento, status e relatórios.

create table if not exists public.tenant_table_reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  table_id uuid not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  scheduled_at timestamptz not null,
  party_size integer,
  status text not null default 'pending',
  source text not null default 'public_site',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_table_reservations_table_same_tenant
    foreign key (table_id, tenant_id)
    references public.tenant_tables(id, tenant_id)
    on delete restrict,
  constraint tenant_table_reservations_customer_name_len check (char_length(trim(customer_name)) between 2 and 120),
  constraint tenant_table_reservations_customer_email_len check (char_length(trim(customer_email)) <= 160 and customer_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint tenant_table_reservations_customer_phone_len check (char_length(trim(customer_phone)) between 10 and 32),
  constraint tenant_table_reservations_party_size_check check (party_size is null or party_size between 1 and 99),
  constraint tenant_table_reservations_slot_check check (
    extract(second from scheduled_at) = 0
    and extract(minute from scheduled_at) in (0, 30)
  ),
  constraint tenant_table_reservations_status_check check (status in ('pending','confirmed','cancelled','completed','no_show')),
  constraint tenant_table_reservations_source_check check (source in ('public_site','manual','phone','whatsapp')),
  constraint tenant_table_reservations_notes_len check (notes is null or char_length(trim(notes)) <= 500)
);

create unique index if not exists idx_tenant_table_reservations_no_double_booking
  on public.tenant_table_reservations(tenant_id, table_id, scheduled_at)
  where status in ('pending','confirmed');

create index if not exists idx_tenant_table_reservations_tenant_schedule
  on public.tenant_table_reservations(tenant_id, scheduled_at desc);
create index if not exists idx_tenant_table_reservations_tenant_status_schedule
  on public.tenant_table_reservations(tenant_id, status, scheduled_at desc);
create index if not exists idx_tenant_table_reservations_customer_search
  on public.tenant_table_reservations(tenant_id, lower(customer_name), lower(customer_email));

-- Remove dados pessoais do fluxo antigo baseado em tenant_tables; a nova fonte canônica é tenant_table_reservations.
update public.tenant_tables
set reservation_status = 'available',
    reserved_customer_name = null,
    reserved_customer_email = null,
    reserved_customer_phone = null,
    reserved_at = null
where reservation_status = 'reserved'
   or reserved_customer_name is not null
   or reserved_customer_email is not null
   or reserved_customer_phone is not null
   or reserved_at is not null;

alter table public.tenant_table_reservations enable row level security;
alter table public.tenant_table_reservations force row level security;

drop policy if exists "tenant_table_reservations_select_manager" on public.tenant_table_reservations;
create policy "tenant_table_reservations_select_manager"
on public.tenant_table_reservations
for select
to authenticated
using (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[]));

drop policy if exists "tenant_table_reservations_insert_manager" on public.tenant_table_reservations;
create policy "tenant_table_reservations_insert_manager"
on public.tenant_table_reservations
for insert
to authenticated
with check (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[]));

drop policy if exists "tenant_table_reservations_update_manager" on public.tenant_table_reservations;
create policy "tenant_table_reservations_update_manager"
on public.tenant_table_reservations
for update
to authenticated
using (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[]))
with check (public.current_user_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[]));

create or replace function public.touch_tenant_table_reservations_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_tenant_table_reservations_updated_at on public.tenant_table_reservations;
create trigger set_tenant_table_reservations_updated_at
before update on public.tenant_table_reservations
for each row execute function public.touch_tenant_table_reservations_updated_at();

create or replace function public.get_public_site_by_slug(site_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'display_name', p.display_name,
      'public_slug', p.public_slug,
      'headline', p.headline,
      'description', p.description,
      'phone', p.phone,
      'whatsapp', p.whatsapp,
      'instagram', p.instagram,
      'address_line', p.address_line,
      'show_menu', p.show_menu,
      'accepts_reservations', p.accepts_reservations,
      'accepts_online_orders', p.accepts_online_orders
    ),
    'tenant', jsonb_build_object(
      'name', t.name,
      'public_slug', t.public_slug,
      'status', t.status
    ),
    'tables', case when p.accepts_reservations then coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'number', tb.number,
          'seats', tb.seats,
          'sector', tb.sector,
          'reservation_status', 'available'
        )
        order by tb.number
      )
      from public.tenant_tables tb
      where tb.tenant_id = t.id
        and tb.is_active = true
    ), '[]'::jsonb) else '[]'::jsonb end,
    'categories', case when p.show_menu then coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'name', c.name,
          'description', c.description,
          'products', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'public_code', pr.public_code,
                'name', pr.name,
                'description', pr.description,
                'price_cents', pr.price_cents,
                'image_url', pr.image_url,
                'is_available', pr.is_available
              )
              order by pr.name
            )
            from public.tenant_products pr
            where pr.tenant_id = t.id
              and pr.category_id = c.id
              and pr.is_available = true
          ), '[]'::jsonb)
        )
        order by c.display_order, c.name
      )
      from public.tenant_product_categories c
      where c.tenant_id = t.id
        and c.is_active = true
    ), '[]'::jsonb) else '[]'::jsonb end
  ) into result
  from public.tenant_public_profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.public_slug = public.slugify_public(site_slug)
    and p.is_published = true
    and t.status in ('active', 'trialing');

  return result;
end;
$$;

revoke all on function public.get_public_site_by_slug(text) from public;
grant execute on function public.get_public_site_by_slug(text) to anon, authenticated;

create or replace function public.create_public_table_reservation(
  site_slug text,
  table_number_input text,
  customer_name_input text,
  customer_email_input text,
  customer_phone_input text,
  reservation_scheduled_at timestamptz,
  reservation_party_size integer,
  request_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_tenant_id uuid;
  target_table_id uuid;
  reserved_table_number text;
  created_reservation_id uuid;
  recent_fingerprint_attempts integer;
  recent_tenant_attempts integer;
begin
  select t.id into target_tenant_id
  from public.tenant_public_profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.public_slug = public.slugify_public(site_slug)
    and p.is_published = true
    and p.accepts_reservations = true
    and t.status in ('active', 'trialing');

  if target_tenant_id is null then
    raise exception 'Restaurante não aceita reservas públicas.' using errcode = '42501';
  end if;

  if char_length(trim(coalesce(request_fingerprint, ''))) < 32 or char_length(trim(coalesce(request_fingerprint, ''))) > 128 then
    raise exception 'Reserva não autorizada.' using errcode = '42501';
  end if;

  delete from public.tenant_public_reservation_attempts
  where created_at < timezone('utc', now()) - interval '24 hours';

  select count(*) into recent_fingerprint_attempts
  from public.tenant_public_reservation_attempts
  where tenant_id = target_tenant_id
    and fingerprint = trim(request_fingerprint)
    and created_at >= timezone('utc', now()) - interval '1 hour';

  select count(*) into recent_tenant_attempts
  from public.tenant_public_reservation_attempts
  where tenant_id = target_tenant_id
    and created_at >= timezone('utc', now()) - interval '10 minutes';

  if recent_fingerprint_attempts >= 3 or recent_tenant_attempts >= 20 then
    raise exception 'Muitas tentativas de reserva. Tente novamente mais tarde.' using errcode = '42501';
  end if;

  insert into public.tenant_public_reservation_attempts (tenant_id, fingerprint)
  values (target_tenant_id, trim(request_fingerprint));

  if char_length(trim(coalesce(table_number_input, ''))) < 1 or char_length(trim(coalesce(table_number_input, ''))) > 20 then
    raise exception 'Mesa inválida.' using errcode = '23514';
  end if;
  if char_length(trim(coalesce(customer_name_input, ''))) < 2 or char_length(trim(coalesce(customer_name_input, ''))) > 120 then
    raise exception 'Nome inválido.' using errcode = '23514';
  end if;
  if trim(coalesce(customer_email_input, '')) !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(trim(customer_email_input)) > 160 then
    raise exception 'E-mail inválido.' using errcode = '23514';
  end if;
  if char_length(regexp_replace(coalesce(customer_phone_input, ''), '\D', '', 'g')) < 10
     or char_length(regexp_replace(coalesce(customer_phone_input, ''), '\D', '', 'g')) > 15
     or char_length(trim(coalesce(customer_phone_input, ''))) > 32 then
    raise exception 'Telefone inválido.' using errcode = '23514';
  end if;
  if reservation_scheduled_at is null or reservation_scheduled_at < timezone('utc', now()) + interval '30 minutes' then
    raise exception 'Data da reserva inválida.' using errcode = '23514';
  end if;
  if extract(second from reservation_scheduled_at) <> 0 or extract(minute from reservation_scheduled_at) not in (0, 30) then
    raise exception 'Horário deve estar em slots de 30 minutos.' using errcode = '23514';
  end if;
  if reservation_party_size is not null and (reservation_party_size < 1 or reservation_party_size > 99) then
    raise exception 'Quantidade de pessoas inválida.' using errcode = '23514';
  end if;

  select tb.id, tb.number into target_table_id, reserved_table_number
  from public.tenant_tables tb
  where tb.tenant_id = target_tenant_id
    and tb.number = trim(table_number_input)
    and tb.is_active = true;

  if target_table_id is null then
    raise exception 'Mesa indisponível para reserva.' using errcode = '23514';
  end if;

  insert into public.tenant_table_reservations (
    tenant_id,
    table_id,
    customer_name,
    customer_email,
    customer_phone,
    scheduled_at,
    party_size,
    status,
    source
  ) values (
    target_tenant_id,
    target_table_id,
    trim(customer_name_input),
    lower(trim(customer_email_input)),
    trim(customer_phone_input),
    reservation_scheduled_at,
    reservation_party_size,
    'pending',
    'public_site'
  )
  returning id into created_reservation_id;

  insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
  values (
    target_tenant_id,
    null,
    'PUBLIC_TABLE_RESERVATION_SCHEDULED',
    'tenant_table_reservations',
    created_reservation_id,
    jsonb_build_object(
      'table_number', reserved_table_number,
      'scheduled_at', reservation_scheduled_at,
      'public_reservation', true
    )
  );

  return jsonb_build_object(
    'reservation_id', created_reservation_id,
    'table_number', reserved_table_number,
    'scheduled_at', reservation_scheduled_at,
    'status', 'pending'
  );
exception
  when unique_violation then
    raise exception 'Já existe reserva ativa para esta mesa neste horário.' using errcode = '23505';
end;
$$;

revoke all on function public.create_public_table_reservation(text, text, text, text, text, text) from public, anon, authenticated;
drop function if exists public.create_public_table_reservation(text, text, text, text, text, text);
revoke all on function public.create_public_table_reservation(text, text, text, text, text, timestamptz, integer, text) from public, anon, authenticated;
grant execute on function public.create_public_table_reservation(text, text, text, text, text, timestamptz, integer, text) to anon, authenticated;

create or replace function public.update_table_reservation_status(
  reservation_tenant_id uuid,
  reservation_id uuid,
  next_status text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed_id uuid;
  previous_status text;
begin
  if auth.uid() is null then
    raise exception 'ACESSO NEGADO: usuário não autenticado' using errcode = '42501';
  end if;

  if not public.current_user_has_tenant_role(reservation_tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[]) then
    raise exception 'ACESSO NEGADO: apenas owner/admin/manager podem gerenciar reservas.' using errcode = '42501';
  end if;

  if next_status not in ('pending','confirmed','cancelled','completed','no_show') then
    raise exception 'Status inválido.' using errcode = '23514';
  end if;

  select status into previous_status
  from public.tenant_table_reservations
  where tenant_id = reservation_tenant_id
    and id = reservation_id
  for update;

  if previous_status is null then
    raise exception 'Reserva não encontrada.' using errcode = '23514';
  end if;

  update public.tenant_table_reservations
  set status = next_status,
      updated_by = auth.uid()
  where tenant_id = reservation_tenant_id
    and id = reservation_id
  returning id into changed_id;

  insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
  values (
    reservation_tenant_id,
    auth.uid(),
    'UPDATE_TABLE_RESERVATION_STATUS',
    'tenant_table_reservations',
    changed_id,
    jsonb_build_object('from', previous_status, 'to', next_status)
  );

  return changed_id;
end;
$$;

revoke all on function public.update_table_reservation_status(uuid, uuid, text) from public;
grant execute on function public.update_table_reservation_status(uuid, uuid, text) to authenticated;
