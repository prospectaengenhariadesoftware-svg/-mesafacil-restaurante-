-- MesaFácil — tenant cash settlement/payments.
-- Records real cashier payments and prevents duplicate/cross-tenant order settlement.

create table if not exists public.tenant_cash_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  table_id uuid not null references public.tenant_tables(id) on delete restrict,
  payment_code text not null,
  payment_method text not null,
  subtotal_cents integer not null,
  service_fee_basis_points integer not null default 0,
  service_fee_cents integer not null default 0,
  discount_cents integer not null default 0,
  total_due_cents integer not null,
  amount_paid_cents integer not null,
  change_cents integer not null default 0,
  remaining_cents integer not null default 0,
  status text not null default 'paid',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint tenant_cash_payments_method_check check (payment_method in ('money','pix','debit','credit','other')),
  constraint tenant_cash_payments_status_check check (status in ('partial','paid','voided')),
  constraint tenant_cash_payments_amounts_check check (
    subtotal_cents > 0
    and service_fee_basis_points between 0 and 10000
    and service_fee_cents >= 0
    and discount_cents >= 0
    and total_due_cents >= 0
    and amount_paid_cents > 0
    and change_cents >= 0
    and remaining_cents >= 0
  ),
  constraint tenant_cash_payments_notes_len check (notes is null or char_length(notes) <= 300),
  constraint tenant_cash_payments_code_unique unique (tenant_id, payment_code)
);

create table if not exists public.tenant_cash_payment_orders (
  payment_id uuid not null references public.tenant_cash_payments(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_id uuid not null references public.tenant_customer_orders(id) on delete restrict,
  order_total_cents integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (payment_id, order_id),
  constraint tenant_cash_payment_orders_total_check check (order_total_cents > 0),
  constraint tenant_cash_payment_orders_order_unique unique (order_id)
);

alter table public.tenant_cash_payments
  add constraint tenant_cash_payments_id_tenant_unique unique (id, tenant_id);

alter table public.tenant_cash_payment_orders
  add constraint tenant_cash_payment_orders_payment_same_tenant
  foreign key (payment_id, tenant_id)
  references public.tenant_cash_payments(id, tenant_id)
  on delete cascade;

alter table public.tenant_cash_payment_orders
  add constraint tenant_cash_payment_orders_order_same_tenant
  foreign key (order_id, tenant_id)
  references public.tenant_customer_orders(id, tenant_id)
  on delete restrict;

alter table public.tenant_tables
  add constraint tenant_tables_id_tenant_unique unique (id, tenant_id);

alter table public.tenant_cash_payments
  add constraint tenant_cash_payments_table_same_tenant
  foreign key (table_id, tenant_id)
  references public.tenant_tables(id, tenant_id)
  on delete restrict;

create index if not exists idx_tenant_cash_payments_tenant_created on public.tenant_cash_payments(tenant_id, created_at desc);
create index if not exists idx_tenant_cash_payments_table on public.tenant_cash_payments(tenant_id, table_id, created_at desc);
create index if not exists idx_tenant_cash_payment_orders_order on public.tenant_cash_payment_orders(order_id);

alter table public.tenant_cash_payments enable row level security;
alter table public.tenant_cash_payments force row level security;
alter table public.tenant_cash_payment_orders enable row level security;
alter table public.tenant_cash_payment_orders force row level security;

drop policy if exists tenant_cash_payments_select_own_tenant on public.tenant_cash_payments;
create policy tenant_cash_payments_select_own_tenant
on public.tenant_cash_payments
for select
to authenticated
using (public.current_user_has_tenant_access(tenant_id));

drop policy if exists tenant_cash_payment_orders_select_own_tenant on public.tenant_cash_payment_orders;
create policy tenant_cash_payment_orders_select_own_tenant
on public.tenant_cash_payment_orders
for select
to authenticated
using (public.current_user_has_tenant_access(tenant_id));

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
