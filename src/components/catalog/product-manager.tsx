import { createProductAction } from '@/app/actions/catalog';
import { formatMoneyFromCents } from '@/lib/validation/catalog';
import type { Product, ProductCategory } from '@/lib/types/catalog';

export function ProductForm({ tenantId, categories }: Readonly<{ tenantId: string; categories: ProductCategory[] }>) {
  return (
    <form action={createProductAction} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div>
        <h2 className="text-xl font-bold">Cadastrar produto</h2>
        <p className="mt-1 text-sm text-slate-400">Todo produto precisa estar vinculado a uma categoria.</p>
      </div>
      <label className="block text-sm font-medium text-slate-300">
        Categoria
        <select name="categoryId" required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400">
          <option value="">Selecione</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-300">
        Nome do produto
        <input name="name" required minLength={2} maxLength={120} placeholder="Ex.: Suco natural" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <label className="block text-sm font-medium text-slate-300">
        Descrição
        <textarea name="description" rows={3} placeholder="Ex.: Laranja 500ml" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <label className="block text-sm font-medium text-slate-300">
        Preço
        <input name="price" required inputMode="decimal" placeholder="Ex.: 12,50" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input name="isAvailable" type="checkbox" defaultChecked className="size-4 accent-emerald-400" />
        Produto disponível
      </label>
      <button disabled={categories.length === 0} type="submit" className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">Salvar produto</button>
      {categories.length === 0 ? <p className="text-sm text-amber-300">Cadastre uma categoria antes de cadastrar produtos.</p> : null}
    </form>
  );
}

export function ProductList({ products }: Readonly<{ products: Product[] }>) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-xl font-bold">Produtos cadastrados</h2>
      {products.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Nenhum produto cadastrado ainda.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {products.map((product) => (
            <article key={product.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-100">{product.name}</h3>
                  <p className="mt-1 text-xs text-emerald-300">Categoria: {product.tenant_product_categories?.name ?? 'Sem categoria visível'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-100">{formatMoneyFromCents(product.price_cents)}</p>
                  <span className="text-xs text-slate-400">{product.is_available ? 'Disponível' : 'Indisponível'}</span>
                </div>
              </div>
              {product.description ? <p className="mt-2 text-sm text-slate-400">{product.description}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
