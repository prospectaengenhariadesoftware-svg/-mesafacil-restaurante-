import { TableForm, TableList } from '@/components/catalog/table-manager';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { RestaurantTable } from '@/lib/types/catalog';
import { isUuid } from '@/lib/validation/auth';
import { redirect } from 'next/navigation';

export default async function MesasPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ mensagem?: string; erro?: string }>;
}>) {
  const { tenantId } = await params;
  const feedback = await searchParams;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  await requireActiveTenant(tenantId);

  const supabase = await createClient();
  const { data } = await supabase
    .from('tenant_tables')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('number', { ascending: true });

  return (
    <TenantModulePage tenantId={tenantId} module="mesas">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <TableForm tenantId={tenantId} />
        <TableList tables={(data ?? []) as RestaurantTable[]} />
      </div>
      {feedback.mensagem ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{feedback.mensagem}</p> : null}
      {feedback.erro ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{feedback.erro}</p> : null}
    </TenantModulePage>
  );
}
