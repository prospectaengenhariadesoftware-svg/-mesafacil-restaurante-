import { redirect } from 'next/navigation';
import { ReportsPanel } from '@/components/tenant/operational-panels';
import { buildOperationalReport, type ReportItemRow, type ReportOrderRow, type ReportPaymentRow } from '@/lib/domain/reports';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/validation/auth';

const REPORT_ROW_LIMIT = 10000;

type CountedRows<T> = {
  data: T[] | null;
  count: number | null;
};

function requireCompleteRows<T>(tenantId: string, result: CountedRows<T>, label: string): T[] {
  const rows = result.data ?? [];
  if (result.count === null || rows.length !== result.count) {
    redirect(`/tenants/${tenantId}?erro=${encodeURIComponent(`Relatório incompleto: ${label}.`)}`);
  }
  return rows;
}

export default async function RelatoriosPage({ params }: Readonly<{ params: Promise<{ tenantId: string }> }>) {
  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  await requireActiveTenant(tenantId);

  const supabase = await createClient();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();

  const [ordersResult, paymentsResult, openOrdersResult, categories, products, availableProducts, tables, activeTables] = await Promise.all([
    supabase
      .from('tenant_customer_orders')
      .select('id, status, total_cents, created_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .gte('created_at', todayIso)
      .range(0, REPORT_ROW_LIMIT - 1),
    supabase
      .from('tenant_cash_payments')
      .select('id, payment_method, total_due_cents, amount_paid_cents, change_cents, created_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('created_at', todayIso)
      .range(0, REPORT_ROW_LIMIT - 1),
    supabase
      .from('tenant_customer_orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['received', 'confirmed', 'preparing', 'ready']),
    supabase.from('tenant_product_categories').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_available', true),
    supabase.from('tenant_tables').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_tables').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true),
  ]);

  const firstError = [ordersResult, paymentsResult, openOrdersResult, categories, products, availableProducts, tables, activeTables].find((result) => result.error)?.error;
  if (firstError) redirect(`/tenants/${tenantId}?erro=${encodeURIComponent('Não foi possível carregar os relatórios do tenant.')}`);

  const orders = requireCompleteRows<ReportOrderRow>(tenantId, ordersResult, 'pedidos do dia');
  const payments = requireCompleteRows<ReportPaymentRow>(tenantId, paymentsResult, 'pagamentos do dia');
  const paidPaymentIds = payments.map((payment) => payment.id);

  const paymentOrdersResult = paidPaymentIds.length > 0
    ? await supabase
      .from('tenant_cash_payment_orders')
      .select('payment_id, order_id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .in('payment_id', paidPaymentIds)
      .range(0, REPORT_ROW_LIMIT - 1)
    : { data: [], count: 0, error: null };
  if (paymentOrdersResult.error) redirect(`/tenants/${tenantId}?erro=${encodeURIComponent('Não foi possível carregar os vínculos de pagamento.')}`);

  const paymentOrderRows = requireCompleteRows<{ payment_id: string; order_id: string }>(tenantId, paymentOrdersResult, 'vínculos de pagamento');
  const orderIdsByPaymentId = new Map<string, string[]>();
  for (const row of paymentOrderRows) {
    const current = orderIdsByPaymentId.get(row.payment_id) ?? [];
    current.push(row.order_id);
    orderIdsByPaymentId.set(row.payment_id, current);
  }
  const paidOrderIds = Array.from(new Set(Array.from(orderIdsByPaymentId.values()).flat()));

  const itemsResult = paidOrderIds.length > 0
    ? await supabase
      .from('tenant_customer_order_items')
      .select('order_id, product_id, product_name, quantity, line_total_cents', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .in('order_id', paidOrderIds)
      .range(0, REPORT_ROW_LIMIT - 1)
    : { data: [], count: 0, error: null };
  if (itemsResult.error) redirect(`/tenants/${tenantId}?erro=${encodeURIComponent('Não foi possível carregar os itens vendidos.')}`);

  const summary = buildOperationalReport({
    orders,
    payments: payments.map((payment) => ({
      ...payment,
      order_ids: orderIdsByPaymentId.get(payment.id) ?? [],
    })),
    items: requireCompleteRows<ReportItemRow>(tenantId, itemsResult, 'itens vendidos'),
    catalog: {
      categories: categories.count ?? 0,
      products: products.count ?? 0,
      availableProducts: availableProducts.count ?? 0,
      tables: tables.count ?? 0,
      activeTables: activeTables.count ?? 0,
    },
    openOrdersCount: openOrdersResult.count ?? 0,
  });

  return (
    <TenantModulePage tenantId={tenantId} module="relatorios">
      <ReportsPanel summary={summary} />
    </TenantModulePage>
  );
}
