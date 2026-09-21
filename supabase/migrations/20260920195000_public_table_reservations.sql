-- MesaFácil — public table reservation capture.

alter table public.tenant_tables
  add column if not exists reservation_status text not null default 'available',
  add column if not exists reserved_customer_name text,
  add column if not exists reserved_customer_email text,
  add column if not exists reserved_customer_phone text,
  add column if not exists reserved_at timestamptz;

alter table public.tenant_tables
  drop constraint if exists tenant_tables_reservation_status_check,
  add constraint tenant_tables_reservation_status_check check (reservation_status in ('available', 'reserved'));

alter table public.tenant_tables
  drop constraint if exists tenant_tables_reserved_customer_name_len,
  add constraint tenant_tables_reserved_customer_name_len check (reserved_customer_name is null or char_length(trim(reserved_customer_name)) between 2 and 120),
  drop constraint if exists tenant_tables_reserved_customer_email_len,
  add constraint tenant_tables_reserved_customer_email_len check (reserved_customer_email is null or char_length(trim(reserved_customer_email)) <= 160),
  drop constraint if exists tenant_tables_reserved_customer_phone_len,
  add constraint tenant_tables_reserved_customer_phone_len check (reserved_customer_phone is null or char_length(trim(reserved_customer_phone)) <= 32),
  drop constraint if exists tenant_tables_reserved_payload_required,
  add constraint tenant_tables_reserved_payload_required check (
    (
      reservation_status = 'available'
      and reserved_customer_name is null
      and reserved_customer_email is null
      and reserved_customer_phone is null
      and reserved_at is null
    )
    or (
      reservation_status = 'reserved'
      and reserved_customer_name is not null
      and reserved_customer_email is not null
      and reserved_customer_phone is not null
      and reserved_at is not null
    )
  );

create index if not exists idx_tenant_tables_public_reservations
  on public.tenant_tables(tenant_id, is_active, reservation_status, number);

create table if not exists public.tenant_public_reservation_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  fingerprint text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint tenant_public_reservation_attempts_fingerprint_len check (char_length(fingerprint) between 32 and 128)
);

create index if not exists idx_tenant_public_reservation_attempts_fingerprint
  on public.tenant_public_reservation_attempts(tenant_id, fingerprint, created_at desc);
create index if not exists idx_tenant_public_reservation_attempts_tenant_recent
  on public.tenant_public_reservation_attempts(tenant_id, created_at desc);

alter table public.tenant_public_reservation_attempts enable row level security;
alter table public.tenant_public_reservation_attempts force row level security;

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
          'reservation_status', tb.reservation_status
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

  update public.tenant_tables
  set reservation_status = 'reserved',
      reserved_customer_name = trim(customer_name_input),
      reserved_customer_email = lower(trim(customer_email_input)),
      reserved_customer_phone = trim(customer_phone_input),
      reserved_at = timezone('utc', now())
  where tenant_id = target_tenant_id
    and number = trim(table_number_input)
    and is_active = true
    and reservation_status = 'available'
  returning id, number into target_table_id, reserved_table_number;

  if target_table_id is null then
    raise exception 'Mesa indisponível para reserva.' using errcode = '23514';
  end if;

  insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
  values (
    target_tenant_id,
    null,
    'PUBLIC_TABLE_RESERVATION',
    'tenant_tables',
    target_table_id,
    jsonb_build_object(
      'table_number', reserved_table_number,
      'public_reservation', true
    )
  );

  return jsonb_build_object('table_number', reserved_table_number);
end;
$$;

revoke all on function public.create_public_table_reservation(text, text, text, text, text, text) from public;
grant execute on function public.create_public_table_reservation(text, text, text, text, text, text) to anon, authenticated;

create or replace function public.release_table_reservation(
  reservation_tenant_id uuid,
  reservation_table_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  released_table_id uuid;
begin
  if auth.uid() is null then
    raise exception 'ACESSO NEGADO: usuário não autenticado' using errcode = '42501';
  end if;

  if not public.current_user_has_tenant_role(reservation_tenant_id, ARRAY['owner','admin','manager']::public.tenant_role[]) then
    raise exception 'ACESSO NEGADO: apenas owner/admin/manager podem liberar reservas.' using errcode = '42501';
  end if;

  update public.tenant_tables
  set reservation_status = 'available',
      reserved_customer_name = null,
      reserved_customer_email = null,
      reserved_customer_phone = null,
      reserved_at = null
  where tenant_id = reservation_tenant_id
    and id = reservation_table_id
    and reservation_status = 'reserved'
  returning id into released_table_id;

  if released_table_id is null then
    raise exception 'Reserva não encontrada para liberação.' using errcode = '23514';
  end if;

  insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
  values (reservation_tenant_id, auth.uid(), 'RELEASE_TABLE_RESERVATION', 'tenant_tables', released_table_id, jsonb_build_object('pii_cleared', true));

  return released_table_id;
end;
$$;

revoke all on function public.release_table_reservation(uuid, uuid) from public;
grant execute on function public.release_table_reservation(uuid, uuid) to authenticated;
