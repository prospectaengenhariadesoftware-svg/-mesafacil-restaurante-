-- MesaFácil — Order timing metrics and full cash settlement guard
-- Records real transition timestamps used by operational reports.

alter table public.tenant_customer_orders
  add column if not exists confirmed_at timestamptz,
  add column if not exists preparing_at timestamptz,
  add column if not exists ready_at timestamptz,
  add column if not exists delivered_at timestamptz;

create index if not exists idx_tenant_customer_orders_tenant_preparing_at
on public.tenant_customer_orders(tenant_id, preparing_at desc)
where preparing_at is not null;

create index if not exists idx_tenant_customer_orders_tenant_ready_at
on public.tenant_customer_orders(tenant_id, ready_at desc)
where ready_at is not null;

create index if not exists idx_tenant_customer_orders_tenant_delivered_at
on public.tenant_customer_orders(tenant_id, delivered_at desc)
where delivered_at is not null;

create or replace function public.advance_tenant_customer_order_status(
  target_tenant_id uuid,
  target_order_id uuid,
  requested_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  order_record record;
  next_status text;
  transition_at timestamptz := timezone('utc', now());
begin
  if not public.current_user_has_tenant_role(
    target_tenant_id,
    array['owner','admin','manager','waiter','attendant','kitchen']::public.tenant_role[]
  ) then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select id, tenant_id, public_order_code, status, total_cents
  into order_record
  from public.tenant_customer_orders
  where id = target_order_id
    and tenant_id = target_tenant_id
  for update;

  if order_record is null then
    raise exception 'Pedido não encontrado.' using errcode = '22023';
  end if;

  if requested_status = 'cancelled' then
    if order_record.status in ('delivered', 'cancelled') then
      raise exception 'Pedido finalizado não pode ser cancelado.' using errcode = '22023';
    end if;
    next_status := 'cancelled';
  else
    next_status := case order_record.status
      when 'received' then 'confirmed'
      when 'confirmed' then 'preparing'
      when 'preparing' then 'ready'
      when 'ready' then 'delivered'
      else order_record.status
    end;
  end if;

  if next_status = order_record.status then
    raise exception 'Pedido já está em status final.' using errcode = '22023';
  end if;

  update public.tenant_customer_orders
  set status = next_status,
      updated_at = transition_at,
      confirmed_at = case when next_status in ('confirmed','preparing','ready','delivered') and confirmed_at is null then transition_at else confirmed_at end,
      preparing_at = case when next_status in ('preparing','ready','delivered') and preparing_at is null then transition_at else preparing_at end,
      ready_at = case when next_status in ('ready','delivered') and ready_at is null then transition_at else ready_at end,
      delivered_at = case when next_status = 'delivered' and delivered_at is null then transition_at else delivered_at end
  where id = target_order_id
    and tenant_id = target_tenant_id;

  return jsonb_build_object(
    'public_order_code', order_record.public_order_code,
    'status', next_status,
    'total_cents', order_record.total_cents
  );
end;
$$;

revoke all on function public.advance_tenant_customer_order_status(uuid, uuid, text) from public;
grant execute on function public.advance_tenant_customer_order_status(uuid, uuid, text) to authenticated;

create or replace function public.close_tenant_cash_payment(
  target_tenant_id uuid,
  target_table_id uuid,
  target_order_ids uuid[],
  requested_payment_method text,
  requested_discount_cents integer default 0,
  requested_amount_paid_cents integer default 0,
  requested_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_count integer;
  selected_subtotal integer;
  service_fee_bps integer;
  service_fee integer;
  total_due integer;
  change_due integer;
  remaining_due integer := 0;
  payment_status text := 'paid';
  new_payment_id uuid;
  generated_code text;
begin
  if auth.uid() is null then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  if not public.current_user_has_tenant_role(
    target_tenant_id,
    array['owner','admin','manager','cashier']::public.tenant_role[]
  ) then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  if target_order_ids is null or array_length(target_order_ids, 1) is null then
    raise exception 'Selecione pelo menos um pedido para fechar.' using errcode = '22023';
  end if;

  if requested_payment_method not in ('money','pix','debit','credit','other') then
    raise exception 'Forma de pagamento inválida.' using errcode = '22023';
  end if;

  if requested_discount_cents is null or requested_discount_cents < 0 then
    raise exception 'Desconto inválido.' using errcode = '22023';
  end if;

  if requested_amount_paid_cents is null or requested_amount_paid_cents <= 0 then
    raise exception 'Valor pago inválido.' using errcode = '22023';
  end if;

  perform 1
  from public.tenant_tables tt
  where tt.id = target_table_id
    and tt.tenant_id = target_tenant_id
  for update;

  if not found then
    raise exception 'Mesa não encontrada.' using errcode = '22023';
  end if;

  with selected_orders as (
    select o.id, o.total_cents
    from public.tenant_customer_orders o
    where o.tenant_id = target_tenant_id
      and o.table_id = target_table_id
      and o.id = any(target_order_ids)
      and o.status in ('ready','delivered')
      and not exists (
        select 1 from public.tenant_cash_payment_orders paid
        where paid.order_id = o.id
      )
    for update
  )
  select count(*), coalesce(sum(total_cents), 0)
  into selected_count, selected_subtotal
  from selected_orders;

  if selected_count <> array_length(target_order_ids, 1) then
    raise exception 'Há pedido inválido, cancelado, aberto, duplicado ou já pago.' using errcode = '22023';
  end if;

  if selected_subtotal <= 0 then
    raise exception 'Subtotal inválido.' using errcode = '22023';
  end if;

  if requested_discount_cents > selected_subtotal then
    raise exception 'Desconto maior que o subtotal.' using errcode = '22023';
  end if;

  select coalesce(service_fee_basis_points, 0)
  into service_fee_bps
  from public.tenant_settings
  where tenant_id = target_tenant_id;

  service_fee_bps := coalesce(service_fee_bps, 0);
  service_fee := round(selected_subtotal * service_fee_bps / 10000.0)::integer;
  total_due := greatest(0, selected_subtotal + service_fee - requested_discount_cents);

  if requested_amount_paid_cents < total_due then
    raise exception 'Valor pago menor que o total da conta.' using errcode = '22023';
  end if;

  change_due := greatest(0, requested_amount_paid_cents - total_due);
  generated_code := 'CX-' || to_char(timezone('utc', now()), 'HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  insert into public.tenant_cash_payments (
    tenant_id,
    table_id,
    payment_code,
    payment_method,
    subtotal_cents,
    service_fee_basis_points,
    service_fee_cents,
    discount_cents,
    total_due_cents,
    amount_paid_cents,
    change_cents,
    remaining_cents,
    status,
    notes,
    created_by
  ) values (
    target_tenant_id,
    target_table_id,
    generated_code,
    requested_payment_method,
    selected_subtotal,
    service_fee_bps,
    service_fee,
    requested_discount_cents,
    total_due,
    requested_amount_paid_cents,
    change_due,
    remaining_due,
    payment_status,
    nullif(left(trim(coalesce(requested_notes, '')), 300), ''),
    auth.uid()
  ) returning id into new_payment_id;

  insert into public.tenant_cash_payment_orders (payment_id, tenant_id, order_id, order_total_cents)
  select new_payment_id, target_tenant_id, o.id, o.total_cents
  from public.tenant_customer_orders o
  where o.tenant_id = target_tenant_id
    and o.table_id = target_table_id
    and o.id = any(target_order_ids)
    and o.status in ('ready','delivered');

  insert into public.audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
  values (
    target_tenant_id,
    auth.uid(),
    'CLOSE_CASH_PAYMENT',
    'tenant_cash_payment',
    new_payment_id,
    jsonb_build_object(
      'table_id', target_table_id,
      'order_count', selected_count,
      'payment_method', requested_payment_method,
      'status', payment_status,
      'total_due_cents', total_due,
      'amount_paid_cents', requested_amount_paid_cents
    )
  );

  return jsonb_build_object(
    'payment_id', new_payment_id,
    'payment_code', generated_code,
    'status', payment_status,
    'subtotal_cents', selected_subtotal,
    'service_fee_basis_points', service_fee_bps,
    'service_fee_cents', service_fee,
    'discount_cents', requested_discount_cents,
    'total_due_cents', total_due,
    'amount_paid_cents', requested_amount_paid_cents,
    'change_cents', change_due,
    'remaining_cents', remaining_due
  );
end;
$$;

revoke all on function public.close_tenant_cash_payment(uuid, uuid, uuid[], text, integer, integer, text) from public;
grant execute on function public.close_tenant_cash_payment(uuid, uuid, uuid[], text, integer, integer, text) to authenticated;
