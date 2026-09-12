import Link from 'next/link';
import { createProductAddonAction, deleteProductAddonAction, updateProductAddonAction } from '@/app/actions/catalog';
import type { Product, ProductAddon } from '@/lib/types/catalog';
import { formatMoneyFromCents } from '@/lib/validation/catalog';

type AddonFilters = {
  q: string;
  status: 'all' | 'available' | 'unavailable';
  productId: string;
  sort: 'display_order' | 'name' | 'price_delta_cents' | 'created_at';
  dir: 'asc' | 'desc';
  page: number;
};

type AddonListProps = {
  tenantId: string;
  addons: ProductAddon[];
  products: Product[];
  filters: AddonFilters;
  total: number;
  pageSize: number;
};

function moneyInputFromCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function buildAddonHref(tenantId: string, filters: AddonFilters, overrides: Partial<AddonFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.status !== 'all') params.set('status', next.status);
  if (next.productId) params.set('productId', next.productId);
  if (next.sort !== 'display_order') params.set('sort', next.sort);
  if (next.dir !== 'asc') params.set('dir', next.dir);
  if (next.page > 1) params.set('page', String(next.page));
  const suffix = params.toString();
  return `/tenants/${tenantId}/adicionais${suffix ? `?${suffix}` : ''}`;
}

function ProductSelect({ products, defaultValue }: Readonly<{ products: Product[]; defaultValue?: string }>) {
  return (
    <select name="productId" required defaultValue={defaultValue ?? ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400">
      <option value="">Selecione</option>
      {products.map((product) => (
        <option key={product.id} value={product.id}>
          {product.name}{product.is_available ? '' : ' (indisponível)'}
        </option>
      ))}
    </select>
  );
}

export function ProductAddonForm({ tenantId, products }: Readonly<{ tenantId: string; products: Product[] }>) {
  const availableProducts = products.filter((product) => product.is_available);

  return (
    <form action={createProductAddonAction} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div>
        <h2 className="text-xl font-bold">Cadastrar adicional</h2>
        <p className="mt-1 text-sm text-slate-400">Complementos vinculados a produtos do mesmo tenant, com preço incremental e auditoria transacional.</p>
      </div>
      <label className="block text-sm font-medium text-slate-300">
        Produto *
        <ProductSelect products={availableProducts} />
      </label>
      <label className="block text-sm font-medium text-slate-300">
        Nome do adicional *
        <input name="name" required minLength={2} maxLength={80} placeholder="Ex.: Bacon extra" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <label className="block text-sm font-medium text-slate-300">
        Descrição
        <textarea name="description" rows={3} placeholder="Ex.: Fatia crocante" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-300">
          Acréscimo de preço *
          <input name="priceDelta" required inputMode="decimal" placeholder="Ex.: 4,50" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
        </label>
        <label className="block text-sm font-medium text-slate-300">
          Ordem
          <input name="displayOrder" type="number" min={0} max={999} defaultValue={0} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input name="isAvailable" type="checkbox" defaultChecked className="size-4 accent-emerald-400" />
        Adicional disponível
      </label>
      <button disabled={availableProducts.length === 0} type="submit" className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">Salvar adicional</button>
      {availableProducts.length === 0 ? <p className="text-sm text-amber-300">Cadastre ou reative um produto antes de cadastrar adicionais.</p> : null}
    </form>
  );
}

export function ProductAddonFiltersBar({ tenantId, products, filters }: Readonly<{ tenantId: string; products: Product[]; filters: AddonFilters }>) {
  return (
    <form action={`/tenants/${tenantId}/adicionais`} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
      <label className="text-sm font-medium text-slate-300">
        Buscar
        <input name="q" defaultValue={filters.q} placeholder="Nome ou descrição" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <label className="text-sm font-medium text-slate-300">
        Produto
        <select name="productId" defaultValue={filters.productId} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 outline-none focus:border-emerald-400">
          <option value="">Todos</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
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
          <option value="display_order">Ordem</option>
          <option value="name">Nome</option>
          <option value="price_delta_cents">Preço</option>
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
        <Link href={`/tenants/${tenantId}/adicionais`} className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-slate-500">Limpar</Link>
      </div>
    </form>
  );
}

export function ProductAddonList({ tenantId, addons, products, filters, total, pageSize }: Readonly<AddonListProps>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">Adicionais cadastrados</h2>
          <p className="mt-1 text-sm text-slate-400">{total} registro(s) encontrados com busca, filtros e paginação reais no banco.</p>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300">Página {filters.page} de {totalPages}</span>
      </div>

      <ProductAddonFiltersBar tenantId={tenantId} products={products} filters={filters} />

      {addons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-6 text-center">
          <p className="font-semibold text-slate-200">Nenhum adicional cadastrado.</p>
          <p className="mt-1 text-sm text-slate-400">Cadastre bacon extra, borda, molho, queijo ou ajuste os filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addons.map((addon) => (
            <article key={addon.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-100">{addon.name}</h3>
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">{addon.is_available ? 'Disponível' : 'Indisponível'}</span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">+ {formatMoneyFromCents(addon.price_delta_cents)}</span>
                  </div>
                  <p className="mt-1 text-xs text-emerald-300">Produto: {addon.tenant_products?.name ?? 'Produto não visível'}</p>
                  {addon.description ? <p className="mt-2 text-sm text-slate-400">{addon.description}</p> : null}
                  <p className="mt-2 text-xs text-slate-500">Ordem {addon.display_order} · Atualizado em {new Date(addon.updated_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <details className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-emerald-200">Editar adicional</summary>
                <form action={updateProductAddonAction} className="mt-4 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="addonId" value={addon.id} />
                  <label className="text-sm font-medium text-slate-300">
                    Produto *
                    <ProductSelect products={products} defaultValue={addon.product_id} />
                  </label>
                  <label className="text-sm font-medium text-slate-300">
                    Nome *
                    <input name="name" required minLength={2} maxLength={80} defaultValue={addon.name} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
                  </label>
                  <label className="text-sm font-medium text-slate-300">
                    Acréscimo *
                    <input name="priceDelta" required inputMode="decimal" defaultValue={moneyInputFromCents(addon.price_delta_cents)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
                  </label>
                  <label className="text-sm font-medium text-slate-300">
                    Ordem
                    <input name="displayOrder" type="number" min={0} max={999} defaultValue={addon.display_order} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
                  </label>
                  <label className="text-sm font-medium text-slate-300 md:col-span-2">
                    Descrição
                    <textarea name="description" rows={2} defaultValue={addon.description ?? ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input name="isAvailable" type="checkbox" defaultChecked={addon.is_available} className="size-4 accent-emerald-400" />
                    Adicional disponível
                  </label>
                  <div className="flex justify-start md:justify-end">
                    <button type="submit" className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300">Salvar alterações</button>
                  </div>
                </form>
              </details>

              <details className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-red-200">Excluir</summary>
                <form action={deleteProductAddonAction} className="mt-4 space-y-3">
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="addonId" value={addon.id} />
                  <p className="text-sm text-red-100/80">Confirmação obrigatória para remover o adicional do produto.</p>
                  <label className="block text-sm font-medium text-slate-300">
                    Digite CONFIRMAR
                    <input name="confirmDelete" required pattern="CONFIRMAR" className="mt-2 w-full max-w-xs rounded-xl border border-red-500/30 bg-slate-950 px-4 py-2 text-slate-100 outline-none focus:border-red-300" />
                  </label>
                  <button type="submit" className="rounded-full border border-red-400/60 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/10">Confirmar exclusão</button>
                </form>
              </details>
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center">
        <p className="text-sm text-slate-400">Mostrando até {pageSize} registros por página.</p>
        <div className="flex gap-2">
          <Link aria-disabled={filters.page <= 1} href={buildAddonHref(tenantId, filters, { page: Math.max(1, filters.page - 1) })} className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 aria-disabled:pointer-events-none aria-disabled:opacity-40">Anterior</Link>
          <Link aria-disabled={filters.page >= totalPages} href={buildAddonHref(tenantId, filters, { page: Math.min(totalPages, filters.page + 1) })} className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 aria-disabled:pointer-events-none aria-disabled:opacity-40">Próxima</Link>
        </div>
      </div>
    </section>
  );
}
