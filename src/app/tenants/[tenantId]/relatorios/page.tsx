import { redirect } from 'next/navigation';
import { ReportsPanel, type ReportSummary } from '@/components/tenant/operational-panels';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/validation/auth';

export default async function RelatoriosPage({ params }: Readonly<{ params: Promise<{ tenantId: string }> }>) {
  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  await requireActiveTenant(tenantId);

  const supabase = await createClient();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();

  const [
    ordersToday,
    deliveredToday,
    cancelledToday,
    openOrders,
    categories,
    products,
    availableProducts,
    tables,
    activeTables,
  ] = await Promise.all([
    supabase.from('tenant_customer_orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', todayIso),
    supabase.from('tenant_customer_orders').select('total_cents').eq('tenant_id', tenantId).eq('status', 'delivered').gte('created_at', todayIso),
    supabase.from('tenant_customer_orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'cancelled').gte('created_at', todayIso),
    supabase.from('tenant_customer_orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['received', 'confirmed', 'preparing', 'ready']),
    supabase.from('tenant_product_categories').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_available', true),
    supabase.from('tenant_tables').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_tables').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true),
  ]);

  const deliveredRows = (deliveredToday.data ?? []) as Array<{ total_cents: number }>;
  const summary: ReportSummary = {
    ordersToday: ordersToday.count ?? 0,
    revenueTodayCents: deliveredRows.reduce((sum, row) => sum + row.total_cents, 0),
    openOrders: openOrders.count ?? 0,
    deliveredOrders: deliveredRows.length,
    cancelledOrders: cancelledToday.count ?? 0,
    categories: categories.count ?? 0,
    products: products.count ?? 0,
    availableProducts: availableProducts.count ?? 0,
    tables: tables.count ?? 0,
    activeTables: activeTables.count ?? 0,
  };

  return (
    <TenantModulePage tenantId={tenantId} module="relatorios">
      <ReportsPanel summary={summary} />
    </TenantModulePage>
  );
}
