import { OrdersList } from '@/components/orders/orders-list';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { getKitchenVisibleStatuses } from '@/lib/domain/order';
import { createClient } from '@/lib/supabase/server';
import type { TenantCustomerOrder, TenantCustomerOrderItem } from '@/lib/types/orders';
import { isUuid } from '@/lib/validation/auth';
import { redirect } from 'next/navigation';

type KitchenStatus = 'confirmed' | 'preparing' | 'ready';

const kitchenLanes: Array<{
  status: KitchenStatus;
  label: string;
  description: string;
  accent: string;
  valueClass: string;
}> = [
  {
    status: 'confirmed',
    label: 'Confirmados',
    description: 'Entraram na fila e precisam começar o preparo.',
    accent: 'border-indigo-100 bg-indigo-50 text-indigo-900',
    valueClass: 'text-indigo-950',
  },
  {
    status: 'preparing',
    label: 'Em preparo',
    description: 'Comandas já em produção na cozinha.',
    accent: 'border-amber-100 bg-amber-50 text-amber-950',
    valueClass: 'text-amber-950',
  },
  {
    status: 'ready',
    label: 'Prontos',
    description: 'Pedidos aguardando entrega/retirada.',
    accent: 'border-red-100 bg-red-50 text-red-900',
    valueClass: 'text-red-950',
  },
];

function minutesSince(value: string): number {
  const created = new Date(value).getTime();
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 60000));
}

function oldestOrderLabel(orders: TenantCustomerOrder[]): string {
  if (orders.length === 0) return 'Sem comanda nesta etapa';
  const oldest = orders.reduce((currentOldest, order) => (new Date(order.created_at) < new Date(currentOldest.created_at) ? order : currentOldest), orders[0]);
  return `Mais antiga: Mesa ${oldest.table_number ?? '—'} • ${minutesSince(oldest.created_at)} min`;
}

function KitchenProductionSummary({ orders }: Readonly<{ orders: TenantCustomerOrder[] }>) {
  const visibleOrders = orders.filter((order) => kitchenLanes.some((lane) => lane.status === order.status));
  const totalItems = visibleOrders.reduce((sum, order) => sum + order.items.reduce((orderSum, item) => orderSum + item.quantity, 0), 0);
  const oldestMinutes = visibleOrders.length > 0 ? Math.max(...visibleOrders.map((order) => minutesSince(order.created_at))) : 0;

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-red-700 via-red-600 to-red-800 p-5 text-white sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white">Painel da cozinha</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Fila de produção</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white">Comandas confirmadas, em preparo e prontas para entrega. A tela abaixo mantém as ações reais de avanço do pedido.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
              <div className="rounded-3xl border border-white/25 bg-white/15 p-3 backdrop-blur">
                <p className="text-2xl font-black">{visibleOrders.length}</p>
                <p className="text-xs font-bold">comandas</p>
              </div>
              <div className="rounded-3xl border border-white/25 bg-white/15 p-3 backdrop-blur">
                <p className="text-2xl font-black">{totalItems}</p>
                <p className="text-xs font-bold">itens</p>
              </div>
              <div className="col-span-2 rounded-3xl border border-white/25 bg-white/15 p-3 backdrop-blur sm:col-span-1">
                <p className="text-2xl font-black">{oldestMinutes}</p>
                <p className="text-xs font-bold">min mais antigo</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-3 sm:p-5">
          {kitchenLanes.map((lane) => {
            const laneOrders = visibleOrders.filter((order) => order.status === lane.status);
            return (
              <article key={lane.status} className={`rounded-3xl border p-4 ${lane.accent}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em]">{lane.label}</p>
                    <p className={`mt-2 text-4xl font-black ${lane.valueClass}`}>{laneOrders.length}</p>
                  </div>
                  <span className="rounded-full border border-current/15 bg-white/50 px-3 py-1 text-xs font-black">{lane.status}</span>
                </div>
                <p className="mt-2 text-sm leading-6">{lane.description}</p>
                <p className="mt-3 rounded-2xl bg-white/65 px-3 py-2 text-xs font-black">{oldestOrderLabel(laneOrders)}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

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
      <KitchenProductionSummary orders={hydratedOrders} />
      <OrdersList
        orders={hydratedOrders}
        tenantId={tenantId}
        source="cozinha"
        title="Comandas da cozinha"
        description="Pedidos confirmados, em preparo e prontos para entrega, ordenados pelos mais antigos."
        emptyMessage="Nenhum pedido aguardando a cozinha."
      />
    </TenantModulePage>
  );
}
