import { redirect } from 'next/navigation';
import { TeamManager, TeamMemberForm, type TeamFilters, type TeamMemberSummary } from '@/components/team/team-manager';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { Profile, TenantRole, TenantUser, TenantUserStatus } from '@/lib/types/saas';
import { isUuid } from '@/lib/validation/auth';

const PAGE_SIZE = 10;
const ROLES = ['all', 'owner', 'admin', 'manager', 'waiter', 'attendant', 'kitchen', 'cashier'] as const;
const STATUSES = ['all', 'invited', 'active', 'disabled', 'removed'] as const;
const SORTS = ['created_at', 'role', 'status'] as const;
const DIRECTIONS = ['asc', 'desc'] as const;

type TeamRoleFilter = (typeof ROLES)[number];
type TeamStatusFilter = (typeof STATUSES)[number];
type TeamSort = (typeof SORTS)[number];
type TeamDirection = (typeof DIRECTIONS)[number];

function cleanSearch(value: string | undefined): string {
  return typeof value === 'string' ? value.trim().replace(/[^\p{L}\p{N}\s@._+-]/gu, '').replace(/\s+/g, ' ').slice(0, 100) : '';
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

function buildTeamPath(tenantId: string, filters: TeamFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.role !== 'all') params.set('role', filters.role);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.sort !== 'created_at') params.set('sort', filters.sort);
  if (filters.dir !== 'asc') params.set('dir', filters.dir);
  if (filters.page > 1) params.set('page', String(filters.page));
  const suffix = params.toString();
  return `/tenants/${tenantId}/equipe${suffix ? `?${suffix}` : ''}`;
}

export default async function EquipePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ q?: string; role?: string; status?: string; sort?: string; dir?: string; page?: string; mensagem?: string; erro?: string }>;
}>) {
  const { tenantId } = await params;
  const rawParams = await searchParams;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  await requireActiveTenant(tenantId);

  const filters: TeamFilters = {
    q: cleanSearch(rawParams.q),
    role: oneOf(rawParams.role, ROLES, 'all') as TeamRoleFilter,
    status: oneOf(rawParams.status, STATUSES, 'all') as TeamStatusFilter,
    sort: oneOf(rawParams.sort, SORTS, 'created_at') as TeamSort,
    dir: oneOf(rawParams.dir, DIRECTIONS, 'asc') as TeamDirection,
    page: parsePage(rawParams.page),
  };

  const supabase = await createClient();
  let matchingUserIds: string[] | null = null;
  let profileSearchError: unknown = null;

  if (filters.q) {
    const { data: matchingProfiles, error } = await supabase
      .from('profiles')
      .select('user_id')
      .or(`name.ilike.%${filters.q}%,email.ilike.%${filters.q}%,phone.ilike.%${filters.q}%`);
    profileSearchError = error;
    matchingUserIds = (matchingProfiles ?? []).map((profile) => profile.user_id);
  }

  let query = supabase
    .from('tenant_users')
    .select('id, tenant_id, user_id, role, status, created_at, updated_at', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filters.role !== 'all') query = query.eq('role', filters.role as TenantRole);
  if (filters.status !== 'all') query = query.eq('status', filters.status as TenantUserStatus);
  if (matchingUserIds) {
    if (matchingUserIds.length === 0) query = query.eq('user_id', '00000000-0000-4000-8000-000000000000');
    else query = query.in('user_id', matchingUserIds);
  }

  const from = (filters.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: membersData, count, error: membersError } = await query
    .order(filters.sort, { ascending: filters.dir === 'asc' })
    .order('created_at', { ascending: true })
    .range(from, to);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (!membersError && filters.page > totalPages) redirect(buildTeamPath(tenantId, { ...filters, page: totalPages }));

  const members = (membersData ?? []) as TenantUser[];
  const userIds = members.map((member) => member.user_id);
  const { data: profilesData, error: profilesError } = userIds.length > 0
    ? await supabase.from('profiles').select('user_id, name, email, phone, status').in('user_id', userIds)
    : { data: [], error: null };

  const profilesByUserId = new Map((profilesData ?? []).map((profile) => [profile.user_id, profile as Pick<Profile, 'name' | 'email' | 'phone' | 'status'>]));
  const hydratedMembers: TeamMemberSummary[] = members.map((member) => ({
    ...member,
    profiles: profilesByUserId.get(member.user_id) ?? null,
  }));

  const feedback = {
    mensagem: decodeFeedback(rawParams.mensagem),
    erro: decodeFeedback(rawParams.erro),
  };
  const loadError = membersError || profilesError || profileSearchError ? 'Não foi possível carregar todos os dados da equipe.' : null;

  return (
    <TenantModulePage tenantId={tenantId} module="equipe">
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.6fr]">
        <TeamMemberForm tenantId={tenantId} />
        <TeamManager tenantId={tenantId} members={hydratedMembers} filters={filters} total={total} pageSize={PAGE_SIZE} />
      </div>
      {loadError ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{loadError}</p> : null}
      {feedback.mensagem ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{feedback.mensagem}</p> : null}
      {feedback.erro ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{feedback.erro}</p> : null}
    </TenantModulePage>
  );
}
