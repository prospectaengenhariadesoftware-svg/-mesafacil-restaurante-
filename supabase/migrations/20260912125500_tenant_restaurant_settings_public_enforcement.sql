-- MesaFácil — enforce restaurant operational settings in public QR flows and close direct settings writes.

-- Keep settings readable through RLS, but make the audited RPC the only authenticated write path.
drop policy if exists "tenant_settings_insert_owner_admin" on public.tenant_settings;
drop policy if exists "tenant_settings_update_owner_admin" on public.tenant_settings;
drop policy if exists "tenant_settings_delete_owner" on public.tenant_settings;

-- Additional tenant profile constraints used by the SECURITY DEFINER settings RPC.
alter table public.tenants
  add constraint tenants_legal_name_len check (legal_name is null or char_length(legal_name) <= 160) not valid;
alter table public.tenants
  add constraint tenants_document_len check (document is null or char_length(document) <= 32) not valid;
alter table public.tenants
  add constraint tenants_phone_len check (phone is null or char_length(phone) <= 32) not valid;
alter table public.tenants
  add constraint tenants_email_format check (email is null or email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$') not valid;

create or replace function public.update_tenant_configuration(
  config_tenant_id uuid,
  config_name text,
  config_legal_name text,
  config_document text,
  config_email text,
  config_phone text,
  config_public_slug text,
  config_public_description text,
  config_address_line text,
  config_city text,
  config_state text,
  config_accepts_qr_orders boolean,
  config_service_fee_basis_points integer,
  config_estimated_prep_minutes integer,
  config_operating_status text,
  config_public_notice text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_slug text;
  settings_id uuid;
  normalized_email text;
  normalized_state text;
begin
  if auth.uid() is null then
    raise exception 'ACESSO NEGADO: usuário não autenticado' using errcode = '42501';
  end if;

  if not public.current_user_has_tenant_role(config_tenant_id, ARRAY['owner','admin']::public.tenant_role[]) then
    raise exception 'ACESSO NEGADO: apenas owner/admin podem editar configurações.' using errcode = '42501';
  end if;

  if char_length(trim(coalesce(config_name, ''))) < 3 or char_length(trim(coalesce(config_name, ''))) > 120 then
    raise exception 'Nome do restaurante inválido' using errcode = '23514';
  end if;

  if config_legal_name is not null and char_length(trim(config_legal_name)) > 160 then
    raise exception 'Razão social inválida' using errcode = '23514';
  end if;
  if config_document is not null and char_length(trim(config_document)) > 32 then
    raise exception 'Documento inválido' using errcode = '23514';
  end if;
  if config_phone is not null and char_length(trim(config_phone)) > 32 then
    raise exception 'Telefone inválido' using errcode = '23514';
  end if;

  normalized_email := nullif(lower(trim(coalesce(config_email, ''))), '');
  if normalized_email is not null and normalized_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'E-mail inválido' using errcode = '23514';
  end if;

  normalized_slug := public.slugify_public(config_public_slug);
  if char_length(normalized_slug) < 3 or char_length(normalized_slug) > 80 or normalized_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Slug público inválido' using errcode = '23514';
  end if;

  normalized_state := nullif(upper(trim(coalesce(config_state, ''))), '');
  if normalized_state is not null and normalized_state !~ '^[A-Z]{2}$' then
    raise exception 'UF inválida' using errcode = '23514';
  end if;
  if config_public_description is not null and char_length(trim(config_public_description)) > 280 then
    raise exception 'Descrição pública inválida' using errcode = '23514';
  end if;
  if config_address_line is not null and char_length(trim(config_address_line)) > 180 then
    raise exception 'Endereço inválido' using errcode = '23514';
  end if;
  if config_city is not null and char_length(trim(config_city)) > 80 then
    raise exception 'Cidade inválida' using errcode = '23514';
  end if;
  if config_service_fee_basis_points is null or config_service_fee_basis_points < 0 or config_service_fee_basis_points > 10000 then
    raise exception 'Taxa de serviço inválida' using errcode = '23514';
  end if;
  if config_estimated_prep_minutes is not null and (config_estimated_prep_minutes < 1 or config_estimated_prep_minutes > 240) then
    raise exception 'Tempo estimado inválido' using errcode = '23514';
  end if;
  if config_operating_status not in ('open', 'closed', 'paused') then
    raise exception 'Status operacional inválido' using errcode = '23514';
  end if;
  if config_public_notice is not null and char_length(trim(config_public_notice)) > 220 then
    raise exception 'Mensagem pública inválida' using errcode = '23514';
  end if;

  update public.tenants
  set name = trim(config_name),
      legal_name = nullif(trim(coalesce(config_legal_name, '')), ''),
      document = nullif(trim(coalesce(config_document, '')), ''),
      email = normalized_email,
      phone = nullif(trim(coalesce(config_phone, '')), ''),
      public_slug = normalized_slug,
      updated_by = auth.uid()
  where id = config_tenant_id
  returning id into config_tenant_id;

  if config_tenant_id is null then
    raise exception 'Restaurante não encontrado ou sem permissão.' using errcode = '42501';
  end if;

  insert into public.tenant_settings (
    tenant_id, public_description, address_line, city, state, accepts_qr_orders,
    service_fee_basis_points, estimated_prep_minutes, operating_status, public_notice, created_by, updated_by
  ) values (
    config_tenant_id,
    nullif(trim(coalesce(config_public_description, '')), ''),
    nullif(trim(coalesce(config_address_line, '')), ''),
    nullif(trim(coalesce(config_city, '')), ''),
    normalized_state,
    config_accepts_qr_orders,
    config_service_fee_basis_points,
    config_estimated_prep_minutes,
    config_operating_status,
    nullif(trim(coalesce(config_public_notice, '')), ''),
    auth.uid(),
    auth.uid()
  )
  on conflict (tenant_id) do update
    set public_description = excluded.public_description,
        address_line = excluded.address_line,
        city = excluded.city,
        state = excluded.state,
        accepts_qr_orders = excluded.accepts_qr_orders,
        service_fee_basis_points = excluded.service_fee_basis_points,
        estimated_prep_minutes = excluded.estimated_prep_minutes,
        operating_status = excluded.operating_status,
        public_notice = excluded.public_notice,
        updated_by = auth.uid(),
        updated_at = timezone('utc', now())
  returning id into settings_id;

  return settings_id;
end;
$$;

create or replace function public.get_public_menu_by_qr(menu_slug text, menu_qr_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'tenant', jsonb_build_object(
      'name', t.name,
      'public_slug', t.public_slug,
      'public_description', s.public_description,
      'operating_status', coalesce(s.operating_status, 'open'),
      'accepts_qr_orders', coalesce(s.accepts_qr_orders, true),
      'public_notice', s.public_notice,
      'service_fee_basis_points', coalesce(s.service_fee_basis_points, 0),
      'estimated_prep_minutes', s.estimated_prep_minutes
    ),
    'table', jsonb_build_object(
      'number', tb.number,
      'seats', tb.seats,
      'sector', tb.sector
    ),
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'name', c.name,
          'description', c.description,
          'products', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'public_code', p.public_code,
                'name', p.name,
                'description', p.description,
                'price_cents', p.price_cents,
                'image_url', p.image_url,
                'is_available', p.is_available
              )
              order by p.name
            )
            from public.tenant_products p
            where p.tenant_id = t.id
              and p.category_id = c.id
              and p.is_available = true
          ), '[]'::jsonb)
        )
        order by c.display_order, c.name
      )
      from public.tenant_product_categories c
      where c.tenant_id = t.id
        and c.is_active = true
    ), '[]'::jsonb)
  ) into result
  from public.tenants t
  join public.tenant_tables tb on tb.tenant_id = t.id
  left join public.tenant_settings s on s.tenant_id = t.id
  where t.public_slug = menu_slug
    and t.status in ('active', 'trialing')
    and coalesce(s.accepts_qr_orders, true) = true
    and coalesce(s.operating_status, 'open') = 'open'
    and tb.qr_token = menu_qr_token
    and tb.is_active = true;

  return result;
end;
$$;

create or replace function public.create_public_order_by_qr(
  menu_slug text,
  menu_qr_token uuid,
  customer_name_input text,
  customer_note_input text,
  order_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tenant_record record;
  new_order_id uuid;
  generated_code text;
  item jsonb;
  item_product record;
  item_quantity integer;
  item_notes text;
  item_public_code text;
  computed_total integer := 0;
  inserted_count integer := 0;
begin
  if order_items is null or jsonb_typeof(order_items) <> 'array' or jsonb_array_length(order_items) = 0 then
    raise exception 'Selecione pelo menos um produto.' using errcode = '22023';
  end if;

  select t.id as tenant_id, tb.id as table_id, tb.number as table_number
  into tenant_record
  from public.tenants t
  join public.tenant_tables tb on tb.tenant_id = t.id
  left join public.tenant_settings s on s.tenant_id = t.id
  where t.public_slug = menu_slug
    and t.status in ('active', 'trialing')
    and coalesce(s.accepts_qr_orders, true) = true
    and coalesce(s.operating_status, 'open') = 'open'
    and tb.qr_token = menu_qr_token
    and tb.is_active = true;

  if tenant_record is null then
    raise exception 'Cardápio indisponível.' using errcode = '22023';
  end if;

  generated_code := to_char(timezone('utc', now()), 'HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  insert into public.tenant_customer_orders (
    tenant_id, table_id, public_order_code, customer_name, customer_note, status, total_cents
  ) values (
    tenant_record.tenant_id,
    tenant_record.table_id,
    generated_code,
    nullif(trim(customer_name_input), ''),
    nullif(left(trim(coalesce(customer_note_input, '')), 300), ''),
    'received',
    0
  ) returning id into new_order_id;

  for item in select * from jsonb_array_elements(order_items) loop
    item_public_code := nullif(trim(coalesce(item->>'product_code', '')), '');
    if item_public_code is null or item_public_code !~ '^[A-Z0-9]{8,32}$' then
      raise exception 'Produto indisponível.' using errcode = '22023';
    end if;

    if (item->>'quantity') !~ '^[0-9]{1,2}$' then
      raise exception 'Quantidade inválida.' using errcode = '22023';
    end if;
    item_quantity := (item->>'quantity')::integer;
    if item_quantity < 1 or item_quantity > 99 then
      raise exception 'Quantidade inválida.' using errcode = '22023';
    end if;

    select id, name, price_cents
    into item_product
    from public.tenant_products
    where public_code = item_public_code
      and tenant_id = tenant_record.tenant_id
      and is_available = true;

    if item_product is null then
      raise exception 'Produto indisponível.' using errcode = '22023';
    end if;

    item_notes := nullif(left(trim(coalesce(item->>'notes', '')), 200), '');

    insert into public.tenant_customer_order_items (
      tenant_id, order_id, product_id, product_name, unit_price_cents, quantity, notes
    ) values (
      tenant_record.tenant_id,
      new_order_id,
      item_product.id,
      item_product.name,
      item_product.price_cents,
      item_quantity,
      item_notes
    );

    computed_total := computed_total + (item_product.price_cents * item_quantity);
    inserted_count := inserted_count + 1;
  end loop;

  if inserted_count = 0 then
    raise exception 'Selecione pelo menos um produto.' using errcode = '22023';
  end if;

  update public.tenant_customer_orders
  set total_cents = computed_total
  where id = new_order_id;

  return jsonb_build_object(
    'public_order_code', generated_code,
    'table_number', tenant_record.table_number,
    'status', 'received',
    'total_cents', computed_total
  );
end;
$$;

revoke all on function public.get_public_menu_by_qr(text, uuid) from public;
grant execute on function public.get_public_menu_by_qr(text, uuid) to anon, authenticated;
revoke all on function public.create_public_order_by_qr(text, uuid, text, text, jsonb) from public;
grant execute on function public.create_public_order_by_qr(text, uuid, text, text, jsonb) to anon, authenticated;
