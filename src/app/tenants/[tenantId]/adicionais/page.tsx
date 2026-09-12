import { ProductAddonForm, ProductAddonList } from '@/components/catalog/product-addon-manager';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { Product, ProductAddon } from '@/lib/types/catalog';
import { isUuid } from '@/lib/validation/auth';
import { redirect } from 'next/navigation';

const PAGE_SIZE = 10;
const ADDON_SORTS = ['display_order', 'name', 'price_delta_cents', 'created_at'] as const;
const ADDON_DIRECTIONS = ['asc', 'desc'] as const;
const ADDON_STATUSES = ['all', 'available', 'unavailable'] as const;

type AddonSort = (typeof ADDON_SORTS)[number];
type AddonDirection = (typeof ADDON_DIRECTIONS)[number];
type AddonStatus = (typeof ADDON_STATUSES)[number];

type AddonSearchParams = {
  mensagem?: string;
  erro?: string;
  q?: string;
  status?: string;
  productId?: string;
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

function buildAddonsPath(tenantId: string, filters: { q: string; status: AddonStatus; productId: string; sort: AddonSort; dir: AddonDirection; page: number }) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.productId) params.set('productId', filters.productId);
  if (filters.sort !== 'display_order') params.set('sort', filters.sort);
  if (filters.dir !== 'asc') params.set('dir', filters.dir);
  if (filters.page > 1) params.set('page', String(filters.page));
  const suffix = params.toString();
  return `/tenants/${tenantId}/adicionais${suffix ? `?${suffix}` : ''}`;
}

export default async function AdicionaisPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<AddonSearchParams>;
}>) {
  const { tenantId } = await params;
  const rawParams = await searchParams;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  await requireActiveTenant(tenantId);

  const filters = {
    q: cleanSearch(rawParams.q),
    status: oneOf(rawParams.status, ADDON_STATUSES, 'all') as AddonStatus,
    productId: isUuid(rawParams.productId ?? '') ? rawParams.productId ?? '' : '',
    sort: oneOf(rawParams.sort, ADDON_SORTS, 'display_order') as AddonSort,
    dir: oneOf(rawParams.dir, ADDON_DIRECTIONS, 'asc') as AddonDirection,
    page: pageNumber(rawParams.page),
  };
  const from = (filters.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const productsQuery = supabase
    .from('tenant_products')
    .select('*, tenant_product_categories(*)')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });

  let addonsQuery = supabase
    .from('tenant_product_addons')
    .select('*, tenant_products(*)', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filters.q) {
    addonsQuery = addonsQuery.or(`name.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
  }
  if (filters.status === 'available') addonsQuery = addonsQuery.eq('is_available', true);
  if (filters.status === 'unavailable') addonsQuery = addonsQuery.eq('is_available', false);
  if (filters.productId) addonsQuery = addonsQuery.eq('product_id', filters.productId);

  const [{ data: products, error: productsError }, { data: addons, count, error: addonsError }] = await Promise.all([
    productsQuery,
    addonsQuery
      .order(filters.sort, { ascending: filters.dir === 'asc' })
      .order('name', { ascending: true })
      .range(from, to),
  ]);

  const productsList = (products ?? []) as Product[];
  const addonsList = (addons ?? []) as ProductAddon[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (!addonsError && filters.page > totalPages) {
    redirect(buildAddonsPath(tenantId, { ...filters, page: totalPages }));
  }
  const loadError = productsError || addonsError ? 'Não foi possível carregar adicionais/produtos.' : null;
  const feedback = {
    mensagem: decodeFeedback(rawParams.mensagem),
    erro: decodeFeedback(rawParams.erro),
  };

  return (
    <TenantModulePage tenantId={tenantId} module="adicionais">
      {loadError ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{loadError}</p> : null}
      {feedback.mensagem ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{feedback.mensagem}</p> : null}
      {feedback.erro ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{feedback.erro}</p> : null}
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.4fr]">
        <ProductAddonForm tenantId={tenantId} products={productsList} />
        <ProductAddonList
          tenantId={tenantId}
          addons={addonsList}
          products={productsList}
          filters={filters}
          total={total}
          pageSize={PAGE_SIZE}
        />
      </div>
    </TenantModulePage>
  );
}
