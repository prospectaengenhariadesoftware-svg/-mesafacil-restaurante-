-- MesaFácil — order Realtime publication verification.

do $$
declare
  missing_tables text;
begin
  with expected(tablename) as (
    values
      ('tenant_customer_orders'),
      ('tenant_customer_order_items')
  ), missing as (
    select expected.tablename
    from expected
    left join pg_publication_tables published
      on published.pubname = 'supabase_realtime'
     and published.schemaname = 'public'
     and published.tablename = expected.tablename
    where published.tablename is null
  )
  select string_agg(tablename, ', ')
  into missing_tables
  from missing;

  if missing_tables is not null then
    raise exception 'Realtime publication missing order table(s): %', missing_tables;
  end if;
end $$;

select 'order realtime publication tests passed' as result;
