import { advanceOrderStatusAction } from '@/app/actions/orders';
import { OrderRealtimeRefresh } from '@/components/orders/order-realtime-refresh';
import { formatCurrencyBRL, getOrderStatusActionLabel, isFinalOrderStatus } from '@/lib/domain/order';
import type { TenantCustomerOrder } from '@/lib/types/orders';

const statusLabels: Record<TenantCustomerOrder['status'], string> = {
  received: 'Recebido',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const statusStyles: Record<TenantCustomerOrder['status'], string> = {
  received: 'border-sky-200 bg-sky-50 text-sky-800',
  confirmed: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  preparing: 'border-amber-200 bg-amber-50 text-amber-900',
  ready: 'border-red-200 bg-red-50 text-red-800',
  delivered: 'border-green-200 bg-green-50 text-green-800',
  cancelled: 'border-stone-200 bg-stone-100 text-stone-700',
};

const statusDots: Record<TenantCustomerOrder['status'], string> = {
  received: 'bg-sky-500',
  confirmed: 'bg-indigo-500',
  preparing: 'bg-amber-500',
  ready: 'bg-red-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-stone-500',
};

type OrderPanelSource = 'pedidos' | 'cozinha';

function countByStatus(orders: TenantCustomerOrder[], status: TenantCustomerOrder['status']): number {
  return orders.filter((order) => order.status === status).length;
}

function activeOrdersCount(orders: TenantCustomerOrder[]): number {
  return orders.filter((order) => !isFinalOrderStatus(order.status)).length;
}

function totalOpenCents(orders: TenantCustomerOrder[]): number {
  return orders
    .filter((order) => !isFinalOrderStatus(order.status))
    .reduce((sum, order) => sum + order.total_cents, 0);
}

function formatOrderDate(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function OrderActionForm({
  tenantId,
  order,
  source,
  mode,
  children,
  className,
}: Readonly<{
  tenantId: string;
  order: TenantCustomerOrder;
  source: OrderPanelSource;
  mode?: 'cancel';
  children: string;
  className: string;
}>) {
  return (
    <form action={advanceOrderStatusAction} className="min-w-0 flex-1 sm:flex-none">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="currentStatus" value={order.status} />
      <input type="hidden" name="source" value={source} />
      {mode ? <input type="hidden" name="mode" value={mode} /> : null}
      <button className={className} type="submit">
        {children}
      </button>
    </form>
  );
}

function EmptyOrders({ message }: Readonly<{ message: string }>) {
  return (
    <div className="m-5 rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-2xl shadow-sm">🍽️</div>
      <p className="mt-4 text-base font-black text-stone-950">Fila vazia agora</p>
      <p className="mt-1 text-sm leading-6 text-stone-500">{message}</p>
    </div>
  );
}

export function OrdersList({
  orders,
  tenantId,
  source = 'pedidos',
  title = 'Pedidos recebidos',
  description = 'Pedidos enviados pelos clientes via QR Code das mesas.',
  emptyMessage = 'Nenhum pedido recebido ainda.',
}: Readonly<{
  orders: TenantCustomerOrder[];
  tenantId: string;
  source?: OrderPanelSource;
  title?: string;
  description?: string;
  emptyMessage?: string;
}>) {
  const activeCount = activeOrdersCount(orders);
  const openTotal = totalOpenCents(orders);
  const receivedCount = countByStatus(orders, 'received');
  const preparingCount = countByStatus(orders, 'preparing');

  return (
    <section className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm shadow-stone-200/70">
      <div className="border-b border-stone-100 bg-gradient-to-br from-white via-red-50 to-stone-50 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">Operação</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OrderRealtimeRefresh tenantId={tenantId} source={source} />
            <span className="rounded-full border border-red-100 bg-white px-4 py-2 text-xs font-black text-red-700 shadow-sm">{orders.length} pedido(s)</span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Ativos</p>
            <p className="mt-2 text-3xl font-black text-stone-950">{activeCount}</p>
            <p className="mt-1 text-xs text-stone-500">Pedidos ainda em andamento.</p>
          </div>
          <div className="rounded-3xl border border-sky-100 bg-sky-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-800">Novos</p>
            <p className="mt-2 text-3xl font-black text-sky-950">{receivedCount}</p>
            <p className="mt-1 text-xs text-sky-800">Aguardando confirmação.</p>
          </div>
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-900">Preparo</p>
            <p className="mt-2 text-3xl font-black text-amber-950">{preparingCount}</p>
            <p className="mt-1 text-xs text-amber-900">Em produção na cozinha.</p>
          </div>
          <div className="rounded-3xl border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-800">Em aberto</p>
            <p className="mt-2 text-2xl font-black text-red-900">{formatCurrencyBRL(openTotal)}</p>
            <p className="mt-1 text-xs text-red-800">Total ativo para operação/caixa.</p>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyOrders message={emptyMessage} />
      ) : (
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2">
          {orders.map((order) => {
            const nextLabel = getOrderStatusActionLabel(order.status);
            const tableLabel = `Mesa ${order.table_number ?? '—'}${order.table_sector ? ` • ${order.table_sector}` : ''}`;
            return (
              <article key={order.id} className="flex min-h-full flex-col rounded-[1.75rem] border border-stone-200 bg-stone-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-stone-200/80 sm:p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${statusDots[order.status]}`} aria-hidden="true" />
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Pedido {order.public_order_code}</p>
                    </div>
                    <h3 className="mt-2 break-words text-3xl font-black tracking-tight text-stone-950">{tableLabel}</h3>
                    <p className="mt-2 text-sm font-semibold text-stone-700">
                      {order.customer_name ? `Cliente: ${order.customer_name}` : 'Cliente não identificado'}
                    </p>
                    {order.customer_note ? <p className="mt-2 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm leading-6 text-amber-900">Obs.: {order.customer_note}</p> : null}
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-black ${statusStyles[order.status]}`}>{statusLabels[order.status]}</span>
                    <p className="mt-3 text-2xl font-black text-red-700">{formatCurrencyBRL(order.total_cents)}</p>
                    <p className="mt-1 text-xs font-semibold text-stone-500">{formatOrderDate(order.created_at)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 border-t border-stone-200 pt-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-stone-200 bg-white p-4 text-sm shadow-sm">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <p className="break-words text-base font-black text-stone-950">{item.quantity}× {item.product_name}</p>
                          <p className="mt-1 text-xs font-semibold text-stone-500">
                            Unitário: {formatCurrencyBRL(item.unit_price_cents)}
                            {item.addons_total_cents ? ` + adicionais ${formatCurrencyBRL(item.addons_total_cents)}` : ''}
                          </p>
                        </div>
                        <p className="text-lg font-black text-stone-950">{formatCurrencyBRL(item.line_total_cents)}</p>
                      </div>
                      {item.selected_addons && item.selected_addons.length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-red-800">
                          {item.selected_addons.map((addon) => (
                            <li key={addon.public_code} className="rounded-full border border-red-100 bg-red-50 px-3 py-1">
                              + {addon.name} ({formatCurrencyBRL(addon.price_delta_cents)})
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {item.notes ? <p className="mt-3 rounded-2xl bg-stone-50 p-3 text-xs leading-5 text-stone-600">Item: {item.notes}</p> : null}
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
                  {nextLabel ? (
                    <OrderActionForm
                      tenantId={tenantId}
                      order={order}
                      source={source}
                      className="min-h-12 w-full rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-sm shadow-red-100 transition hover:bg-red-700 sm:w-auto"
                    >
                      {nextLabel}
                    </OrderActionForm>
                  ) : null}
                  {!isFinalOrderStatus(order.status) ? (
                    <OrderActionForm
                      tenantId={tenantId}
                      order={order}
                      source={source}
                      mode="cancel"
                      className="min-h-12 w-full rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-black text-rose-800 transition hover:bg-rose-50 sm:w-auto"
                    >
                      Cancelar
                    </OrderActionForm>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
