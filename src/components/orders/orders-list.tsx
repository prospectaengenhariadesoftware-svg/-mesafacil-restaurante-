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
  received: 'border-sky-100 bg-sky-50 text-sky-700',
  confirmed: 'border-indigo-100 bg-indigo-50 text-indigo-700',
  preparing: 'border-amber-100 bg-amber-50 text-amber-700',
  ready: 'border-red-100 bg-red-50 text-red-700',
  delivered: 'border-green-100 bg-green-50 text-green-700',
  cancelled: 'border-stone-200 bg-stone-100 text-stone-600',
};

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
  source?: 'pedidos' | 'cozinha';
  title?: string;
  description?: string;
  emptyMessage?: string;
}>) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm shadow-stone-200/70">
      <div className="flex flex-col justify-between gap-3 border-b border-stone-100 bg-gradient-to-r from-white to-red-50 px-5 py-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-stone-500">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrderRealtimeRefresh tenantId={tenantId} source={source} />
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">{orders.length} pedido(s)</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="m-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">{emptyMessage}</p>
      ) : (
        <div className="space-y-4 p-5">
          {orders.map((order) => (
            <article key={order.id} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 shadow-sm sm:p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Pedido {order.public_order_code}</p>
                  <h3 className="mt-1 text-3xl font-black tracking-tight">Mesa {order.table_number ?? '—'}{order.table_sector ? ` • ${order.table_sector}` : ''}</h3>
                  <p className="mt-1 text-sm text-stone-500">
                    {order.customer_name ? `Cliente: ${order.customer_name}` : 'Cliente não identificado'}
                  </p>
                  {order.customer_note ? <p className="mt-1 text-sm text-stone-400">Obs.: {order.customer_note}</p> : null}
                </div>
                <div className="text-left sm:text-right">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusStyles[order.status]}`}>{statusLabels[order.status]}</span>
                  <p className="mt-2 text-lg font-black text-red-600">{formatCurrencyBRL(order.total_cents)}</p>
                  <p className="text-xs text-stone-400">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
                  <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
                    {getOrderStatusActionLabel(order.status) ? (
                      <form action={advanceOrderStatusAction}>
                        <input type="hidden" name="tenantId" value={tenantId} />
                        <input type="hidden" name="orderId" value={order.id} />
                        <input type="hidden" name="currentStatus" value={order.status} />
                        <input type="hidden" name="source" value={source} />
                        <button className="min-h-11 rounded-full bg-red-600 px-5 py-2 text-xs font-black text-white shadow-sm shadow-red-100 transition hover:bg-red-700" type="submit">
                          {getOrderStatusActionLabel(order.status)}
                        </button>
                      </form>
                    ) : null}
                    {!isFinalOrderStatus(order.status) ? (
                      <form action={advanceOrderStatusAction}>
                        <input type="hidden" name="tenantId" value={tenantId} />
                        <input type="hidden" name="orderId" value={order.id} />
                        <input type="hidden" name="currentStatus" value={order.status} />
                        <input type="hidden" name="source" value={source} />
                        <input type="hidden" name="mode" value="cancel" />
                        <button className="min-h-11 rounded-full border border-rose-200 bg-white px-5 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-50" type="submit">
                          Cancelar
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-stone-200 pt-4">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-stone-100 bg-white p-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <p className="font-semibold text-stone-950">{item.quantity}× {item.product_name}</p>
                      <p className="font-bold text-stone-800">{formatCurrencyBRL(item.line_total_cents)}</p>
                    </div>
                    <p className="mt-1 text-xs text-stone-400">
                      Unitário: {formatCurrencyBRL(item.unit_price_cents)}
                      {item.addons_total_cents ? ` + adicionais ${formatCurrencyBRL(item.addons_total_cents)}` : ''}
                    </p>
                    {item.selected_addons && item.selected_addons.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-xs text-red-600">
                        {item.selected_addons.map((addon) => (
                          <li key={addon.public_code}>+ {addon.name} ({formatCurrencyBRL(addon.price_delta_cents)})</li>
                        ))}
                      </ul>
                    ) : null}
                    {item.notes ? <p className="mt-1 text-xs text-stone-500">Item: {item.notes}</p> : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
