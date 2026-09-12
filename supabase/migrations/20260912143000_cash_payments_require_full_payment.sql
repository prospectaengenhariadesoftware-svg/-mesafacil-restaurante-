-- MesaFácil — require full payment for cashier settlement.
-- Partial payments are rejected until multi-installment settlement is implemented,
-- because each order can currently be linked to only one cash payment.

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
  remaining_due integer;
  payment_status text;
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
    raise exception 'Pagamento parcial ainda não é suportado nesta etapa.' using errcode = '22023';
  end if;

  change_due := greatest(0, requested_amount_paid_cents - total_due);
  remaining_due := greatest(0, total_due - requested_amount_paid_cents);
  payment_status := case when remaining_due = 0 then 'paid' else 'partial' end;
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

