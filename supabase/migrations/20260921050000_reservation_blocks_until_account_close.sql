-- MesaFácil — reservation lock follows table/account lifecycle, not exact date/time.
-- While a table has any active reservation, public booking for that table stays blocked until account close completes it.

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
          'reservation_status', case when exists (
            select 1
            from public.tenant_table_reservations active_reservation
            where active_reservation.tenant_id = tb.tenant_id
              and active_reservation.table_id = tb.id
              and active_reservation.status in ('pending','confirmed')
          ) then 'reserved' else 'available' end
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
    and tb.is_active = true
  for update;

  if target_table_id is null then
    raise exception 'Mesa indisponível para reserva.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.tenant_table_reservations existing
    where existing.tenant_id = target_tenant_id
      and existing.table_id = target_table_id
      and existing.status in ('pending','confirmed')
  ) then
    raise exception 'Mesa aguardando fechamento de conta para liberar nova reserva.' using errcode = '23505';
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
      'public_reservation', true,
      'release_policy', 'account_close'
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
    raise exception 'Mesa aguardando fechamento de conta para liberar nova reserva.' using errcode = '23505';
end;
$$;

revoke all on function public.create_public_table_reservation(text, text, text, text, text, timestamptz, integer, text) from public, anon, authenticated;
grant execute on function public.create_public_table_reservation(text, text, text, text, text, timestamptz, integer, text) to anon, authenticated;

create or replace function public.complete_current_table_reservation_on_paid_cash()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status <> 'paid' then
    return new;
  end if;

  with current_reservation as (
    select r.id
    from public.tenant_table_reservations r
    where r.tenant_id = new.tenant_id
      and r.table_id = new.table_id
      and r.status in ('pending','confirmed')
      -- Fecha/libera apenas a reserva operacionalmente atual; não derruba reservas futuras
      -- criadas antes desta política de bloqueio por mesa; nunca conclui reservas futuras.
      and r.scheduled_at <= timezone('utc', now())
      and r.scheduled_at >= timezone('utc', now()) - interval '12 hours'
    order by r.scheduled_at desc
    limit 1
  )
  update public.tenant_table_reservations r
  set status = 'completed',
      updated_at = timezone('utc', now())
  from current_reservation
  where r.id = current_reservation.id;

  return new;
end;
$$;

drop trigger if exists complete_current_table_reservation_after_cash_payment on public.tenant_cash_payments;
create trigger complete_current_table_reservation_after_cash_payment
after insert on public.tenant_cash_payments
for each row execute function public.complete_current_table_reservation_on_paid_cash();
