import { createPublicOrderAction } from '@/app/actions/public-order';
import type { PublicMenuPayload } from '@/lib/types/public-menu';
import { formatMoneyFromCents } from '@/lib/validation/catalog';

export function PublicOrderForm({ menu, qrToken }: Readonly<{ menu: PublicMenuPayload; qrToken: string }>) {
  const products = menu.categories.flatMap((category) => category.products.map((product) => ({ ...product, categoryName: category.name })));

  return (
    <form action={createPublicOrderAction} className="rounded-3xl border border-red-100 bg-white p-5">
      <input type="hidden" name="restaurantSlug" value={menu.tenant.public_slug} />
      <input type="hidden" name="qrToken" value={qrToken} />

      <div className="border-b border-stone-200 pb-4">
        <p className="text-sm font-semibold text-red-600">Fazer pedido</p>
        <h2 className="mt-1 text-2xl font-black">Escolha os itens da mesa {menu.table.number}</h2>
        <p className="mt-2 text-sm text-stone-500">Informe a quantidade desejada em cada produto. Pagamento ainda não está ativado nesta etapa.</p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Nome do cliente ou apelido
          <input name="customerName" maxLength={80} placeholder="Ex.: Armando" className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-stone-950 outline-none focus:border-red-500" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Observação geral da mesa
          <input name="customerNote" maxLength={300} placeholder="Ex.: entregar talheres extras" className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-stone-950 outline-none focus:border-red-500" />
        </label>
      </div>

      <div className="mt-5 space-y-3">
        {products.map((product) => (
          <article key={product.public_code} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">{product.categoryName}</p>
                <h3 className="mt-1 font-bold text-stone-950">{product.name}</h3>
                {product.description ? <p className="mt-1 text-sm text-stone-500">{product.description}</p> : null}
                <p className="mt-2 text-sm font-black text-red-600">{formatMoneyFromCents(product.price_cents)}</p>
              </div>
              <label className="grid w-24 gap-1 text-xs font-semibold text-stone-600">
                Qtd.
                <input name={`quantity:${product.public_code}`} type="number" min="0" max="99" defaultValue="0" inputMode="numeric" className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-center text-stone-950 outline-none focus:border-red-500" />
              </label>
            </div>
            {product.addons.length > 0 ? (
              <fieldset className="mt-4 rounded-xl border border-stone-200 bg-white p-3">
                <legend className="px-1 text-xs font-black uppercase tracking-wide text-red-600">Adicionais</legend>
                <div className="mt-2 grid gap-2">
                  {product.addons.map((addon) => (
                    <label key={addon.public_code} className="flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800">
                      <input
                        type="checkbox"
                        name={`addon:${product.public_code}:${addon.public_code}`}
                        value="on"
                        className="mt-1 h-4 w-4 rounded border-stone-300 bg-white text-red-500"
                      />
                      <span className="flex-1">
                        <span className="font-semibold">{addon.name}</span>
                        {addon.description ? <span className="block text-xs text-stone-400">{addon.description}</span> : null}
                      </span>
                      <span className="font-black text-red-600">+ {formatMoneyFromCents(addon.price_delta_cents)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <label className="mt-3 grid gap-1 text-xs font-semibold text-stone-600">
              Observação deste item
              <input name={`notes:${product.public_code}`} maxLength={200} placeholder="Ex.: sem cebola, ponto da carne..." className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-950 outline-none focus:border-red-500" />
            </label>
          </article>
        ))}
      </div>

      <button type="submit" className="mt-5 w-full rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-600">
        Enviar pedido para o restaurante
      </button>
    </form>
  );
}
