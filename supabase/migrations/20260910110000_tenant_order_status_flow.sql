-- MesaFácil — Operational order status flow
-- Protects status changes through a narrow RPC instead of free table updates.

revoke update on public.tenant_customer_orders from anon, authenticated;

drop policy if exists tenant_customer_orders_update_owner_admin_manager_ops
on public.tenant_customer_orders;

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
      updated_at = timezone('utc', now())
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
