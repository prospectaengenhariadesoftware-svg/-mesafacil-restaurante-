import Link from 'next/link';
import { advanceOrderStatusAction } from '@/app/actions/orders';
import { AppIcon } from '@/components/design-system/app-icon';
import { Button, EmptyState, FilterBar, MetricCard, PageHeader, SearchBar, StatusBadge, type StatusTone } from '@/components/design-system/primitives';
import { OrderRealtimeRefresh } from '@/components/orders/order-realtime-refresh';
import type { OrderStatus } from '@/lib/domain/order';
import type { TenantCustomerOrder } from '@/lib/types/orders';

type KitchenFilter = 'all' | 'confirmed' | 'preparing' | 'ready' | 'late';

export type KitchenBoardFilters = {
  status: KitchenFilter;
  q: string;
  sort: 'oldest' | 'newest';
};

type KitchenLane = {
  id: 'confirmed' | 'preparing' | 'ready' | 'delivered';
  title: string;
  subtitle: string;
  tone: StatusTone;
};

const LATE_MINUTES = 20;

const lanes: KitchenLane[] = [
  { id: 'confirmed', title: 'Aguardando', subtitle: 'Confirmados para iniciar preparo', tone: 'danger' },
  { id: 'preparing', title: 'Em preparo', subtitle: 'Comandas em produção', tone: 'warning' },
  { id: 'ready', title: 'Prontos', subtitle: 'Aguardando retirada/entrega', tone: 'success' },
  { id: 'delivered', title: 'Entregues hoje', subtitle: 'Finalizados no dia', tone: 'info' },
];

const filterOptions: { value: KitchenFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'confirmed', label: 'Aguardando' },
  { value: 'preparing', label: 'Em preparo' },
  { value: 'ready', label: 'Prontos' },
  { value: 'late', label: 'Atrasados' },
];

const statusLabel: Record<OrderStatus, string> = {
  received: 'Recebido',
  confirmed: 'Aguardando',
  preparing: 'Em preparo',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const statusTone: Record<OrderStatus, StatusTone> = {
  received: 'info',
  confirmed: 'danger',
  preparing: 'warning',
  ready: 'success',
  delivered: 'info',
  cancelled: 'neutral',
};

function minutesSince(value: string): number {
  const created = new Date(value).getTime();
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 60000));
}

function averageMinutes(orders: TenantCustomerOrder[]): number {
  const active = orders.filter((order) => order.status !== 'delivered');
  if (active.length === 0) return 0;
  return Math.round(active.reduce((sum, order) => sum + minutesSince(order.created_at), 0) / active.length);
}

function buildKitchenHref(tenantId: string, filters: KitchenBoardFilters, overrides: Partial<KitchenBoardFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.status !== 'all') params.set('status', next.status);
  if (next.q) params.set('q', next.q);
  if (next.sort !== 'oldest') params.set('sort', next.sort);
  const query = params.toString();
  return `/tenants/${tenantId}/cozinha${query ? `?${query}` : ''}`;
}

function matchesSearch(order: TenantCustomerOrder, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [order.public_order_code, order.table_number ?? '', order.table_sector ?? '', order.customer_name ?? ''].some((value) => value.toLowerCase().includes(needle));
}

function isLate(order: TenantCustomerOrder) {
  return order.status !== 'delivered' && minutesSince(order.created_at) >= LATE_MINUTES;
}

function actionLabel(order: TenantCustomerOrder) {
  if (order.status === 'confirmed') return 'Iniciar preparo';
  if (order.status === 'preparing') return 'Marcar como pronto';
  if (order.status === 'ready') return 'Marcar como entregue';
  return null;
}

function KitchenActionForm({ tenantId, order, children, mode }: Readonly<{ tenantId: string; order: TenantCustomerOrder; children: string; mode?: 'cancel' }>) {
  return (
    <form action={advanceOrderStatusAction}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="currentStatus" value={order.status} />
      <input type="hidden" name="source" value="cozinha" />
      {mode ? <input type="hidden" name="mode" value={mode} /> : null}
      <button type="submit" className={mode === 'cancel' ? 'min-h-11 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50' : 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-red-200 hover:bg-red-700'}>
        {mode ? null : <AppIcon name="check" size={16} />}{children}
      </button>
    </form>
  );
}

function formatCurrencyBRL(valueInCents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valueInCents / 100);
}

function OrderItemsCompact({ order }: Readonly<{ order: TenantCustomerOrder }>) {
  if (order.items.length === 0) return <p className="text-sm text-slate-500">Itens não detalhados neste pedido.</p>;
  return (
    <ul className="space-y-2 text-sm text-slate-700">
      {order.items.map((item) => (
        <li key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
            <p className="break-words font-semibold text-slate-950">{item.quantity}x {item.product_name}</p>
            <span className="shrink-0 text-xs font-semibold text-slate-600">{formatCurrencyBRL(item.line_total_cents)}</span>
          </div>
          {item.selected_addons.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1 text-xs font-semibold text-red-700">
              {item.selected_addons.map((addon) => (
                <li key={addon.public_code} className="rounded-full border border-red-100 bg-red-50 px-2 py-1">+ {addon.name} ({formatCurrencyBRL(addon.price_delta_cents)})</li>
              ))}
            </ul>
          ) : null}
          {item.notes ? <p className="mt-2 rounded-lg bg-white p-2 text-xs leading-5 text-slate-600">Item: {item.notes}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function KitchenOrderCard({ tenantId, order }: Readonly<{ tenantId: string; order: TenantCustomerOrder }>) {
  const label = actionLabel(order);
  const minutes = minutesSince(order.created_at);
  const progress = Math.min(100, Math.round((minutes / LATE_MINUTES) * 100));

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-slate-950">#{order.public_order_code}</p>
          <p className="mt-1 text-sm font-medium text-slate-600">Mesa {order.table_number ?? '—'}{order.table_sector ? ` · ${order.table_sector}` : ''}</p>
        </div>
        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${isLate(order) ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{minutes} min</span>
      </div>

      <div className="mt-4"><OrderItemsCompact order={order} /></div>

      {order.customer_note ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Obs.: {order.customer_note}</p> : null}

      {order.status === 'preparing' ? (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${progress}%` }} /></div>
          <p className="mt-1 text-xs font-medium text-amber-700">Em preparo...</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        {label ? <KitchenActionForm tenantId={tenantId} order={order}>{label}</KitchenActionForm> : <StatusBadge tone={statusTone[order.status]}>{order.status === 'ready' ? 'Pronto para retirada' : statusLabel[order.status]}</StatusBadge>}
        {!['delivered', 'cancelled'].includes(order.status) ? <KitchenActionForm tenantId={tenantId} order={order} mode="cancel">Cancelar</KitchenActionForm> : null}
      </div>
    </article>
  );
}

export function KitchenBoard({ tenantId, orders, deliveredToday, filters }: Readonly<{ tenantId: string; orders: TenantCustomerOrder[]; deliveredToday: TenantCustomerOrder[]; filters: KitchenBoardFilters }>) {
  const combined = [...orders, ...deliveredToday];
  const searched = combined.filter((order) => matchesSearch(order, filters.q));
  const filtered = searched.filter((order) => {
    if (filters.status === 'all') return true;
    if (filters.status === 'late') return isLate(order);
    return order.status === filters.status;
  });
  const sorted = [...filtered].sort((a, b) => filters.sort === 'oldest' ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime() : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const activeOrders = orders.filter((order) => order.status !== 'delivered');
  const readyCount = orders.filter((order) => order.status === 'ready').length;
  const productivity = activeOrders.length > 0 ? Math.round((readyCount / activeOrders.length) * 100) : 0;

  return (
    <section className="space-y-5">
      <PageHeader
        breadcrumb={<><Link href={`/tenants/${tenantId}`} className="hover:text-red-700">Início</Link><span className="mx-2">›</span><span>Cozinha</span></>}
        title="Cozinha"
        description="Acompanhe o preparo dos pedidos em tempo real."
        action={<Button href={`/tenants/${tenantId}/pedidos`} variant="secondary"><AppIcon name="orders" size={16} />Ver todos os pedidos</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon="kitchen" label="Pedidos na cozinha" value={orders.length} hint="ativos" tone="brand" />
        <MetricCard icon="clock" label="Tempo médio" value={`${averageMinutes(orders)} min`} hint="desde recebimento" tone="warning" />
        <MetricCard icon="check" label="Pedidos prontos" value={readyCount} hint="aguardando retirada" tone="success" />
        <MetricCard icon="reports" label="Produtividade" value={`${productivity}%`} hint="prontos / ativos" tone="info" />
      </div>

      <FilterBar>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          {filterOptions.map((option) => (
            <Link key={option.value} href={buildKitchenHref(tenantId, filters, { status: option.value })} className={`inline-flex min-h-10 shrink-0 items-center rounded-xl px-3 py-2 text-sm font-semibold transition ${filters.status === option.value ? 'bg-red-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700'}`}>{option.label}</Link>
          ))}
        </div>
        <Link href={buildKitchenHref(tenantId, filters, { sort: filters.sort === 'oldest' ? 'newest' : 'oldest' })} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-red-200 hover:text-red-700">
          {filters.sort === 'oldest' ? 'Mais antigo primeiro' : 'Mais recente primeiro'}
        </Link>
        <form action={`/tenants/${tenantId}/cozinha`} className="flex min-w-0 flex-1 gap-2">
          {filters.status !== 'all' ? <input type="hidden" name="status" value={filters.status} /> : null}
          {filters.sort !== 'oldest' ? <input type="hidden" name="sort" value={filters.sort} /> : null}
          <SearchBar defaultValue={filters.q} placeholder="Buscar pedido..." />
          <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:text-red-700" aria-label="Buscar na cozinha"><AppIcon name="search" size={18} /></button>
        </form>
        <OrderRealtimeRefresh tenantId={tenantId} source="cozinha" />
      </FilterBar>

      {sorted.length === 0 ? <EmptyState icon="kitchen" title="Nenhum pedido nesta visão" description="Ajuste os filtros ou aguarde novas comandas confirmadas." /> : null}

      <div className="hidden gap-4 xl:grid xl:grid-cols-4">
        {lanes.map((lane) => {
          const laneOrders = sorted.filter((order) => lane.id === 'delivered' ? order.status === 'delivered' : order.status === lane.id);
          return (
            <section key={lane.id} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-start justify-between gap-3 px-1">
                <div><h2 className="text-base font-semibold text-slate-950">{lane.title}</h2><p className="mt-1 text-xs text-slate-500">{lane.subtitle}</p></div>
                <StatusBadge tone={lane.tone}>{laneOrders.length}</StatusBadge>
              </div>
              <div className="grid gap-3">
                {laneOrders.length > 0 ? laneOrders.map((order) => <KitchenOrderCard key={order.id} tenantId={tenantId} order={order} />) : <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-500">Sem pedidos</div>}
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid gap-3 xl:hidden">
        {sorted.map((order) => <KitchenOrderCard key={order.id} tenantId={tenantId} order={order} />)}
      </div>
    </section>
  );
}
