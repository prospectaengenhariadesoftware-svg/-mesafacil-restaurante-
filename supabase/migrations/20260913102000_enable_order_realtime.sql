-- MesaFácil — enable Supabase Realtime for operational order panels.
-- The dashboard remains server-rendered; Realtime only triggers authenticated client refreshes.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tenant_customer_orders'
  ) then
    alter publication supabase_realtime add table public.tenant_customer_orders;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tenant_customer_order_items'
  ) then
    alter publication supabase_realtime add table public.tenant_customer_order_items;
  end if;
end $$;
