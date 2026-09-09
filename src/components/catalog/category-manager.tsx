import { createCategoryAction } from '@/app/actions/catalog';
import type { ProductCategory } from '@/lib/types/catalog';

export function CategoryForm({ tenantId }: Readonly<{ tenantId: string }>) {
  return (
    <form action={createCategoryAction} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div>
        <h2 className="text-xl font-bold">Cadastrar categoria</h2>
        <p className="mt-1 text-sm text-slate-400">Produtos devem pertencer a uma categoria.</p>
      </div>
      <label className="block text-sm font-medium text-slate-300">
        Nome da categoria
        <input name="name" required minLength={2} maxLength={80} placeholder="Ex.: Bebidas" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <label className="block text-sm font-medium text-slate-300">
        Descrição
        <textarea name="description" rows={3} placeholder="Ex.: Sucos, refrigerantes e água" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <button type="submit" className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300">Salvar categoria</button>
    </form>
  );
}

export function CategoryList({ categories }: Readonly<{ categories: ProductCategory[] }>) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-xl font-bold">Categorias cadastradas</h2>
      {categories.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Nenhuma categoria cadastrada ainda.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {categories.map((category) => (
            <article key={category.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-100">{category.name}</h3>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">{category.is_active ? 'Ativa' : 'Inativa'}</span>
              </div>
              {category.description ? <p className="mt-2 text-sm text-slate-400">{category.description}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
