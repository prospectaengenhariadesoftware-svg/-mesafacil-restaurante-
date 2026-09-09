import Link from 'next/link';
import { demoOrders, products } from '@/lib/mock-data';
import { calculateCartTotalCents, formatCurrencyBRL } from '@/lib/domain/order';

const cards = [
  { label: 'Pedidos abertos', value: demoOrders.length.toString() },
  { label: 'Vendas demo', value: formatCurrencyBRL(demoOrders.reduce((sum, order) => sum + calculateCartTotalCents(order.items), 0)) },
  { label: 'Produtos ativos', value: products.filter((product) => product.isAvailable).length.toString() },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-amber-700">MesaFácil Admin</p>
            <h1 className="mt-2 text-4xl font-bold">Painel do restaurante</h1>
            <p className="mt-2 text-stone-600">Visão inicial para operar pedidos, cardápio e mesas.</p>
          </div>
          <Link className="rounded-full bg-stone-950 px-5 py-3 font-semibold text-white" href="/admin/kitchen">
            Abrir cozinha
          </Link>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <div className="rounded-3xl bg-white p-6 shadow-sm" key={card.label}>
              <p className="text-sm text-stone-500">{card.label}</p>
              <p className="mt-3 text-3xl font-bold">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Pedidos recentes</h2>
            <div className="mt-5 space-y-4">
              {demoOrders.map((order) => (
                <article className="rounded-2xl border border-stone-200 p-4" key={order.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">Pedido #{order.orderNumber} • Mesa {order.table}</p>
                      <p className="text-sm text-stone-500">{order.createdAt}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{order.status}</span>
                  </div>
                  <p className="mt-3 font-semibold">{formatCurrencyBRL(calculateCartTotalCents(order.items))}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-stone-950 p-6 text-white shadow-sm">
            <h2 className="text-2xl font-bold">Próximas ações</h2>
            <ul className="mt-5 space-y-3 text-sm text-stone-300">
              <li>• Conectar Supabase e aplicar schema SQL.</li>
              <li>• Criar login interno por perfil.</li>
              <li>• Trocar dados demo por consultas reais.</li>
              <li>• Implementar carrinho interativo do cliente.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
