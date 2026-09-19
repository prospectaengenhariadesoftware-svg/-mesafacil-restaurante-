import { redirect } from 'next/navigation';
import { DesignSystemShell } from '@/components/design-system/ds-shell';
import { KitchenBoard, type KitchenBoardFilters } from '@/components/kitchen/kitchen-board';
import { requireActiveTenant } from '@/lib/auth/context';
import { getKitchenVisibleStatuses, type OrderStatus } from '@/lib/domain/order';
import { createClient } from '@/lib/supabase/server';
import type { TenantCustomerOrder, TenantCustomerOrderItem } from '@/lib/types/orders';
import { isUuid } from '@/lib/validation/auth';

const allowedKitchenFilters = new Set(['all', 'confirmed', 'preparing', 'ready', 'late']);

function normalizeSearch(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim().slice(0, 80) : '';
}

function normalizeStatus(value: string | string[] | undefined): KitchenBoardFilters['status'] {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && allowedKitchenFilters.has(raw) ? raw as KitchenBoardFilters['status'] : 'all';
}

function normalizeSort(value: string | string[] | undefined): KitchenBoardFilters['sort'] {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'newest' ? 'newest' : 'oldest';
}

function todayStartIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function hydrateOrders(
  orders: Omit<TenantCustomerOrder, 'items'>[],
  items: TenantCustomerOrderItem[],
  tablesData: { id: string; number: string; sector: string | null }[],
): TenantCustomerOrder[] {
  const tablesById = new Map(tablesData.map((table) => [table.id, table]));
  return orders.map((order) => {
    const table = tablesById.get(order.table_id);
    return {
      ...order,
      table_number: table?.number,
      table_sector: table?.sector,
      items: items.filter((item) => item.order_id === order.id),
    };
  });
}

export default async function CozinhaPage({
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
  const filters: KitchenBoardFilters = {
    status: normalizeStatus(query?.status),
    q: normalizeSearch(query?.q),
    sort: normalizeSort(query?.sort),
  };

  const supabase = await createClient();
  const visibleStatuses = getKitchenVisibleStatuses();
  const [{ data: ordersData }, { data: deliveredData }] = await Promise.all([
    supabase
      .from('tenant_customer_orders')
      .select('id, tenant_id, table_id, public_order_code, customer_name, customer_note, status, total_cents, created_at')
      .eq('tenant_id', tenantId)
      .in('status', visibleStatuses)
      .order('created_at', { ascending: true })
      .limit(50),
    supabase
      .from('tenant_customer_orders')
      .select('id, tenant_id, table_id, public_order_code, customer_name, customer_note, status, total_cents, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'delivered' satisfies OrderStatus)
      .gte('created_at', todayStartIso())
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const kitchenOrders = (ordersData ?? []) as Omit<TenantCustomerOrder, 'items'>[];
  const deliveredOrders = (deliveredData ?? []) as Omit<TenantCustomerOrder, 'items'>[];
  const allOrders = [...kitchenOrders, ...deliveredOrders];
  const orderIds = allOrders.map((order) => order.id);
  const tableIds = [...new Set(allOrders.map((order) => order.table_id))];

  const [{ data: itemsData }, { data: tablesData }] = await Promise.all([
    orderIds.length > 0
      ? supabase.from('tenant_customer_order_items').select('*').eq('tenant_id', tenantId).in('order_id', orderIds)
      : Promise.resolve({ data: [] }),
    tableIds.length > 0
      ? supabase.from('tenant_tables').select('id, number, sector').eq('tenant_id', tenantId).in('id', tableIds)
      : Promise.resolve({ data: [] }),
  ]);

  const items = (itemsData ?? []) as TenantCustomerOrderItem[];
  const tables = (tablesData ?? []) as { id: string; number: string; sector: string | null }[];
  const hydratedKitchenOrders = hydrateOrders(kitchenOrders, items, tables);
  const hydratedDeliveredOrders = hydrateOrders(deliveredOrders, items, tables);

  return (
    <DesignSystemShell tenantId={tenantId} activeModule="cozinha">
      <KitchenBoard tenantId={tenantId} orders={hydratedKitchenOrders} deliveredToday={hydratedDeliveredOrders} filters={filters} />
    </DesignSystemShell>
  );
}
