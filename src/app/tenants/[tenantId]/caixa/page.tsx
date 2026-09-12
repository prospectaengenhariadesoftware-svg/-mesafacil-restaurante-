import { redirect } from 'next/navigation';
import { CashPanel, type CashOrderSummary } from '@/components/tenant/operational-panels';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/validation/auth';

export default async function CaixaPage({ params }: Readonly<{ params: Promise<{ tenantId: string }> }>) {
  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  await requireActiveTenant(tenantId);

  const supabase = await createClient();
  const { data: settingsData, error: settingsError } = await supabase
    .from('tenant_settings')
    .select('service_fee_basis_points')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (settingsError) redirect(`/tenants/${tenantId}?erro=${encodeURIComponent('Não foi possível carregar as configurações do caixa.')}`);

  const { data: paidRows, error: paidRowsError } = await supabase
    .from('tenant_cash_payment_orders')
    .select('order_id')
    .eq('tenant_id', tenantId);
  if (paidRowsError) redirect(`/tenants/${tenantId}?erro=${encodeURIComponent('Não foi possível conferir pagamentos já registrados.')}`);
  const paidOrderIds = new Set((paidRows ?? []).map((row) => row.order_id));

  const { data: ordersData, error: ordersError } = await supabase
    .from('tenant_customer_orders')
    .select('id, tenant_id, table_id, public_order_code, customer_name, status, total_cents, created_at')
    .eq('tenant_id', tenantId)
    .in('status', ['ready', 'delivered'])
    .order('created_at', { ascending: false })
    .limit(80);
  if (ordersError) redirect(`/tenants/${tenantId}?erro=${encodeURIComponent('Não foi possível carregar pedidos aptos para fechamento.')}`);

  const orders = ((ordersData ?? []) as Array<Omit<CashOrderSummary, 'table_number' | 'table_sector'>>)
    .filter((order) => !paidOrderIds.has(order.id));
  const tableIds = [...new Set(orders.map((order) => order.table_id))];
  const { data: tablesData, error: tablesError } = tableIds.length > 0
    ? await supabase.from('tenant_tables').select('id, number, sector').eq('tenant_id', tenantId).in('id', tableIds)
    : { data: [], error: null };
  if (tablesError) redirect(`/tenants/${tenantId}?erro=${encodeURIComponent('Não foi possível carregar as mesas do fechamento.')}`);

  const tablesById = new Map((tablesData ?? []).map((table) => [table.id, table]));
  const hydratedOrders: CashOrderSummary[] = orders.map((order) => {
    const table = tablesById.get(order.table_id);
    return {
      id: order.id,
      table_id: order.table_id,
      public_order_code: order.public_order_code,
      customer_name: order.customer_name,
      status: order.status,
      total_cents: order.total_cents,
      created_at: order.created_at,
      table_number: table?.number,
      table_sector: table?.sector,
    };
  });

  return (
    <TenantModulePage tenantId={tenantId} module="caixa">
      <CashPanel tenantId={tenantId} orders={hydratedOrders} serviceFeeBasisPoints={settingsData?.service_fee_basis_points ?? 0} />
    </TenantModulePage>
  );
}
