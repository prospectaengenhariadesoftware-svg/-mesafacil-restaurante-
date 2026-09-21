-- Enable Realtime notifications for the reservation center.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tenant_table_reservations'
  ) then
    alter publication supabase_realtime add table public.tenant_table_reservations;
  end if;
end $$;
