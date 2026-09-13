import Link from 'next/link';
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from '@/app/actions/catalog';
import type { ProductCategory } from '@/lib/types/catalog';

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
    <form action={createCategoryAction} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div>
        <h2 className="text-xl font-bold">Cadastrar categoria</h2>
        <p className="mt-1 text-sm text-stone-500">Criação real no banco, protegida por tenant_id, RLS e permissões.</p>
      </div>
      <label className="block text-sm font-medium text-stone-600">
        Nome da categoria *
        <input name="name" required minLength={2} maxLength={80} placeholder="Ex.: Bebidas" className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="block text-sm font-medium text-stone-600">
        Descrição
        <textarea name="description" rows={3} placeholder="Ex.: Sucos, refrigerantes e água" className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="block text-sm font-medium text-stone-600">
        Ordem de exibição
        <input name="displayOrder" type="number" min={0} max={999} defaultValue={0} className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input name="isActive" type="checkbox" defaultChecked className="size-4 accent-red-500" />
        Categoria ativa
      </label>
      <button type="submit" className="rounded-full bg-red-500 px-5 py-3 text-sm font-bold text-white hover:bg-red-600">Salvar categoria</button>
    </form>
  );
}

export function CategoryFiltersBar({ tenantId, filters }: Readonly<{ tenantId: string; filters: CategoryFilters }>) {
  return (
    <form action={`/tenants/${tenantId}/cardapio`} className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
      <label className="text-sm font-medium text-stone-600">
        Buscar
        <input name="q" defaultValue={filters.q} placeholder="Nome ou descrição" className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="text-sm font-medium text-stone-600">
        Status
        <select name="status" defaultValue={filters.status} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500">
          <option value="all">Todos</option>
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
        </select>
      </label>
      <label className="text-sm font-medium text-stone-600">
        Ordenar por
        <select name="sort" defaultValue={filters.sort} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500">
          <option value="display_order">Ordem</option>
          <option value="name">Nome</option>
          <option value="created_at">Data</option>
        </select>
      </label>
      <label className="text-sm font-medium text-stone-600">
        Direção
        <select name="dir" defaultValue={filters.dir} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500">
          <option value="asc">Crescente</option>
          <option value="desc">Decrescente</option>
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button type="submit" className="rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">Filtrar</button>
        <Link href={`/tenants/${tenantId}/cardapio`} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:border-red-300">Limpar</Link>
      </div>
    </form>
  );
}

export function CategoryList({ tenantId, categories, filters, total, pageSize }: Readonly<CategoryListProps>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">Categorias cadastradas</h2>
          <p className="mt-1 text-sm text-stone-500">{total} registro(s) encontrados com busca, filtros e paginação reais no banco.</p>
        </div>
        <span className="rounded-full bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">Página {filters.page} de {totalPages}</span>
      </div>

      <CategoryFiltersBar tenantId={tenantId} filters={filters} />

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
          <p className="font-semibold text-stone-800">Nenhuma categoria cadastrada.</p>
          <p className="mt-1 text-sm text-stone-500">Cadastre a primeira categoria ou ajuste os filtros da busca.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => (
            <article key={category.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-stone-950">{category.name}</h3>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">{category.is_active ? 'Ativa' : 'Inativa'}</span>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">Ordem {category.display_order}</span>
                  </div>
                  {category.description ? <p className="mt-2 text-sm text-stone-500">{category.description}</p> : null}
                  <p className="mt-2 text-xs text-stone-400">Atualizada em {new Date(category.updated_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <details className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold text-red-600">Editar categoria</summary>
                <form action={updateCategoryAction} className="mt-4 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <label className="text-sm font-medium text-stone-600">
                    Nome *
                    <input name="name" required minLength={2} maxLength={80} defaultValue={category.name} className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2 text-stone-950 outline-none focus:border-red-500" />
                  </label>
                  <label className="text-sm font-medium text-stone-600">
                    Ordem
                    <input name="displayOrder" type="number" min={0} max={999} defaultValue={category.display_order} className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2 text-stone-950 outline-none focus:border-red-500" />
                  </label>
                  <label className="text-sm font-medium text-stone-600 md:col-span-2">
                    Descrição
                    <textarea name="description" rows={2} defaultValue={category.description ?? ''} className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2 text-stone-950 outline-none focus:border-red-500" />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-stone-600">
                    <input name="isActive" type="checkbox" defaultChecked={category.is_active} className="size-4 accent-red-500" />
                    Categoria ativa
                  </label>
                  <div className="flex justify-start md:justify-end">
                    <button type="submit" className="rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">Salvar alterações</button>
                  </div>
                </form>
              </details>

              <details className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-red-700">Excluir ou inativar</summary>
                <form action={deleteCategoryAction} className="mt-4 space-y-3">
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <p className="text-sm text-red-700/80">Confirmação obrigatória: se houver produtos vinculados, a categoria será inativada para preservar histórico e integridade.</p>
                  <label className="block text-sm font-medium text-stone-600">
                    Digite CONFIRMAR
                    <input name="confirmDelete" required pattern="CONFIRMAR" className="mt-2 w-full max-w-xs rounded-xl border border-red-500/30 bg-stone-50 px-4 py-2 text-stone-950 outline-none focus:border-red-300" />
                  </label>
                  <button type="submit" className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50">Confirmar exclusão/inativação</button>
                </form>
              </details>
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center">
        <p className="text-sm text-stone-500">Mostrando até {pageSize} registros por página.</p>
        <div className="flex gap-2">
          <Link aria-disabled={filters.page <= 1} href={buildCategoryHref(tenantId, filters, { page: Math.max(1, filters.page - 1) })} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 aria-disabled:pointer-events-none aria-disabled:opacity-40">Anterior</Link>
          <Link aria-disabled={filters.page >= totalPages} href={buildCategoryHref(tenantId, filters, { page: Math.min(totalPages, filters.page + 1) })} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 aria-disabled:pointer-events-none aria-disabled:opacity-40">Próxima</Link>
        </div>
      </div>
    </section>
  );
}
