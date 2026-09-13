import Link from 'next/link';
import { createProductAction, deleteProductAction, duplicateProductAction, updateProductAction } from '@/app/actions/catalog';
import { formatMoneyFromCents } from '@/lib/validation/catalog';
import type { Product, ProductCategory } from '@/lib/types/catalog';
import { CreateModal } from '@/components/ui/create-modal';

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
    <select name="categoryId" required defaultValue={defaultValue ?? ''} className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500">
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/70">
      <div>
        <p className="text-sm font-black text-red-600">Produtos</p>
        <h2 className="text-xl font-black tracking-tight">Cadastre sem sair da lista</h2>
        <p className="mt-1 text-sm text-stone-500">Use o botão para abrir o pop-up de cadastro.</p>
      </div>
      <CreateModal
        triggerLabel="+ Novo produto"
        eyebrow="Cadastro"
        title="Novo produto"
        description="Envie a foto do prato pelo computador ou celular. O MesaFácil salva a imagem e gera o link automaticamente."
      >
        <form action={createProductAction} encType="multipart/form-data">
          <input type="hidden" name="tenantId" value={tenantId} />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold text-stone-700">
              Categoria *
              <CategorySelect categories={activeCategories} />
            </label>
            <label className="block text-sm font-bold text-stone-700">
              Nome do produto *
              <input name="name" required minLength={2} maxLength={120} placeholder="Ex.: Suco natural" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
            </label>
            <label className="block text-sm font-bold text-stone-700">
              Preço *
              <input name="price" required inputMode="decimal" placeholder="Ex.: 12,50" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
            </label>
            <label className="block text-sm font-bold text-stone-700">
              Foto do prato
              <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 file:mr-4 file:rounded-full file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-red-700" />
              <span className="mt-1 block text-xs text-stone-500">Escolha uma imagem do celular/computador. O sistema gera o link automaticamente. PNG, JPEG ou WEBP até 2 MB.</span>
            </label>
            <label className="block text-sm font-bold text-stone-700 md:col-span-2">
              Descrição
              <textarea name="description" rows={3} placeholder="Ex.: Laranja 500ml" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
              <input name="isAvailable" type="checkbox" defaultChecked className="size-4 accent-red-500" />
              Produto disponível
            </label>
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            {activeCategories.length === 0 ? <p className="text-sm text-amber-700">Cadastre ou reative uma categoria antes de cadastrar produtos.</p> : <p className="text-sm text-stone-500">Ao salvar, o produto aparece nos cards abaixo.</p>}
            <button disabled={activeCategories.length === 0} type="submit" className="min-h-12 rounded-full bg-red-600 px-6 py-3 text-sm font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500">Salvar produto</button>
          </div>
        </form>
      </CreateModal>
    </div>
  );
}

export function ProductFiltersBar({ tenantId, categories, filters }: Readonly<{ tenantId: string; categories: ProductCategory[]; filters: ProductFilters }>) {
  return (
    <form action={`/tenants/${tenantId}/produtos`} className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
      <label className="text-sm font-medium text-stone-600">
        Buscar
        <input name="q" defaultValue={filters.q} placeholder="Nome ou descrição" className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="text-sm font-medium text-stone-600">
        Categoria
        <select name="categoryId" defaultValue={filters.categoryId} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-500">
          <option value="">Todas</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
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
          <option value="name">Nome</option>
          <option value="price_cents">Preço</option>
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
        <Link href={`/tenants/${tenantId}/produtos`} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:border-red-300">Limpar</Link>
      </div>
    </form>
  );
}

export function ProductList({ tenantId, products, categories, filters, total, pageSize }: Readonly<ProductListProps>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4 rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Produtos cadastrados</h2>
          <p className="mt-1 text-sm text-stone-500">{total} registro(s) encontrados com busca, filtros e paginação reais no banco.</p>
        </div>
        <span className="rounded-full bg-stone-50 px-3 py-1 text-xs font-black text-stone-600">Página {filters.page} de {totalPages}</span>
      </div>

      <ProductFiltersBar tenantId={tenantId} categories={categories} filters={filters} />

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
          <p className="font-semibold text-stone-800">Nenhum produto cadastrado.</p>
          <p className="mt-1 text-sm text-stone-500">Cadastre o primeiro produto ou ajuste os filtros da busca.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm shadow-stone-200/70">
              {product.image_url ? (
                <span aria-label={`Imagem de ${product.name}`} role="img" className="block aspect-[4/3] w-full bg-stone-100 bg-cover bg-center" style={{ backgroundImage: `url(${product.image_url})` }} />
              ) : (
                <span aria-hidden className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-red-50 to-amber-50 text-4xl">🍽️</span>
              )}
              <div className="flex flex-col gap-3 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black leading-6 text-stone-950">{product.name}</h3>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">{product.is_available ? 'Disponível' : 'Indisponível'}</span>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-700">{formatMoneyFromCents(product.price_cents)}</span>
                  </div>
                  <p className="mt-1 text-xs text-red-600">Categoria: {product.tenant_product_categories?.name ?? 'Sem categoria visível'}</p>
                  {product.description ? <p className="mt-2 text-sm text-stone-500">{product.description}</p> : null}
                  <p className="mt-2 text-xs text-stone-400">Atualizado em {new Date(product.updated_at).toLocaleString('pt-BR')}</p>
                </div>
                <form action={duplicateProductAction} className="mt-1">
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="productId" value={product.id} />
                  <button type="submit" className="w-full rounded-full border border-red-200 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-50">Duplicar</button>
                </form>
              </div>

              <div className="mx-4 mb-4">
                <CreateModal
                  triggerLabel="Editar prato"
                  eyebrow="Edição"
                  title={`Editar ${product.name}`}
                  description="Altere os dados do prato. Para trocar a foto, envie uma nova imagem; o sistema gera o link automaticamente."
                >
                  <form action={updateProductAction} encType="multipart/form-data">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="productId" value={product.id} />
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="text-sm font-bold text-stone-700">
                        Categoria *
                        <CategorySelect categories={categories} defaultValue={product.category_id} />
                      </label>
                      <label className="text-sm font-bold text-stone-700">
                        Nome *
                        <input name="name" required minLength={2} maxLength={120} defaultValue={product.name} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
                      </label>
                      <label className="text-sm font-bold text-stone-700">
                        Preço *
                        <input name="price" required inputMode="decimal" defaultValue={moneyInputFromCents(product.price_cents)} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
                      </label>
                      <label className="text-sm font-bold text-stone-700">
                        Trocar foto do prato
                        <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 file:mr-4 file:rounded-full file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-red-700" />
                        <span className="mt-1 block text-xs text-stone-500">Envie uma nova imagem apenas se quiser substituir a atual. PNG, JPEG ou WEBP até 2 MB.</span>
                      </label>
                      {product.image_url ? (
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 md:col-span-2">
                          <p className="text-sm font-bold text-stone-700">Imagem atual</p>
                          <div className="mt-2 grid gap-3 sm:grid-cols-[120px_1fr] sm:items-center">
                            <span aria-label={`Imagem atual de ${product.name}`} role="img" className="block aspect-square rounded-2xl bg-stone-100 bg-cover bg-center" style={{ backgroundImage: `url(${product.image_url})` }} />
                            <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
                              <input name="removeImage" type="checkbox" className="size-4 accent-red-500" />
                              Remover imagem atual ao salvar
                            </label>
                          </div>
                        </div>
                      ) : null}
                      <label className="text-sm font-bold text-stone-700 md:col-span-2">
                        Descrição
                        <textarea name="description" rows={3} defaultValue={product.description ?? ''} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
                      </label>
                      <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
                        <input name="isAvailable" type="checkbox" defaultChecked={product.is_available} className="size-4 accent-red-500" />
                        Produto disponível
                      </label>
                    </div>
                    <div className="mt-6 flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-stone-500">A imagem técnica fica salva automaticamente no sistema.</p>
                      <button type="submit" className="min-h-12 rounded-full bg-red-600 px-6 py-3 text-sm font-black text-white hover:bg-red-700">Salvar alterações</button>
                    </div>
                  </form>
                </CreateModal>
              </div>

              <details className="mx-4 mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-red-700">Excluir ou inativar</summary>
                <form action={deleteProductAction} className="mt-4 space-y-3">
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="productId" value={product.id} />
                  <p className="text-sm text-red-700/80">Confirmação obrigatória: se houver pedidos vinculados, o produto será inativado para preservar histórico.</p>
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
          <Link aria-disabled={filters.page <= 1} href={buildProductHref(tenantId, filters, { page: Math.max(1, filters.page - 1) })} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 aria-disabled:pointer-events-none aria-disabled:opacity-40">Anterior</Link>
          <Link aria-disabled={filters.page >= totalPages} href={buildProductHref(tenantId, filters, { page: Math.min(totalPages, filters.page + 1) })} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 aria-disabled:pointer-events-none aria-disabled:opacity-40">Próxima</Link>
        </div>
      </div>
    </section>
  );
}
