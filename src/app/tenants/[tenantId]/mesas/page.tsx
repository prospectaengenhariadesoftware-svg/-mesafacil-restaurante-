import { TableForm, TableList } from '@/components/catalog/table-manager';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { RestaurantTable } from '@/lib/types/catalog';
import { isUuid } from '@/lib/validation/auth';
import { redirect } from 'next/navigation';

const PAGE_SIZE = 10;
const STATUSES = ['all', 'active', 'inactive'] as const;
const SORTS = ['number', 'seats', 'created_at'] as const;
const DIRECTIONS = ['asc', 'desc'] as const;

type TableStatus = (typeof STATUSES)[number];
type TableSort = (typeof SORTS)[number];
type TableDirection = (typeof DIRECTIONS)[number];

function cleanSearch(value: string | undefined): string {
  return typeof value === 'string' ? value.trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, ' ').slice(0, 80) : '';
}

function oneOf<T extends readonly string[]>(value: string | undefined, allowed: T, fallback: T[number]): T[number] {
  return allowed.includes(value ?? '') ? (value as T[number]) : fallback;
}

function parsePage(value: string | undefined): number {
  const parsed = Number(value ?? '1');
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 999) : 1;
}

function decodeFeedback(value: string | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value.slice(0, 240) : null;
}

function buildTablesPath(tenantId: string, filters: { q: string; status: TableStatus; sort: TableSort; dir: TableDirection; page: number }) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.sort !== 'number') params.set('sort', filters.sort);
  if (filters.dir !== 'asc') params.set('dir', filters.dir);
  if (filters.page > 1) params.set('page', String(filters.page));
  const suffix = params.toString();
  return `/tenants/${tenantId}/mesas${suffix ? `?${suffix}` : ''}`;
}

export default async function MesasPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ q?: string; status?: string; sort?: string; dir?: string; page?: string; mensagem?: string; erro?: string }>;
}>) {
  const { tenantId } = await params;
  const rawParams = await searchParams;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  await requireActiveTenant(tenantId);

  const filters = {
    q: cleanSearch(rawParams.q),
    status: oneOf(rawParams.status, STATUSES, 'all'),
    sort: oneOf(rawParams.sort, SORTS, 'number'),
    dir: oneOf(rawParams.dir, DIRECTIONS, 'asc'),
    page: parsePage(rawParams.page),
  };
  const from = (filters.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  let query = supabase
    .from('tenant_tables')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filters.status === 'active') query = query.eq('is_active', true);
  if (filters.status === 'inactive') query = query.eq('is_active', false);
  if (filters.q) query = query.or(`number.ilike.%${filters.q}%,sector.ilike.%${filters.q}%`);

  const [{ data, count, error: tablesError }, { data: tenant, error: tenantError }] = await Promise.all([
    query
      .order(filters.sort, { ascending: filters.dir === 'asc' })
      .order('number', { ascending: true })
      .range(from, to),
    supabase
      .from('tenants')
      .select('public_slug')
      .eq('id', tenantId)
      .single(),
  ]);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (!tablesError && filters.page > totalPages) redirect(buildTablesPath(tenantId, { ...filters, page: totalPages }));

  const feedback = {
    mensagem: decodeFeedback(rawParams.mensagem),
    erro: decodeFeedback(rawParams.erro),
  };
  const loadError = tablesError || tenantError ? 'Não foi possível carregar mesas/slug do restaurante.' : null;

  return (
    <TenantModulePage tenantId={tenantId} module="mesas">
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.6fr]">
        <TableForm tenantId={tenantId} />
        <TableList
          tenantId={tenantId}
          tables={(data ?? []) as RestaurantTable[]}
          publicSlug={tenant?.public_slug ?? 'restaurante'}
          filters={filters}
          total={total}
          pageSize={PAGE_SIZE}
        />
      </div>
      {loadError ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{loadError}</p> : null}
      {feedback.mensagem ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{feedback.mensagem}</p> : null}
      {feedback.erro ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{feedback.erro}</p> : null}
    </TenantModulePage>
  );
}
