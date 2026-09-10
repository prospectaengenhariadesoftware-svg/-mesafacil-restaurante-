import Link from 'next/link';
import { createProductAction, deleteProductAction, duplicateProductAction, updateProductAction } from '@/app/actions/catalog';
import { formatMoneyFromCents } from '@/lib/validation/catalog';
import type { Product, ProductCategory } from '@/lib/types/catalog';

type ProductFilters = {
  q: string;
  status: 'all' | 'available' | 'unavailable';
  categoryId: string;
  sort: 'name' | 'price_cents' | 'created_at';
  dir: 'asc' | 'desc';
  page: number;
};

type ProductListProps = {
  tenantId: string;
  products: Product[];
  categories: ProductCategory[];
  filters: ProductFilters;
  total: number;
  pageSize: number;
};

function moneyInputFromCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function buildProductHref(tenantId: string, filters: ProductFilters, overrides: Partial<ProductFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.status !== 'all') params.set('status', next.status);
  if (next.categoryId) params.set('categoryId', next.categoryId);
  if (next.sort !== 'name') params.set('sort', next.sort);
  if (next.dir !== 'asc') params.set('dir', next.dir);
  if (next.page > 1) params.set('page', String(next.page));
  const suffix = params.toString();
  return `/tenants/${tenantId}/produtos${suffix ? `?${suffix}` : ''}`;
}

function CategorySelect({ categories, defaultValue }: Readonly<{ categories: ProductCategory[]; defaultValue?: string }>) {
  return (
    <select name="categoryId" required defaultValue={defaultValue ?? ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400">
      <option value="">Selecione</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}{category.is_active ? '' : ' (inativa)'}
        </option>
      ))}
    </select>
  );
}

export function ProductForm({ tenantId, categories }: Readonly<{ tenantId: string; categories: ProductCategory[] }>) {
  const activeCategories = categories.filter((category) => category.is_active);

  return (
    <form action={createProductAction} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div>
        <h2 className="text-xl font-bold">Cadastrar produto</h2>
        <p className="mt-1 text-sm text-slate-400">Criação real no banco com categoria do mesmo tenant, validação no servidor e auditoria.</p>
      </div>
      <label className="block text-sm font-medium text-slate-300">
        Categoria *
        <CategorySelect categories={activeCategories} />
      </label>
      <label className="block text-sm font-medium text-slate-300">
        Nome do produto *
        <input name="name" required minLength={2} maxLength={120} placeholder="Ex.: Suco natural" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <label className="block text-sm font-medium text-slate-300">
        Descrição
        <textarea name="description" rows={3} placeholder="Ex.: Laranja 500ml" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <label className="block text-sm font-medium text-slate-300">
        Preço *
        <input name="price" required inputMode="decimal" placeholder="Ex.: 12,50" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <label className="block text-sm font-medium text-slate-300">
        URL da imagem
        <input name="imageUrl" type="url" placeholder="https://..." className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input name="isAvailable" type="checkbox" defaultChecked className="size-4 accent-emerald-400" />
        Produto disponível
      </label>
      <button disabled={activeCategories.length === 0} type="submit" className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">Salvar produto</button>
      {activeCategories.length === 0 ? <p className="text-sm text-amber-300">Cadastre ou reative uma categoria antes de cadastrar produtos.</p> : null}
    </form>
  );
}

export function ProductFiltersBar({ tenantId, categories, filters }: Readonly<{ tenantId: string; categories: ProductCategory[]; filters: ProductFilters }>) {
  return (
    <form action={`/tenants/${tenantId}/produtos`} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
      <label className="text-sm font-medium text-slate-300">
        Buscar
        <input name="q" defaultValue={filters.q} placeholder="Nome ou descrição" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <label className="text-sm font-medium text-slate-300">
        Categoria
        <select name="categoryId" defaultValue={filters.categoryId} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 outline-none focus:border-emerald-400">
          <option value="">Todas</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-300">
        Status
        <select name="status" defaultValue={filters.status} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 outline-none focus:border-emerald-400">
          <option value="all">Todos</option>
          <option value="available">Disponíveis</option>
          <option value="unavailable">Indisponíveis</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-300">
        Ordenar por
        <select name="sort" defaultValue={filters.sort} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 outline-none focus:border-emerald-400">
          <option value="name">Nome</option>
          <option value="price_cents">Preço</option>
          <option value="created_at">Data</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-300">
        Direção
        <select name="dir" defaultValue={filters.dir} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 outline-none focus:border-emerald-400">
          <option value="asc">Crescente</option>
          <option value="desc">Decrescente</option>
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button type="submit" className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300">Filtrar</button>
        <Link href={`/tenants/${tenantId}/produtos`} className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-slate-500">Limpar</Link>
      </div>
    </form>
  );
}

export function ProductList({ tenantId, products, categories, filters, total, pageSize }: Readonly<ProductListProps>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">Produtos cadastrados</h2>
          <p className="mt-1 text-sm text-slate-400">{total} registro(s) encontrados com busca, filtros e paginação reais no banco.</p>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300">Página {filters.page} de {totalPages}</span>
      </div>

      <ProductFiltersBar tenantId={tenantId} categories={categories} filters={filters} />

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-6 text-center">
          <p className="font-semibold text-slate-200">Nenhum produto cadastrado.</p>
          <p className="mt-1 text-sm text-slate-400">Cadastre o primeiro produto ou ajuste os filtros da busca.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <article key={product.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-100">{product.name}</h3>
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">{product.is_available ? 'Disponível' : 'Indisponível'}</span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{formatMoneyFromCents(product.price_cents)}</span>
                  </div>
                  <p className="mt-1 text-xs text-emerald-300">Categoria: {product.tenant_product_categories?.name ?? 'Sem categoria visível'}</p>
                  {product.description ? <p className="mt-2 text-sm text-slate-400">{product.description}</p> : null}
                  {product.image_url ? <p className="mt-2 break-all text-xs text-slate-500">Imagem: {product.image_url}</p> : null}
                  <p className="mt-2 text-xs text-slate-500">Atualizado em {new Date(product.updated_at).toLocaleString('pt-BR')}</p>
                </div>
                <form action={duplicateProductAction}>
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="productId" value={product.id} />
                  <button type="submit" className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10">Duplicar</button>
                </form>
              </div>

              <details className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-emerald-200">Editar produto</summary>
                <form action={updateProductAction} className="mt-4 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="productId" value={product.id} />
                  <label className="text-sm font-medium text-slate-300">
                    Categoria *
                    <CategorySelect categories={categories} defaultValue={product.category_id} />
                  </label>
                  <label className="text-sm font-medium text-slate-300">
                    Nome *
                    <input name="name" required minLength={2} maxLength={120} defaultValue={product.name} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
                  </label>
                  <label className="text-sm font-medium text-slate-300">
                    Preço *
                    <input name="price" required inputMode="decimal" defaultValue={moneyInputFromCents(product.price_cents)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
                  </label>
                  <label className="text-sm font-medium text-slate-300">
                    URL da imagem
                    <input name="imageUrl" type="url" defaultValue={product.image_url ?? ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
                  </label>
                  <label className="text-sm font-medium text-slate-300 md:col-span-2">
                    Descrição
                    <textarea name="description" rows={2} defaultValue={product.description ?? ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input name="isAvailable" type="checkbox" defaultChecked={product.is_available} className="size-4 accent-emerald-400" />
                    Produto disponível
                  </label>
                  <div className="flex justify-start md:justify-end">
                    <button type="submit" className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300">Salvar alterações</button>
                  </div>
                </form>
              </details>

              <details className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-red-200">Excluir ou inativar</summary>
                <form action={deleteProductAction} className="mt-4 space-y-3">
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="productId" value={product.id} />
                  <p className="text-sm text-red-100/80">Confirmação obrigatória: se houver pedidos vinculados, o produto será inativado para preservar histórico.</p>
                  <label className="block text-sm font-medium text-slate-300">
                    Digite CONFIRMAR
                    <input name="confirmDelete" required pattern="CONFIRMAR" className="mt-2 w-full max-w-xs rounded-xl border border-red-500/30 bg-slate-950 px-4 py-2 text-slate-100 outline-none focus:border-red-300" />
                  </label>
                  <button type="submit" className="rounded-full border border-red-400/60 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/10">Confirmar exclusão/inativação</button>
                </form>
              </details>
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center">
        <p className="text-sm text-slate-400">Mostrando até {pageSize} registros por página.</p>
        <div className="flex gap-2">
          <Link aria-disabled={filters.page <= 1} href={buildProductHref(tenantId, filters, { page: Math.max(1, filters.page - 1) })} className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 aria-disabled:pointer-events-none aria-disabled:opacity-40">Anterior</Link>
          <Link aria-disabled={filters.page >= totalPages} href={buildProductHref(tenantId, filters, { page: Math.min(totalPages, filters.page + 1) })} className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 aria-disabled:pointer-events-none aria-disabled:opacity-40">Próxima</Link>
        </div>
      </div>
    </section>
  );
}
