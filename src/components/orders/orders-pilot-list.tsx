import Link from 'next/link';
import { advanceOrderStatusAction } from '@/app/actions/orders';
import { AppIcon } from '@/components/design-system/app-icon';
import { Button, DataTable, EmptyState, FilterBar, MetricCard, MobileListCard, PageHeader, SearchBar, StatusBadge, type StatusTone } from '@/components/design-system/primitives';
import { OrderRealtimeRefresh } from '@/components/orders/order-realtime-refresh';
import { PrintOrderButton } from '@/components/orders/print-order-button';
import { getNextOrderStatus, type OrderStatus } from '@/lib/domain/order';
import type { OrderPanelSource } from '@/lib/realtime/order-events';
import type { TenantCustomerOrder } from '@/lib/types/orders';

const statusLabels: Record<OrderStatus, string> = {
  received: 'Aguardando',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const statusTone: Record<OrderStatus, StatusTone> = {
  received: 'danger',
  confirmed: 'info',
  preparing: 'warning',
  ready: 'success',
  delivered: 'info',
  cancelled: 'neutral',
};

const filterOptions: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'received', label: 'Aguardando' },
  { value: 'preparing', label: 'Em preparo' },
  { value: 'ready', label: 'Pronto' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
];

export type OrdersPilotFilters = {
  status: OrderStatus | 'all';
  q: string;
};

type OrdersPilotListProps = {
  tenantId: string;
  orders: TenantCustomerOrder[];
  allOrders: TenantCustomerOrder[];
  filters: OrdersPilotFilters;
  source?: OrderPanelSource;
};

function formatCurrencyBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function buildOrdersHref(tenantId: string, filters: OrdersPilotFilters, overrides: Partial<OrdersPilotFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.status !== 'all') params.set('status', next.status);
  if (next.q) params.set('q', next.q);
  const query = params.toString();
  return `/tenants/${tenantId}/pedidos${query ? `?${query}` : ''}`;
}

function countByStatus(orders: TenantCustomerOrder[], status: OrderStatus) {
  return orders.filter((order) => order.status === status).length;
}

function getOrderStatusActionLabel(status: OrderStatus) {
  const next = getNextOrderStatus(status);
  if (next === status) return 'Status final';
  return `Mover para ${statusLabels[next]}`;
}

function OrderActionForm({ tenantId, order, children, className, source = 'pedidos', mode }: Readonly<{ tenantId: string; order: TenantCustomerOrder; children: React.ReactNode; className: string; source?: OrderPanelSource; mode?: 'cancel' }>) {
  return (
    <form action={advanceOrderStatusAction}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="currentStatus" value={order.status} />
      <input type="hidden" name="source" value={source} />
      {mode ? <input type="hidden" name="mode" value={mode} /> : null}
      <button type="submit" className={className}>{children}</button>
    </form>
  );
}

function OrderItems({ order }: Readonly<{ order: TenantCustomerOrder }>) {
  if (order.items.length === 0) return <p className="text-sm font-semibold text-gray-500">Nenhum item detalhado encontrado para este pedido.</p>;
  return (
    <div className="grid gap-2">
      {order.items.map((item) => (
        <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="font-black text-gray-950">{item.quantity}× {item.product_name}</p>
            <p className="font-black text-gray-900">{formatCurrencyBRL(item.line_total_cents)}</p>
          </div>
          {item.notes ? <p className="mt-2 text-xs font-semibold text-amber-800">Obs.: {item.notes}</p> : null}
          {item.selected_addons?.length ? (
            <ul className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold text-red-700">
              {item.selected_addons.map((addon) => <li key={addon.public_code} className="rounded-lg bg-red-50 px-2 py-1">+ {addon.name}</li>)}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function OrderActions({ tenantId, order, source }: Readonly<{ tenantId: string; order: TenantCustomerOrder; source: OrderPanelSource }>) {
  const isFinal = getNextOrderStatus(order.status) === order.status;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isFinal ? (
        <OrderActionForm tenantId={tenantId} order={order} source={source} className="inline-flex min-h-9 items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white hover:bg-red-700">
          {getOrderStatusActionLabel(order.status)}
        </OrderActionForm>
      ) : null}
      {!['cancelled', 'delivered'].includes(order.status) ? (
        <OrderActionForm tenantId={tenantId} order={order} source={source} mode="cancel" className="inline-flex min-h-9 items-center justify-center rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-50">
          Cancelar
        </OrderActionForm>
      ) : null}
    </div>
  );
}

export function OrdersPilotList({ orders, allOrders, tenantId, source = 'pedidos', filters }: Readonly<OrdersPilotListProps>) {
  const activeOrders = allOrders.filter((order) => !['delivered', 'cancelled'].includes(order.status));
  const openTotal = activeOrders.reduce((total, order) => total + order.total_cents, 0);

  return (
    <section className="space-y-5">
      <PageHeader
        breadcrumb={<><Link href={`/tenants/${tenantId}`} className="hover:text-red-700">Início</Link><span className="mx-2">›</span><span>Pedidos</span></>}
        title="Pedidos"
        description="Acompanhe e gerencie os pedidos recebidos via QR Code, comandas e balcão."
        action={<Button href={`/tenants/${tenantId}/mesas`}><AppIcon name="plus" size={16} />Novo pedido via mesa</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <MetricCard icon="orders" label="Pedidos hoje" value={allOrders.length} hint={allOrders.length ? `${activeOrders.length} ativos` : undefined} tone="brand" />
        <MetricCard icon="clock" label="Aguardando" value={countByStatus(allOrders, 'received')} tone="danger" />
        <MetricCard icon="kitchen" label="Em preparo" value={countByStatus(allOrders, 'preparing')} tone="warning" />
        <MetricCard icon="check" label="Pronto" value={countByStatus(allOrders, 'ready')} tone="success" />
        <MetricCard icon="bag" label="Entregues" value={countByStatus(allOrders, 'delivered')} tone="info" />
        <MetricCard icon="x" label="Cancelados" value={countByStatus(allOrders, 'cancelled')} tone="neutral" />
      </div>

      <FilterBar>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          {filterOptions.map((option) => (
            <Link key={option.value} href={buildOrdersHref(tenantId, filters, { status: option.value })} className={`inline-flex min-h-10 shrink-0 items-center rounded-xl px-3 py-2 text-sm font-black transition ${filters.status === option.value ? 'bg-red-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700'}`}>
              {option.label}{option.value === 'all' ? ` (${allOrders.length})` : ` (${countByStatus(allOrders, option.value)})`}
            </Link>
          ))}
        </div>
        <form action={`/tenants/${tenantId}/pedidos`} className="flex min-w-0 flex-1 gap-2">
          {filters.status !== 'all' ? <input type="hidden" name="status" value={filters.status} /> : null}
          <SearchBar defaultValue={filters.q} placeholder="Buscar pedido, mesa ou cliente..." />
          <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:text-red-700" aria-label="Filtrar pedidos"><AppIcon name="filter" size={18} /></button>
        </form>
        <OrderRealtimeRefresh tenantId={tenantId} source={source} />
      </FilterBar>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-black text-gray-950">Mostrando {orders.length} de {allOrders.length} pedido(s)</p>
          <p className="text-sm font-semibold text-gray-500">Valor ativo em aberto: <span className="font-black text-gray-950">{formatCurrencyBRL(openTotal)}</span></p>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon="orders" title="Nenhum pedido encontrado" description="Ajuste os filtros ou aguarde novos pedidos via QR Code." />
      ) : (
        <>
          <DataTable>
            <thead className="bg-gray-50 text-xs font-black uppercase tracking-[0.12em] text-gray-500"><tr><th className="px-4 py-3">Pedido</th><th className="px-4 py-3">Mesa</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Itens</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="align-top hover:bg-gray-50/70">
                  <td className="px-4 py-4"><p className="font-black text-gray-950">#{order.public_order_code}</p><p className="mt-1 text-xs font-semibold text-gray-500">{formatOrderDate(order.created_at)}</p></td>
                  <td className="px-4 py-4 font-bold text-gray-700">Mesa {order.table_number ?? '—'}</td>
                  <td className="px-4 py-4 text-gray-600">{order.customer_name ?? 'Consumo local'}</td>
                  <td className="px-4 py-4 font-bold text-gray-700">{order.items.length} item(ns)</td>
                  <td className="px-4 py-4 font-black text-gray-950">{formatCurrencyBRL(order.total_cents)}</td>
                  <td className="px-4 py-4"><StatusBadge tone={statusTone[order.status]}>{statusLabels[order.status]}</StatusBadge></td>
                  <td className="px-4 py-4"><div className="flex justify-end gap-2"><details className="relative"><summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700" aria-label={`Visualizar pedido ${order.public_order_code}`}><AppIcon name="eye" size={16} /></summary><div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"><p className="font-black text-gray-950">Pedido #{order.public_order_code}</p><p className="mt-1 text-sm font-semibold text-gray-500">Mesa {order.table_number ?? '—'} · {order.customer_name ?? 'Consumo local'}</p><div className="mt-4"><OrderItems order={order} /></div><div className="mt-4"><OrderActions tenantId={tenantId} order={order} source={source} /></div></div></details><PrintOrderButton label={`Imprimir pedido ${order.public_order_code}`} /><details className="relative"><summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700" aria-label={`Mais ações do pedido ${order.public_order_code}`}><AppIcon name="more" size={16} /></summary><div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl"><OrderActions tenantId={tenantId} order={order} source={source} /></div></details></div></td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          <div className="grid gap-3 md:hidden">
            {orders.map((order) => (
              <MobileListCard key={order.id}>
                <div className="flex items-start justify-between gap-3"><div><p className="text-lg font-black text-gray-950">#{order.public_order_code}</p><p className="mt-2 text-sm font-bold text-gray-600">Mesa {order.table_number ?? '—'}</p><p className="mt-1 text-xs font-semibold text-gray-500">{order.items.length} item(ns) • {formatTime(order.created_at)}</p></div><div className="text-right"><p className="text-lg font-black text-gray-950">{formatCurrencyBRL(order.total_cents)}</p><div className="mt-2"><StatusBadge tone={statusTone[order.status]}>{statusLabels[order.status]}</StatusBadge></div></div></div>
                <details className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3"><summary className="cursor-pointer text-sm font-black text-red-700">Ver detalhes e ações</summary><div className="mt-3"><OrderItems order={order} /></div><div className="mt-3 flex flex-wrap gap-2"><PrintOrderButton label={`Imprimir pedido ${order.public_order_code}`} /><OrderActions tenantId={tenantId} order={order} source={source} /></div></details>
              </MobileListCard>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
