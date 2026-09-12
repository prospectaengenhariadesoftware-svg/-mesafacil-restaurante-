import { ProductForm, ProductList } from '@/components/catalog/product-manager';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { Product, ProductCategory } from '@/lib/types/catalog';
import { isUuid } from '@/lib/validation/auth';
import { redirect } from 'next/navigation';

const PAGE_SIZE = 10;
const PRODUCT_SORTS = ['name', 'price_cents', 'created_at'] as const;
const PRODUCT_DIRECTIONS = ['asc', 'desc'] as const;
const PRODUCT_STATUSES = ['all', 'available', 'unavailable'] as const;

type ProductSort = (typeof PRODUCT_SORTS)[number];
type ProductDirection = (typeof PRODUCT_DIRECTIONS)[number];
type ProductStatus = (typeof PRODUCT_STATUSES)[number];

type ProductSearchParams = {
  mensagem?: string;
  erro?: string;
  q?: string;
  status?: string;
  categoryId?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

function cleanSearch(value: string | undefined): string {
  return typeof value === 'string' ? value.trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, ' ').slice(0, 80) : '';
}

function oneOf<T extends readonly string[]>(value: string | undefined, allowed: T, fallback: T[number]): T[number] {
  return value && allowed.includes(value) ? value : fallback;
}

function pageNumber(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 999) : 1;
}

function decodeFeedback(value: string | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value.slice(0, 240) : null;
}

function buildProductsPath(tenantId: string, filters: { q: string; status: ProductStatus; categoryId: string; sort: ProductSort; dir: ProductDirection; page: number }) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.sort !== 'name') params.set('sort', filters.sort);
  if (filters.dir !== 'asc') params.set('dir', filters.dir);
  if (filters.page > 1) params.set('page', String(filters.page));
  const suffix = params.toString();
  return `/tenants/${tenantId}/produtos${suffix ? `?${suffix}` : ''}`;
}

export default async function ProdutosPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<ProductSearchParams>;
}>) {
  const { tenantId } = await params;
  const rawParams = await searchParams;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  await requireActiveTenant(tenantId);

  const filters = {
    q: cleanSearch(rawParams.q),
    status: oneOf(rawParams.status, PRODUCT_STATUSES, 'all') as ProductStatus,
    categoryId: isUuid(rawParams.categoryId ?? '') ? rawParams.categoryId ?? '' : '',
    sort: oneOf(rawParams.sort, PRODUCT_SORTS, 'name') as ProductSort,
    dir: oneOf(rawParams.dir, PRODUCT_DIRECTIONS, 'asc') as ProductDirection,
    page: pageNumber(rawParams.page),
  };
  const from = (filters.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const categoriesQuery = supabase
    .from('tenant_product_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  let productsQuery = supabase
    .from('tenant_products')
    .select('*, tenant_product_categories:tenant_product_categories!tenant_products_category_id_fkey(*)', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filters.q) {
    productsQuery = productsQuery.or(`name.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
  }
  if (filters.status === 'available') productsQuery = productsQuery.eq('is_available', true);
  if (filters.status === 'unavailable') productsQuery = productsQuery.eq('is_available', false);
  if (filters.categoryId) productsQuery = productsQuery.eq('category_id', filters.categoryId);

  const [{ data: categories, error: categoriesError }, { data: products, count, error: productsError }] = await Promise.all([
    categoriesQuery,
    productsQuery
      .order(filters.sort, { ascending: filters.dir === 'asc' })
      .order('name', { ascending: true })
      .range(from, to),
  ]);

  const categoriesList = (categories ?? []) as ProductCategory[];
  const productsList = (products ?? []) as Product[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (!productsError && filters.page > totalPages) {
    redirect(buildProductsPath(tenantId, { ...filters, page: totalPages }));
  }
  const loadError = categoriesError || productsError ? 'Não foi possível carregar produtos/categorias.' : null;
  const feedback = {
    mensagem: decodeFeedback(rawParams.mensagem),
    erro: decodeFeedback(rawParams.erro),
  };

  return (
    <TenantModulePage tenantId={tenantId} module="produtos">
      {loadError ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{loadError}</p> : null}
      {feedback.mensagem ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{feedback.mensagem}</p> : null}
      {feedback.erro ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{feedback.erro}</p> : null}
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.4fr]">
        <ProductForm tenantId={tenantId} categories={categoriesList} />
        <ProductList
          tenantId={tenantId}
          products={productsList}
          categories={categoriesList}
          filters={filters}
          total={total}
          pageSize={PAGE_SIZE}
        />
      </div>
    </TenantModulePage>
  );
}
