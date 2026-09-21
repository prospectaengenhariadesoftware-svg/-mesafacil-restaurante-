-- MesaFácil — reservation Realtime publication verification.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tenant_table_reservations'
  ) then
    raise exception 'Realtime publication missing reservation table: tenant_table_reservations';
  end if;
end $$;

select 'reservation realtime publication tests passed' as result;
