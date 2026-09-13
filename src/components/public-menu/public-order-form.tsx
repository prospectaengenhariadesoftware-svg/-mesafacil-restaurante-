import { createPublicOrderAction } from '@/app/actions/public-order';
import type { PublicMenuPayload } from '@/lib/types/public-menu';
import { formatMoneyFromCents } from '@/lib/validation/catalog';

export function PublicOrderForm({
  menu,
  qrToken,
  categoryAnchor,
}: Readonly<{
  menu: PublicMenuPayload;
  qrToken: string;
  categoryAnchor: (name: string, index: number) => string;
}>) {
  const visibleCategories = menu.categories.filter((category) => category.products.length > 0);

  return (
    <form action={createPublicOrderAction} className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <input type="hidden" name="restaurantSlug" value={menu.tenant.public_slug} />
      <input type="hidden" name="qrToken" value={qrToken} />

      <div className="space-y-5">
        {visibleCategories.map((category, index) => (
          <section key={`${category.name}-${index}`} id={categoryAnchor(category.name, index)} className="scroll-mt-24 rounded-[1.75rem] border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/70 sm:p-5">
            <div className="mb-4 flex items-end justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{category.name}</h2>
                {category.description ? <p className="mt-1 text-sm leading-6 text-stone-500">{category.description}</p> : null}
              </div>
              <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">{category.products.length} item(ns)</span>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              {category.products.map((product) => (
                <article key={product.public_code} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-stone-200/80">
                  <div className="grid gap-0 sm:grid-cols-[156px_minmax(0,1fr)]">
                    {product.image_url ? (
                      <span aria-label={`Imagem de ${product.name}`} role="img" className="block aspect-[4/3] w-full bg-stone-100 bg-cover bg-center sm:h-full sm:min-h-48" style={{ backgroundImage: `url(${product.image_url})` }} />
                    ) : (
                      <span aria-hidden className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-red-50 to-amber-50 text-4xl sm:h-full sm:min-h-48">🍽️</span>
                    )}

                    <div className="flex min-w-0 flex-col p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-black leading-5 text-stone-950">{product.name}</h3>
                          {product.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-500">{product.description}</p> : null}
                        </div>
                        <strong className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-sm font-black text-red-600">{formatMoneyFromCents(product.price_cents)}</strong>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <label className="grid w-24 gap-1 text-xs font-bold text-stone-600">
                          Quantidade
                          <input name={`quantity:${product.public_code}`} type="number" min="0" max="99" defaultValue="0" inputMode="numeric" className="rounded-2xl border border-stone-300 bg-stone-50 px-3 py-2 text-center text-base font-black text-stone-950 outline-none transition focus:border-red-500 focus:bg-white" />
                        </label>
                        {product.addons.length > 0 ? <span className="pb-2 text-xs font-bold text-stone-500">+ {product.addons.length} adicional(is)</span> : null}
                      </div>

                      {product.addons.length > 0 ? (
                        <fieldset className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                          <legend className="px-1 text-[11px] font-black uppercase tracking-wide text-stone-500">Adicionais</legend>
                          <div className="mt-2 grid gap-2">
                            {product.addons.map((addon) => (
                              <label key={addon.public_code} className="flex items-start gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800">
                                <input
                                  type="checkbox"
                                  name={`addon:${product.public_code}:${addon.public_code}`}
                                  value="on"
                                  className="mt-0.5 h-4 w-4 rounded border-stone-300 bg-white text-red-500 accent-red-500"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="font-bold">{addon.name}</span>
                                  {addon.description ? <span className="block leading-5 text-stone-500">{addon.description}</span> : null}
                                </span>
                                <span className="shrink-0 font-black text-red-600">+ {formatMoneyFromCents(addon.price_delta_cents)}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ) : null}

                      <label className="mt-3 grid gap-1 text-xs font-bold text-stone-600">
                        Observação deste item
                        <input name={`notes:${product.public_code}`} maxLength={200} placeholder="Ex.: sem cebola, ao ponto..." className="rounded-2xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none transition focus:border-red-500 focus:bg-white" />
                      </label>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="lg:sticky lg:top-28">
        <section className="rounded-[1.75rem] border border-red-100 bg-white p-4 shadow-xl shadow-red-100/60 sm:p-5">
          <div className="border-b border-stone-100 pb-4">
            <p className="text-sm font-black text-red-600">Sua sacola</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Pedido da mesa {menu.table.number}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">Escolha as quantidades nos cards e envie para o restaurante.</p>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-2 text-sm font-bold text-stone-800">
              Nome ou apelido
              <input name="customerName" maxLength={80} placeholder="Ex.: Armando" className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-red-500 focus:bg-white" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-stone-800">
              Observação da mesa
              <input name="customerNote" maxLength={300} placeholder="Ex.: talheres extras" className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-red-500 focus:bg-white" />
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-600">
            <strong className="block text-stone-950">Como pedir</strong>
            Coloque quantidade maior que zero nos itens desejados. Adicionais só serão considerados quando o item principal tiver quantidade.
          </div>

          <button type="submit" className="mt-5 w-full rounded-2xl bg-red-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-red-200 transition hover:bg-red-700">
            Enviar pedido
          </button>
          <p className="mt-3 text-center text-xs leading-5 text-stone-500">Pagamento ainda não está ativo nesta etapa.</p>
        </section>
      </aside>
    </form>
  );
}
