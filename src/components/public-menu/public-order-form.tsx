import { createPublicOrderAction } from '@/app/actions/public-order';
import type { PublicMenuPayload } from '@/lib/types/public-menu';
import { formatMoneyFromCents } from '@/lib/validation/catalog';

export function PublicOrderForm({ menu, qrToken }: Readonly<{ menu: PublicMenuPayload; qrToken: string }>) {
  const products = menu.categories.flatMap((category) => category.products.map((product) => ({ ...product, categoryName: category.name })));

  return (
    <form action={createPublicOrderAction} className="rounded-3xl border border-emerald-400/20 bg-slate-900 p-5">
      <input type="hidden" name="restaurantSlug" value={menu.tenant.public_slug} />
      <input type="hidden" name="qrToken" value={qrToken} />

      <div className="border-b border-slate-800 pb-4">
        <p className="text-sm font-semibold text-emerald-300">Fazer pedido</p>
        <h2 className="mt-1 text-2xl font-black">Escolha os itens da mesa {menu.table.number}</h2>
        <p className="mt-2 text-sm text-slate-400">Informe a quantidade desejada em cada produto. Pagamento ainda não está ativado nesta etapa.</p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-200">
          Nome do cliente ou apelido
          <input name="customerName" maxLength={80} placeholder="Ex.: Armando" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-200">
          Observação geral da mesa
          <input name="customerNote" maxLength={300} placeholder="Ex.: entregar talheres extras" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400" />
        </label>
      </div>

      <div className="mt-5 space-y-3">
        {products.map((product) => (
          <article key={product.public_code} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">{product.categoryName}</p>
                <h3 className="mt-1 font-bold text-slate-100">{product.name}</h3>
                {product.description ? <p className="mt-1 text-sm text-slate-400">{product.description}</p> : null}
                <p className="mt-2 text-sm font-black text-emerald-300">{formatMoneyFromCents(product.price_cents)}</p>
              </div>
              <label className="grid w-24 gap-1 text-xs font-semibold text-slate-300">
                Qtd.
                <input name={`quantity:${product.public_code}`} type="number" min="0" max="99" defaultValue="0" inputMode="numeric" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-center text-slate-100 outline-none focus:border-emerald-400" />
              </label>
            </div>
            {product.addons.length > 0 ? (
              <fieldset className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <legend className="px-1 text-xs font-black uppercase tracking-wide text-emerald-300">Adicionais</legend>
                <div className="mt-2 grid gap-2">
                  {product.addons.map((addon) => (
                    <label key={addon.public_code} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        name={`addon:${product.public_code}:${addon.public_code}`}
                        value="on"
                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-400"
                      />
                      <span className="flex-1">
                        <span className="font-semibold">{addon.name}</span>
                        {addon.description ? <span className="block text-xs text-slate-500">{addon.description}</span> : null}
                      </span>
                      <span className="font-black text-emerald-300">+ {formatMoneyFromCents(addon.price_delta_cents)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <label className="mt-3 grid gap-1 text-xs font-semibold text-slate-300">
              Observação deste item
              <input name={`notes:${product.public_code}`} maxLength={200} placeholder="Ex.: sem cebola, ponto da carne..." className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400" />
            </label>
          </article>
        ))}
      </div>

      <button type="submit" className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300">
        Enviar pedido para o restaurante
      </button>
    </form>
  );
}
