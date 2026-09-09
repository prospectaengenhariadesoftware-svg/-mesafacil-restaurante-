import { demoOrders } from '@/lib/mock-data';
import { calculateCartTotalCents, formatCurrencyBRL } from '@/lib/domain/order';

export default function KitchenPage() {
  return (
    <main className="min-h-screen bg-stone-950 px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-[0.25em] text-amber-300">Cozinha</p>
        <h1 className="mt-2 text-4xl font-bold">Fila de preparo</h1>
        <p className="mt-2 text-stone-300">Tela limpa para a equipe acompanhar pedidos e observações.</p>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {demoOrders.map((order) => (
            <article className="rounded-3xl bg-white p-6 text-stone-950" key={order.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-stone-500">Mesa {order.table}</p>
                  <h2 className="text-3xl font-bold">Pedido #{order.orderNumber}</h2>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{order.status}</span>
              </div>

              <div className="mt-6 space-y-4">
                {order.items.map((item) => (
                  <div className="rounded-2xl bg-stone-100 p-4" key={`${order.id}-${item.productId}`}>
                    <p className="text-xl font-bold">{item.quantity}× {item.productName}</p>
                    {item.notes ? <p className="mt-1 text-sm font-semibold text-red-700">Obs.: {item.notes}</p> : null}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-stone-500">Total: {formatCurrencyBRL(calculateCartTotalCents(order.items))}</p>
                <button className="rounded-full bg-stone-950 px-5 py-3 font-bold text-white">Avançar status</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
