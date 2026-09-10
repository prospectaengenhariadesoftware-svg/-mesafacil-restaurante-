import { OrdersList } from '@/components/orders/orders-list';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { getKitchenVisibleStatuses } from '@/lib/domain/order';
import { createClient } from '@/lib/supabase/server';
import type { TenantCustomerOrder, TenantCustomerOrderItem } from '@/lib/types/orders';
import { isUuid } from '@/lib/validation/auth';
import { redirect } from 'next/navigation';

export default async function CozinhaPage({ params }: Readonly<{ params: Promise<{ tenantId: string }> }>) {
  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  await requireActiveTenant(tenantId);

  const supabase = await createClient();
  const visibleStatuses = getKitchenVisibleStatuses();
  const { data: ordersData } = await supabase
    .from('tenant_customer_orders')
    .select('id, tenant_id, table_id, public_order_code, customer_name, customer_note, status, total_cents, created_at')
    .eq('tenant_id', tenantId)
    .in('status', visibleStatuses)
    .order('created_at', { ascending: true })
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

  return (
    <TenantModulePage tenantId={tenantId} module="cozinha">
      <OrdersList
        orders={hydratedOrders}
        tenantId={tenantId}
        source="cozinha"
        title="Fila da cozinha"
        description="Pedidos confirmados, em preparo e prontos para entrega."
        emptyMessage="Nenhum pedido aguardando a cozinha."
      />
    </TenantModulePage>
  );
}
