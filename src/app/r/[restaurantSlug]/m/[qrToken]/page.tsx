import Link from 'next/link';
import { categories, products, restaurant } from '@/lib/mock-data';
import { formatCurrencyBRL } from '@/lib/domain/order';

export default async function PublicMenuPage({ params }: { params: Promise<{ restaurantSlug: string; qrToken: string }> }) {
  const { qrToken } = await params;
  const tableNumber = qrToken.replace('mesa-', '') || restaurant.table;

  return (
    <main className="min-h-screen bg-stone-100 pb-28 text-stone-950">
      <header className="bg-stone-950 px-5 py-8 text-stone-50">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm uppercase tracking-[0.25em] text-amber-300">{restaurant.name}</p>
          <h1 className="mt-3 text-3xl font-bold">Cardápio digital</h1>
          <p className="mt-2 text-stone-300">Mesa {tableNumber} identificada pelo QR Code.</p>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-amber-700">Como funciona</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Escolha os itens, revise o carrinho e envie o pedido. No MVP, esta tela usa dados demonstrativos; a próxima etapa liga ao Supabase.
          </p>
        </div>

        <div className="space-y-8">
          {categories.map((category) => {
            const categoryProducts = products.filter((product) => product.categoryId === category.id);
            return (
              <section key={category.id}>
                <h2 className="text-2xl font-bold">{category.name}</h2>
                <p className="text-sm text-stone-500">{category.description}</p>
                <div className="mt-4 grid gap-4">
                  {categoryProducts.map((product) => (
                    <article className="rounded-3xl bg-white p-5 shadow-sm" key={product.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold">{product.name}</h3>
                            {product.isFeatured ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">Destaque</span> : null}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-stone-600">{product.description}</p>
                          <p className="mt-3 text-xl font-bold">{formatCurrencyBRL(product.priceCents)}</p>
                        </div>
                        <button className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:bg-stone-300" disabled={!product.isAvailable}>
                          {product.isAvailable ? 'Adicionar' : 'Indisponível'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <footer className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-sm text-stone-500">Carrinho demo</p>
            <p className="font-bold">2 itens • R$ 77,80</p>
          </div>
          <Link className="rounded-full bg-amber-400 px-5 py-3 font-bold text-stone-950" href="/pedido-confirmado">
            Enviar pedido
          </Link>
        </div>
      </footer>
    </main>
  );
}
