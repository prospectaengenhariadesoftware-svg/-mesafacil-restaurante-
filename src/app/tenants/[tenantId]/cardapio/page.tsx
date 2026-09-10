import { CategoryForm, CategoryList } from '@/components/catalog/category-manager';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { ProductCategory } from '@/lib/types/catalog';
import { isUuid } from '@/lib/validation/auth';
import { redirect } from 'next/navigation';

const PAGE_SIZE = 10;

type CategorySearchParams = {
  mensagem?: string;
  erro?: string;
  q?: string;
  status?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

function cleanSearch(value: string | undefined): string {
  return typeof value === 'string' ? value.trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, ' ').slice(0, 80) : '';
}

function parseFilters(searchParams: CategorySearchParams) {
  const sortValues = ['display_order', 'name', 'created_at'] as const;
  const dirValues = ['asc', 'desc'] as const;
  const statusValues = ['all', 'active', 'inactive'] as const;
  const pageNumber = Number(searchParams.page ?? '1');

  return {
    q: cleanSearch(searchParams.q),
    status: statusValues.includes(searchParams.status as (typeof statusValues)[number]) ? searchParams.status as 'all' | 'active' | 'inactive' : 'all',
    sort: sortValues.includes(searchParams.sort as (typeof sortValues)[number]) ? searchParams.sort as 'display_order' | 'name' | 'created_at' : 'display_order',
    dir: dirValues.includes(searchParams.dir as (typeof dirValues)[number]) ? searchParams.dir as 'asc' | 'desc' : 'asc',
    page: Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1,
  };
}

export default async function CardapioPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<CategorySearchParams>;
}>) {
  const { tenantId } = await params;
  const feedback = await searchParams;
  const filters = parseFilters(feedback);
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  await requireActiveTenant(tenantId);

  const supabase = await createClient();
  const from = (filters.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let query = supabase
    .from('tenant_product_categories')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filters.q) {
    query = query.or(`name.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
  }

  if (filters.status === 'active') query = query.eq('is_active', true);
  if (filters.status === 'inactive') query = query.eq('is_active', false);

  const { data, count, error } = await query
    .order(filters.sort, { ascending: filters.dir === 'asc' })
    .order('name', { ascending: true })
    .range(from, to);

  const loadError = error ? 'Não foi possível carregar categorias.' : null;
  const categories = (data ?? []) as ProductCategory[];

  return (
    <TenantModulePage tenantId={tenantId} module="cardapio">
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.5fr]">
        <CategoryForm tenantId={tenantId} />
        <CategoryList tenantId={tenantId} categories={categories} filters={filters} total={count ?? 0} pageSize={PAGE_SIZE} />
      </div>
      {loadError ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{loadError}</p> : null}
      {feedback.mensagem ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{feedback.mensagem}</p> : null}
      {feedback.erro ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{feedback.erro}</p> : null}
    </TenantModulePage>
  );
}
