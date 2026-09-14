import { redirect } from 'next/navigation';
import { DesignSystemShell } from '@/components/design-system/ds-shell';
import { OrdersPilotList, type OrdersPilotFilters } from '@/components/orders/orders-pilot-list';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { OrderStatus } from '@/lib/domain/order';
import type { TenantCustomerOrder, TenantCustomerOrderItem } from '@/lib/types/orders';
import { isUuid } from '@/lib/validation/auth';

const allowedStatus = new Set<OrderStatus>(['received', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']);

function normalizeSearch(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim().slice(0, 80) : '';
}

function normalizeStatus(value: string | string[] | undefined): OrdersPilotFilters['status'] {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && allowedStatus.has(raw as OrderStatus) ? raw as OrderStatus : 'all';
}

function matchesSearch(order: TenantCustomerOrder, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [
    order.public_order_code,
    order.customer_name ?? '',
    order.table_number ?? '',
    order.table_sector ?? '',
  ].some((value) => value.toLowerCase().includes(needle));
}

export default async function PedidosPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  await requireActiveTenant(tenantId);

  const query = await searchParams;
  const filters: OrdersPilotFilters = {
    status: normalizeStatus(query?.status),
    q: normalizeSearch(query?.q),
  };

  const supabase = await createClient();
  const { data: ordersData } = await supabase
    .from('tenant_customer_orders')
    .select('id, tenant_id, table_id, public_order_code, customer_name, customer_note, status, total_cents, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);

  const orders = (ordersData ?? []) as Omit<TenantCustomerOrder, 'items'>[];
  const orderIds = orders.map((order) => order.id);
  const tableIds = [...new Set(orders.map((order) => order.table_id))];

  const [{ data: itemsData }, { data: tablesData }] = await Promise.all([
    orderIds.length > 0
      ? supabase.from('tenant_customer_order_items').select('*').eq('tenant_id', tenantId).in('order_id', orderIds)
      : Promise.resolve({ data: [] }),
    tableIds.length > 0
      ? supabase.from('tenant_tables').select('id, number, sector').eq('tenant_id', tenantId).in('id', tableIds)
      : Promise.resolve({ data: [] }),
  ]);

  const items = (itemsData ?? []) as TenantCustomerOrderItem[];
  const tablesById = new Map((tablesData ?? []).map((table) => [table.id, table]));

  const hydratedOrders: TenantCustomerOrder[] = orders.map((order) => {
    const table = tablesById.get(order.table_id);
    return {
      ...order,
      table_number: table?.number,
      table_sector: table?.sector,
      items: items.filter((item) => item.order_id === order.id),
    };
  });

  const filteredOrders = hydratedOrders.filter((order) => {
    const statusMatch = filters.status === 'all' || order.status === filters.status;
    return statusMatch && matchesSearch(order, filters.q);
  });

  return (
    <DesignSystemShell tenantId={tenantId} activeModule="pedidos">
      <OrdersPilotList orders={filteredOrders} allOrders={hydratedOrders} tenantId={tenantId} filters={filters} />
    </DesignSystemShell>
  );
}
