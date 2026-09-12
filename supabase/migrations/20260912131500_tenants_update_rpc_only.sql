-- MesaFácil — make restaurant profile settings writable only through audited RPCs for tenant owners/admins.

-- Existing policy allowed owner/admin direct table updates to public.tenants, bypassing settings RPC validation/audit.
drop policy if exists "tenants_update_owner_admin_or_platform_admin" on public.tenants;

create policy "tenants_update_platform_admin_only"
on public.tenants
for update
to authenticated
using (public.is_platform_super_admin(auth.uid()))
with check (public.is_platform_super_admin(auth.uid()));
