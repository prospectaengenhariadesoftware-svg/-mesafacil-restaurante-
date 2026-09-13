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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrderRealtimeRefresh tenantId={tenantId} source={source} />
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">{orders.length} pedido(s)</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">{emptyMessage}</p>
      ) : (
        <div className="mt-5 space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Pedido {order.public_order_code}</p>
                  <h3 className="mt-1 text-lg font-black">Mesa {order.table_number ?? '—'}{order.table_sector ? ` • ${order.table_sector}` : ''}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {order.customer_name ? `Cliente: ${order.customer_name}` : 'Cliente não identificado'}
                  </p>
                  {order.customer_note ? <p className="mt-1 text-sm text-slate-500">Obs.: {order.customer_note}</p> : null}
                </div>
                <div className="text-left sm:text-right">
                  <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">{statusLabels[order.status]}</span>
                  <p className="mt-2 text-lg font-black text-emerald-300">{formatCurrencyBRL(order.total_cents)}</p>
                  <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
                  <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
                    {getOrderStatusActionLabel(order.status) ? (
                      <form action={advanceOrderStatusAction}>
                        <input type="hidden" name="tenantId" value={tenantId} />
                        <input type="hidden" name="orderId" value={order.id} />
                        <input type="hidden" name="currentStatus" value={order.status} />
                        <input type="hidden" name="source" value={source} />
                        <button className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400" type="submit">
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
                        <button className="rounded-full border border-rose-400/40 px-4 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-500/10" type="submit">
                          Cancelar
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-xl bg-slate-900 p-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <p className="font-semibold text-slate-100">{item.quantity}× {item.product_name}</p>
                      <p className="font-bold text-slate-200">{formatCurrencyBRL(item.line_total_cents)}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Unitário: {formatCurrencyBRL(item.unit_price_cents)}
                      {item.addons_total_cents ? ` + adicionais ${formatCurrencyBRL(item.addons_total_cents)}` : ''}
                    </p>
                    {item.selected_addons && item.selected_addons.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-xs text-emerald-200">
                        {item.selected_addons.map((addon) => (
                          <li key={addon.public_code}>+ {addon.name} ({formatCurrencyBRL(addon.price_delta_cents)})</li>
                        ))}
                      </ul>
                    ) : null}
                    {item.notes ? <p className="mt-1 text-xs text-slate-400">Item: {item.notes}</p> : null}
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
