import { formatCurrencyBRL } from '@/lib/domain/order';
import type { TenantCustomerOrder } from '@/lib/types/orders';

const statusLabels: Record<TenantCustomerOrder['status'], string> = {
  received: 'Recebido',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export function OrdersList({ orders }: Readonly<{ orders: TenantCustomerOrder[] }>) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">Pedidos recebidos</h2>
          <p className="mt-1 text-sm text-slate-400">Pedidos enviados pelos clientes via QR Code das mesas.</p>
        </div>
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">{orders.length} pedido(s)</span>
      </div>

      {orders.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">Nenhum pedido recebido ainda.</p>
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
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-xl bg-slate-900 p-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <p className="font-semibold text-slate-100">{item.quantity}× {item.product_name}</p>
                      <p className="font-bold text-slate-200">{formatCurrencyBRL(item.line_total_cents)}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Unitário: {formatCurrencyBRL(item.unit_price_cents)}</p>
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
