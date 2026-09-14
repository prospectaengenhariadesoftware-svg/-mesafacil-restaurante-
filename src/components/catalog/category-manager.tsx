import Link from 'next/link';
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from '@/app/actions/catalog';
import type { ProductCategory } from '@/lib/types/catalog';
import { CreateModal } from '@/components/ui/create-modal';

type CategoryFilters = {
  q: string;
  status: 'all' | 'active' | 'inactive';
  sort: 'display_order' | 'name' | 'created_at';
  dir: 'asc' | 'desc';
  page: number;
};

type CategoryListProps = {
  tenantId: string;
  categories: ProductCategory[];
  filters: CategoryFilters;
  total: number;
  pageSize: number;
};

function buildCategoryHref(tenantId: string, filters: CategoryFilters, overrides: Partial<CategoryFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.status !== 'all') params.set('status', next.status);
  if (next.sort !== 'display_order') params.set('sort', next.sort);
  if (next.dir !== 'asc') params.set('dir', next.dir);
  if (next.page > 1) params.set('page', String(next.page));
  const suffix = params.toString();
  return `/tenants/${tenantId}/cardapio${suffix ? `?${suffix}` : ''}`;
}

export function CategoryForm({ tenantId }: Readonly<{ tenantId: string }>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/70">
      <div>
        <p className="text-sm font-black text-red-600">Cardápio</p>
        <h2 className="text-xl font-black tracking-tight">Organize por categorias</h2>
        <p className="mt-1 text-sm text-stone-500">Cadastre grupos como bebidas, pratos, sobremesas e promoções.</p>
      </div>
      <CreateModal
        triggerLabel="+ Nova categoria"
        eyebrow="Cadastro"
        title="Nova categoria"
        description="Criação real no banco, protegida por tenant_id, RLS e permissões."
      >
        <form action={createCategoryAction}>
          <input type="hidden" name="tenantId" value={tenantId} />
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-bold text-stone-700">
              Nome da categoria *
              <input name="name" required minLength={2} maxLength={80} placeholder="Ex.: Bebidas" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
            </label>
            <label className="block text-sm font-bold text-stone-700">
              Descrição
              <textarea name="description" rows={3} placeholder="Ex.: Sucos, refrigerantes e água" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
            </label>
            <label className="block text-sm font-bold text-stone-700">
              Ordem de exibição
              <input name="displayOrder" type="number" min={0} max={999} defaultValue={0} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
              <input name="isActive" type="checkbox" defaultChecked className="size-4 accent-red-500" />
              Categoria ativa
            </label>
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-500">Ao salvar, a categoria aparece nos cards abaixo.</p>
            <button type="submit" className="min-h-12 rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white hover:bg-red-700">Salvar categoria</button>
          </div>
        </form>
      </CreateModal>
    </div>
  );
}

export function CategoryFiltersBar({ tenantId, filters }: Readonly<{ tenantId: string; filters: CategoryFilters }>) {
  return (
    <form action={`/tenants/${tenantId}/cardapio`} className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
      <label className="text-sm font-bold text-stone-600">
        Buscar
        <input name="q" defaultValue={filters.q} placeholder="Nome ou descrição" className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="text-sm font-bold text-stone-600">
        Status
        <select name="status" defaultValue={filters.status} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500">
          <option value="all">Todos</option>
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
        </select>
      </label>
      <label className="text-sm font-bold text-stone-600">
        Ordenar por
        <select name="sort" defaultValue={filters.sort} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500">
          <option value="display_order">Ordem</option>
          <option value="name">Nome</option>
          <option value="created_at">Data</option>
        </select>
      </label>
      <label className="text-sm font-bold text-stone-600">
        Direção
        <select name="dir" defaultValue={filters.dir} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500">
          <option value="asc">Crescente</option>
          <option value="desc">Decrescente</option>
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button type="submit" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700">Filtrar</button>
        <Link href={`/tenants/${tenantId}/cardapio`} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold text-stone-600 hover:border-red-300">Limpar</Link>
      </div>
    </form>
  );
}

export function CategoryList({ tenantId, categories, filters, total, pageSize }: Readonly<CategoryListProps>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4 rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Categorias cadastradas</h2>
          <p className="mt-1 text-sm text-stone-500">{total} registro(s) encontrados com busca, filtros e paginação reais no banco.</p>
        </div>
        <span className="rounded-full bg-stone-50 px-3 py-1 text-xs font-black text-stone-600">Página {filters.page} de {totalPages}</span>
      </div>

      <CategoryFiltersBar tenantId={tenantId} filters={filters} />

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
          <p className="font-bold text-stone-800">Nenhuma categoria cadastrada.</p>
          <p className="mt-1 text-sm text-stone-500">Cadastre a primeira categoria ou ajuste os filtros da busca.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article key={category.id} className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm shadow-stone-200/70">
              <div className="bg-gradient-to-br from-red-50 via-white to-amber-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl shadow-sm">☰</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${category.is_active ? 'bg-red-100 text-red-700' : 'bg-stone-200 text-stone-600'}`}>{category.is_active ? 'Ativa' : 'Inativa'}</span>
                </div>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-stone-400">Ordem {category.display_order}</p>
                <h3 className="mt-1 text-xl font-black leading-7 text-stone-950">{category.name}</h3>
                {category.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{category.description}</p> : <p className="mt-2 text-sm text-stone-400">Sem descrição cadastrada.</p>}
                <p className="mt-4 text-xs text-stone-400">Atualizada em {new Date(category.updated_at).toLocaleString('pt-BR')}</p>
              </div>

              <details className="mx-4 mb-4 mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <summary className="cursor-pointer text-sm font-black text-red-600">Editar categoria</summary>
                <form action={updateCategoryAction} className="mt-4 grid gap-3">
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <label className="text-sm font-bold text-stone-700">
                    Nome *
                    <input name="name" required minLength={2} maxLength={80} defaultValue={category.name} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500" />
                  </label>
                  <label className="text-sm font-bold text-stone-700">
                    Ordem
                    <input name="displayOrder" type="number" min={0} max={999} defaultValue={category.display_order} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500" />
                  </label>
                  <label className="text-sm font-bold text-stone-700">
                    Descrição
                    <textarea name="description" rows={2} defaultValue={category.description ?? ''} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500" />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
                    <input name="isActive" type="checkbox" defaultChecked={category.is_active} className="size-4 accent-red-500" />
                    Categoria ativa
                  </label>
                  <button type="submit" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700">Salvar alterações</button>
                </form>
              </details>

              <details className="mx-4 mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                <summary className="cursor-pointer text-sm font-black text-red-700">Excluir ou inativar</summary>
                <form action={deleteCategoryAction} className="mt-4 space-y-3">
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <p className="text-sm text-red-700/80">Se houver produtos vinculados, a categoria será inativada para preservar histórico e integridade.</p>
                  <label className="block text-sm font-bold text-stone-700">
                    Digite CONFIRMAR
                    <input name="confirmDelete" required pattern="CONFIRMAR" className="mt-2 w-full rounded-xl border border-red-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500" />
                  </label>
                  <button type="submit" className="rounded-xl border border-red-200 px-4 py-2 text-sm font-black text-red-700 hover:bg-white">Confirmar exclusão/inativação</button>
                </form>
              </details>
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center">
        <p className="text-sm text-stone-500">Mostrando até {pageSize} registros por página.</p>
        <div className="flex gap-2">
          <Link aria-disabled={filters.page <= 1} href={buildCategoryHref(tenantId, filters, { page: Math.max(1, filters.page - 1) })} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold text-stone-600 aria-disabled:pointer-events-none aria-disabled:opacity-40">Anterior</Link>
          <Link aria-disabled={filters.page >= totalPages} href={buildCategoryHref(tenantId, filters, { page: Math.min(totalPages, filters.page + 1) })} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold text-stone-600 aria-disabled:pointer-events-none aria-disabled:opacity-40">Próxima</Link>
        </div>
      </div>
    </section>
  );
}
