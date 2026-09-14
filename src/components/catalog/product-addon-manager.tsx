import Link from 'next/link';
import { createProductAddonAction, deleteProductAddonAction, updateProductAddonAction } from '@/app/actions/catalog';
import type { Product, ProductAddon } from '@/lib/types/catalog';
import { formatMoneyFromCents } from '@/lib/validation/catalog';
import { CreateModal } from '@/components/ui/create-modal';

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
    <select name="productId" required defaultValue={defaultValue ?? ''} className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500">
      <option value="">Selecione</option>
      {products.map((product) => (
        <option key={product.id} value={product.id}>
          {product.name}{product.is_available ? '' : ' (indisponível)'}
        </option>
      ))}
    </select>
  );
}

function AddonFields({ products, addon }: Readonly<{ products: Product[]; addon?: ProductAddon }>) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-medium text-stone-600 md:col-span-2">
        Produto *
        <ProductSelect products={products} defaultValue={addon?.product_id} />
      </label>
      <label className="text-sm font-medium text-stone-600">
        Nome do adicional *
        <input name="name" required minLength={2} maxLength={80} defaultValue={addon?.name ?? ''} placeholder="Ex.: Bacon extra" className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="text-sm font-medium text-stone-600">
        Acréscimo de preço *
        <input name="priceDelta" required inputMode="decimal" defaultValue={addon ? moneyInputFromCents(addon.price_delta_cents) : ''} placeholder="Ex.: 4,50" className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="text-sm font-medium text-stone-600">
        Ordem
        <input name="displayOrder" type="number" min={0} max={999} defaultValue={addon?.display_order ?? 0} className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700">
        <input name="isAvailable" type="checkbox" defaultChecked={addon?.is_available ?? true} className="size-4 accent-red-500" />
        Adicional disponível para o cliente
      </label>
      <label className="text-sm font-medium text-stone-600 md:col-span-2">
        Descrição
        <textarea name="description" rows={3} defaultValue={addon?.description ?? ''} placeholder="Ex.: Fatia crocante, molho extra, borda recheada..." className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
      </label>
    </div>
  );
}

export function ProductAddonForm({ tenantId, products }: Readonly<{ tenantId: string; products: Product[] }>) {
  const availableProducts = products.filter((product) => product.is_available);

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Complementos</p>
          <h2 className="mt-1 text-xl font-bold text-stone-950">Adicionais dos pratos</h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-500">Cadastre itens como bacon, queijo, molho, borda ou extras vinculados a um prato.</p>
        </div>
        <CreateModal
          triggerLabel="+ Novo adicional"
          eyebrow="Novo complemento"
          title="Cadastrar adicional"
          description="Escolha o prato, informe o preço adicional e deixe disponível no cardápio quando fizer sentido."
        >
          <form action={createProductAddonAction} className="space-y-5">
            <input type="hidden" name="tenantId" value={tenantId} />
            <AddonFields products={availableProducts} />
            {availableProducts.length === 0 ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Cadastre ou reative um produto antes de cadastrar adicionais.</p> : null}
            <button disabled={availableProducts.length === 0} type="submit" className="min-h-11 rounded-xl bg-red-500 px-5 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500">Salvar adicional</button>
          </form>
        </CreateModal>
      </div>
    </section>
  );
}

export function ProductAddonFiltersBar({ tenantId, products, filters }: Readonly<{ tenantId: string; products: Product[]; filters: AddonFilters }>) {
  return (
    <form action={`/tenants/${tenantId}/adicionais`} className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
      <label className="text-sm font-medium text-stone-600">
        Buscar
        <input name="q" defaultValue={filters.q} placeholder="Nome ou descrição" className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="text-sm font-medium text-stone-600">
        Produto
        <select name="productId" defaultValue={filters.productId} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500">
          <option value="">Todos</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-stone-600">
        Status
        <select name="status" defaultValue={filters.status} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500">
          <option value="all">Todos</option>
          <option value="available">Disponíveis</option>
          <option value="unavailable">Indisponíveis</option>
        </select>
      </label>
      <label className="text-sm font-medium text-stone-600">
        Ordenar por
        <select name="sort" defaultValue={filters.sort} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500">
          <option value="display_order">Ordem</option>
          <option value="name">Nome</option>
          <option value="price_delta_cents">Preço</option>
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
        <button type="submit" className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">Filtrar</button>
        <Link href={`/tenants/${tenantId}/adicionais`} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:border-red-300">Limpar</Link>
      </div>
    </form>
  );
}

export function ProductAddonList({ tenantId, addons, products, filters, total, pageSize }: Readonly<AddonListProps>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Catálogo</p>
          <h2 className="mt-1 text-xl font-bold text-stone-950">Adicionais cadastrados</h2>
          <p className="mt-1 text-sm text-stone-500">{total} registro(s) encontrados com busca, filtros e paginação reais no banco.</p>
        </div>
        <span className="w-fit rounded-full bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">Página {filters.page} de {totalPages}</span>
      </div>

      <ProductAddonFiltersBar tenantId={tenantId} products={products} filters={filters} />

      {addons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
          <p className="font-semibold text-stone-800">Nenhum adicional cadastrado.</p>
          <p className="mt-1 text-sm text-stone-500">Cadastre bacon extra, borda, molho, queijo ou ajuste os filtros.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {addons.map((addon) => (
            <article key={addon.id} className="flex min-h-full flex-col rounded-3xl border border-stone-200 bg-stone-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-white hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl">➕</div>
                  <div className="min-w-0">
                    <h3 className="break-words font-bold text-stone-950">{addon.name}</h3>
                    <p className="break-words text-xs font-semibold text-red-600">{addon.tenant_products?.name ?? 'Produto não visível'}</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${addon.is_available ? 'bg-green-50 text-green-700' : 'bg-stone-200 text-stone-600'}`}>
                  {addon.is_available ? 'Disponível' : 'Indisponível'}
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Acréscimo</p>
                <p className="mt-1 text-2xl font-black text-stone-950">+ {formatMoneyFromCents(addon.price_delta_cents)}</p>
                {addon.description ? <p className="mt-3 break-words text-sm text-stone-600">{addon.description}</p> : <p className="mt-3 text-sm text-stone-400">Sem descrição cadastrada.</p>}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-stone-500">
                <span className="rounded-2xl bg-white px-3 py-2">Ordem: <strong className="text-stone-800">{addon.display_order}</strong></span>
                <span className="rounded-2xl bg-white px-3 py-2">Atualizado: <strong className="text-stone-800">{new Date(addon.updated_at).toLocaleDateString('pt-BR')}</strong></span>
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row">
                <CreateModal
                  triggerLabel="Editar adicional"
                  eyebrow="Editar complemento"
                  title={addon.name}
                  description="Atualize o prato vinculado, preço, disponibilidade e descrição deste adicional."
                >
                  <form action={updateProductAddonAction} className="space-y-5">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="addonId" value={addon.id} />
                    <AddonFields products={products} addon={addon} />
                    <button type="submit" className="min-h-11 rounded-xl bg-red-500 px-5 py-3 text-sm font-bold text-white hover:bg-red-600">Salvar alterações</button>
                  </form>
                </CreateModal>

                <details className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-1">
                  <summary className="cursor-pointer font-bold">Excluir</summary>
                  <form action={deleteProductAddonAction} className="mt-4 space-y-3">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="addonId" value={addon.id} />
                    <p className="text-sm text-red-700/80">Confirme para remover este adicional do produto.</p>
                    <label className="block text-sm font-medium text-stone-700">
                      Digite CONFIRMAR
                      <input name="confirmDelete" required pattern="CONFIRMAR" className="mt-2 w-full rounded-xl border border-red-200 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-400" />
                    </label>
                    <button type="submit" className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100">Confirmar exclusão</button>
                  </form>
                </details>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center">
        <p className="text-sm text-stone-500">Mostrando até {pageSize} registros por página.</p>
        <div className="flex gap-2">
          <Link aria-disabled={filters.page <= 1} href={buildAddonHref(tenantId, filters, { page: Math.max(1, filters.page - 1) })} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 aria-disabled:pointer-events-none aria-disabled:opacity-40">Anterior</Link>
          <Link aria-disabled={filters.page >= totalPages} href={buildAddonHref(tenantId, filters, { page: Math.min(totalPages, filters.page + 1) })} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 aria-disabled:pointer-events-none aria-disabled:opacity-40">Próxima</Link>
        </div>
      </div>
    </section>
  );
}
