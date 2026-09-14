import Link from 'next/link';
import { updateTenantPlatformStatusAction } from '@/app/actions/platform-admin';
import { AppShell } from '@/components/layout/app-shell';
import { requirePlatformAdmin } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { Tenant, TenantStatus } from '@/lib/types/saas';

const tenantStatusLabels: Record<string, string> = {
  all: 'Todos',
  trialing: 'Teste',
  active: 'Ativo',
  blocked: 'Bloqueado',
  cancelled: 'Cancelado',
};

const tenantStatusClasses: Record<string, string> = {
  trialing: 'border-amber-200 bg-amber-50 text-amber-900',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  blocked: 'border-red-200 bg-red-50 text-red-800',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-700',
};

const tenantStatusDots: Record<string, string> = {
  trialing: 'bg-amber-400',
  active: 'bg-emerald-500',
  blocked: 'bg-red-600',
  cancelled: 'bg-slate-400',
};

const statusFilters = ['all', 'trialing', 'active', 'blocked', 'cancelled'] as const;
const sortOptions = ['recent', 'oldest', 'name'] as const;
type StatusFilter = (typeof statusFilters)[number];
type SortOption = (typeof sortOptions)[number];

type MetricTone = 'red' | 'green' | 'amber' | 'slate' | 'blue' | 'purple' | 'rose';

type MonthBucket = {
  key: string;
  label: string;
  start: string;
  end: string;
};

function formatDateBR(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

function normalizeStatusFilter(value: unknown): StatusFilter {
  return typeof value === 'string' && statusFilters.includes(value as StatusFilter) ? value as StatusFilter : 'all';
}

function normalizeSort(value: unknown): SortOption {
  return typeof value === 'string' && sortOptions.includes(value as SortOption) ? value as SortOption : 'recent';
}

function normalizeSearch(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[,%()_*]/g, '').slice(0, 80);
}

function buildSuperAdminHref(params: { status?: StatusFilter; q?: string; sort?: SortOption }) {
  const search = new URLSearchParams();
  if (params.status && params.status !== 'all') search.set('status', params.status);
  if (params.q) search.set('q', params.q);
  if (params.sort && params.sort !== 'recent') search.set('sort', params.sort);
  const query = search.toString();
  return query ? `/super-admin?${query}` : '/super-admin';
}

function buildLastSixMonths(): MonthBucket[] {
  const now = new Date();
  const buckets: MonthBucket[] = [];
  for (let index = 5; index >= 0; index -= 1) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    buckets.push({
      key: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
      label: start.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', ''),
      start: start.toISOString(),
      end: end.toISOString(),
    });
  }
  return buckets;
}

function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function MetricCard({ icon, label, value, hint, tone = 'red' }: Readonly<{ icon: string; label: string; value: string | number; hint: string; tone?: MetricTone }>) {
  const toneClasses: Record<MetricTone, string> = {
    red: 'from-red-600 to-red-500 bg-red-50 text-red-700',
    green: 'from-emerald-500 to-green-500 bg-emerald-50 text-emerald-700',
    amber: 'from-amber-500 to-orange-400 bg-amber-50 text-amber-700',
    slate: 'from-slate-500 to-slate-400 bg-slate-50 text-slate-700',
    blue: 'from-sky-500 to-blue-500 bg-sky-50 text-sky-700',
    purple: 'from-violet-500 to-purple-500 bg-violet-50 text-violet-700',
    rose: 'from-rose-500 to-pink-500 bg-rose-50 text-rose-700',
  };

  return (
    <div className="group rounded-[1.65rem] border border-white bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-[0_24px_65px_rgba(15,23,42,0.12)] sm:p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-xl text-white shadow-lg ${toneClasses[tone].split(' ').slice(0, 2).join(' ')}`}>
        {icon}
      </div>
      <p className="mt-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <strong className="mt-2 block text-3xl font-black tracking-tight text-slate-950">{value}</strong>
      <p className="mt-1 text-sm font-medium leading-5 text-slate-600">{hint}</p>
      <p className="mt-4 inline-flex items-center gap-1 text-xs font-black text-slate-500"><span aria-hidden="true">•</span> Dado real da plataforma</p>
    </div>
  );
}

function StatusBadge({ status }: Readonly<{ status: TenantStatus }>) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${tenantStatusClasses[status] ?? tenantStatusClasses.cancelled}`}>
      <span className={`h-2 w-2 rounded-full ${tenantStatusDots[status] ?? tenantStatusDots.cancelled}`} aria-hidden="true" />
      {tenantStatusLabels[status] ?? status}
    </span>
  );
}

function DonutChart({ active, trialing, blocked, cancelled }: Readonly<{ active: number; trialing: number; blocked: number; cancelled: number }>) {
  const total = active + trialing + blocked + cancelled;
  const activePct = percent(active, total);
  const trialingPct = percent(trialing, total);
  const blockedPct = percent(blocked, total);
  const activeEnd = activePct;
  const trialingEnd = activePct + trialingPct;
  const blockedEnd = activePct + trialingPct + blockedPct;

  return (
    <div className="grid gap-6 rounded-[1.75rem] border border-white bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
      <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-full p-7" style={{ background: total ? `conic-gradient(#10b981 0 ${activeEnd}%, #f59e0b ${activeEnd}% ${trialingEnd}%, #dc2626 ${trialingEnd}% ${blockedEnd}%, #94a3b8 ${blockedEnd}% 100%)` : 'conic-gradient(#e2e8f0 0 100%)' }}>
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
          <strong className="text-4xl font-black text-slate-950">{total}</strong>
          <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Total</span>
        </div>
      </div>
      <div className="space-y-3">
        {([
          ['Ativo', active, activePct, 'bg-emerald-500'],
          ['Em teste', trialing, trialingPct, 'bg-amber-400'],
          ['Bloqueado', blocked, blockedPct, 'bg-red-600'],
          ['Cancelado', cancelled, percent(cancelled, total), 'bg-slate-400'],
        ] as const).map(([label, value, pct, color]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-700"><span className={`h-3 w-3 rounded-full ${color}`} aria-hidden="true" />{label}</span>
            <span className="text-sm font-black text-slate-950">{value} <span className="ml-2 text-slate-500">{pct}%</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GrowthChart({ buckets, counts }: Readonly<{ buckets: MonthBucket[]; counts: number[] }>) {
  const maxValue = Math.max(1, ...counts);

  return (
    <div className="rounded-[1.75rem] border border-white bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">Crescimento da plataforma</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Restaurantes cadastrados nos últimos 6 meses</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Últimos 6 meses</span>
      </div>
      <div className="mt-8 flex h-48 items-end gap-3 border-b border-l border-slate-100 px-2 pt-4">
        {buckets.map((bucket, index) => {
          const height = Math.max(8, Math.round((counts[index] / maxValue) * 100));
          return (
            <div key={bucket.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <span className="text-xs font-black text-red-700">{counts[index]}</span>
              <div className="w-full max-w-12 rounded-t-2xl bg-gradient-to-t from-red-100 to-red-500 shadow-sm" style={{ height: `${height}%` }} aria-label={`${counts[index]} restaurantes em ${bucket.label}`} />
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-6 gap-2 text-center text-xs font-bold text-slate-500">
        {buckets.map((bucket) => <span key={bucket.key}>{bucket.label}</span>)}
      </div>
    </div>
  );
}

function TenantStatusActionForm({ tenant }: Readonly<{ tenant: Tenant }>) {
  if (tenant.status === 'cancelled') {
    return (
      <p className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
        Tenant cancelado não pode ser reativado por esta ação rápida.
      </p>
    );
  }

  if (tenant.status === 'blocked') {
    return (
      <form action={updateTenantPlatformStatusAction} className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50 p-3">
        <input type="hidden" name="tenantId" value={tenant.id} />
        <input type="hidden" name="action" value="unblock" />
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-900">Ação segura</p>
        <p className="mt-1 text-xs leading-5 text-emerald-800">Digite DESBLOQUEAR para voltar o tenant para ativo.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-[150px_minmax(0,1fr)_auto]">
          <input aria-label={`Confirmar desbloqueio de ${tenant.name}`} name="confirmation" placeholder="DESBLOQUEAR" className="min-h-11 rounded-full border border-emerald-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600" />
          <input aria-label={`Observação para desbloqueio de ${tenant.name}`} name="notes" maxLength={240} placeholder="Observação opcional" className="min-h-11 rounded-full border border-emerald-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-emerald-600" />
          <button type="submit" className="min-h-11 rounded-full bg-emerald-700 px-5 py-2 text-sm font-black text-white shadow-sm hover:bg-emerald-800">Desbloquear</button>
        </div>
      </form>
    );
  }

  return (
    <form action={updateTenantPlatformStatusAction} className="rounded-[1.2rem] border border-red-200 bg-red-50 p-3">
      <input type="hidden" name="tenantId" value={tenant.id} />
      <input type="hidden" name="action" value="block" />
      <p className="text-xs font-black uppercase tracking-[0.16em] text-red-900">Ação segura</p>
      <p className="mt-1 text-xs leading-5 text-red-800">Digite BLOQUEAR para suspender. A ação será auditada.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-[130px_minmax(0,1fr)_auto]">
        <input aria-label={`Confirmar bloqueio de ${tenant.name}`} name="confirmation" placeholder="BLOQUEAR" className="min-h-11 rounded-full border border-red-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-red-600" />
        <input aria-label={`Observação para bloqueio de ${tenant.name}`} name="notes" maxLength={240} placeholder="Motivo opcional" className="min-h-11 rounded-full border border-red-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-red-600" />
        <button type="submit" className="min-h-11 rounded-full bg-red-700 px-5 py-2 text-sm font-black text-white shadow-sm hover:bg-red-800">Bloquear</button>
      </div>
    </form>
  );
}

export default async function SuperAdminPage({ searchParams }: Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }>) {
  const { platformAdmin } = await requirePlatformAdmin();
  const params = (await searchParams) ?? {};
  const statusFilter = normalizeStatusFilter(params.status);
  const sort = normalizeSort(params.sort);
  const q = normalizeSearch(params.q);
  const erro = typeof params.erro === 'string' ? params.erro : undefined;
  const mensagem = typeof params.mensagem === 'string' ? params.mensagem : undefined;
  const supabase = await createClient();
  const monthBuckets = buildLastSixMonths();

  let tenantsQuery = supabase
    .from('tenants')
    .select('id, name, legal_name, document, email, phone, status, public_slug, created_at, updated_at', { count: 'exact' })
    .limit(50);

  if (statusFilter !== 'all') tenantsQuery = tenantsQuery.eq('status', statusFilter);
  if (q) tenantsQuery = tenantsQuery.or(`name.ilike.%${q}%,legal_name.ilike.%${q}%,email.ilike.%${q}%,public_slug.ilike.%${q}%,document.ilike.%${q}%`);
  if (sort === 'name') tenantsQuery = tenantsQuery.order('name', { ascending: true });
  if (sort === 'oldest') tenantsQuery = tenantsQuery.order('created_at', { ascending: true });
  if (sort === 'recent') tenantsQuery = tenantsQuery.order('created_at', { ascending: false });

  const [tenantsResult, totalTenantsCount, activeTenantsCount, trialingTenantsCount, blockedTenantsCount, cancelledTenantsCount, tenantUsersCount, profilesCount, platformAdminsCount, auditLogsCount, ...monthlyResults] = await Promise.all([
    tenantsQuery,
    supabase.from('tenants').select('id', { count: 'exact', head: true }),
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'trialing'),
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'blocked'),
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase.from('tenant_users').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('platform_admins').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
    ...monthBuckets.map((bucket) => supabase.from('tenants').select('id', { count: 'exact', head: true }).gte('created_at', bucket.start).lt('created_at', bucket.end)),
  ]);

  const tenants = (tenantsResult.data ?? []) as Tenant[];
  const filteredTenantCount = tenantsResult.count ?? tenants.length;
  const totalTenants = totalTenantsCount.count ?? 0;
  const activeTenants = activeTenantsCount.count ?? 0;
  const blockedTenants = blockedTenantsCount.count ?? 0;
  const trialingTenants = trialingTenantsCount.count ?? 0;
  const cancelledTenants = cancelledTenantsCount.count ?? 0;
  const monthlyCounts = monthlyResults.map((result) => result.count ?? 0);
  const queryError = tenantsResult.error ?? totalTenantsCount.error ?? activeTenantsCount.error ?? trialingTenantsCount.error ?? blockedTenantsCount.error ?? cancelledTenantsCount.error ?? tenantUsersCount.error ?? profilesCount.error ?? platformAdminsCount.error ?? auditLogsCount.error ?? monthlyResults.find((result) => result.error)?.error;

  return (
    <AppShell>
      <div className="-m-4 min-h-screen rounded-[2rem] bg-[#f7f8fb] p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden rounded-[2rem] border border-white bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 xl:block">
            <Link href="/super-admin" className="flex items-center gap-3 rounded-2xl px-2 py-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-2xl text-white shadow-lg shadow-red-200">🍴</span>
              <span><strong className="block text-xl font-black tracking-tight text-slate-950">MesaFácil</strong><small className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-slate-500">Restaurante SaaS</small></span>
            </Link>
            <nav aria-label="Navegação Super Admin" className="mt-8 space-y-2">
              {[
                ['🏠', 'Dashboard', '/super-admin', true],
                ['🍽️', 'Restaurantes', '#restaurantes', false],
                ['🏢', 'Tenants', '#restaurantes', false],
                ['👥', 'Usuários', '#indicadores', false],
                ['🛡️', 'Admins ativos', '#indicadores', false],
                ['🧾', 'Auditoria', '#indicadores', false],
                ['⚙️', 'Configurações', '/dashboard', false],
              ].map(([icon, label, href, active]) => (
                <Link key={`${href}-${label}`} href={String(href)} className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-black transition ${active ? 'bg-red-50 text-red-700 shadow-inner' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>
                  <span aria-hidden="true">{icon}</span>{label}
                </Link>
              ))}
            </nav>
            <div className="mt-20 rounded-[1.5rem] border border-red-100 bg-red-50 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">👑</span>
              <strong className="mt-3 block text-sm font-black text-slate-950">Super Admin</strong>
              <p className="mt-2 text-xs leading-5 text-slate-600">Controle total da plataforma MesaFácil.</p>
              <p className="mt-3 inline-flex rounded-full border border-red-100 bg-white px-3 py-1 text-xs font-black text-red-700">Ambiente seguro</p>
            </div>
          </aside>

          <main className="min-w-0">
            <header className="mb-6 flex flex-col gap-4 rounded-[1.75rem] border border-white bg-white/90 p-4 shadow-[0_14px_45px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 lg:flex-row lg:items-center lg:justify-between">
              <form action="/super-admin" className="relative flex-1">
                {statusFilter !== 'all' ? <input type="hidden" name="status" value={statusFilter} /> : null}
                {sort !== 'recent' ? <input type="hidden" name="sort" value={sort} /> : null}
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">⌕</span>
                <input name="q" defaultValue={q} placeholder="Buscar restaurante, tenant, e-mail, CNPJ ou slug..." className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-100" />
              </form>
              <div className="flex items-center justify-between gap-3 lg:justify-end">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-white text-xl shadow-sm">🔔</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">S</span>
                  <span className="hidden sm:block"><strong className="block text-sm font-black text-slate-950">super_admin</strong><small className="font-semibold text-slate-500">{platformAdmin.role}</small></span>
                </div>
              </div>
            </header>

            <section className="overflow-hidden rounded-[2rem] border border-white bg-slate-950 shadow-[0_24px_80px_rgba(127,29,29,0.25)]">
              <div className="relative grid min-h-[250px] gap-6 bg-[radial-gradient(circle_at_78%_35%,rgba(251,191,36,0.35),transparent_24%),linear-gradient(100deg,rgba(127,29,29,0.96)_0%,rgba(185,28,28,0.88)_43%,rgba(15,23,42,0.55)_100%)] p-6 text-white lg:grid-cols-[minmax(0,1fr)_360px] lg:p-9">
                <div className="absolute inset-y-0 right-0 hidden w-1/2 opacity-30 lg:block" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,.25) 0 2px, transparent 3px), linear-gradient(135deg, rgba(255,255,255,.08), transparent)', backgroundSize: '42px 42px, cover' }} />
                <div className="relative z-10">
                  <p className="inline-flex rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-white backdrop-blur">Bem-vindo(a), Super Admin 👋</p>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Controle completo da plataforma MesaFácil</h1>
                  <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/90">Gerencie restaurantes, acompanhe operação, audite atividades e mantenha a plataforma rápida, segura e confiável para seus clientes.</p>
                </div>
                <div className="relative z-10 flex items-center lg:justify-end">
                  <div className="w-full max-w-sm rounded-[1.75rem] border border-white/20 bg-white/15 p-5 shadow-2xl backdrop-blur-md">
                    <div className="flex items-center gap-4">
                      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl">📈</span>
                      <div><strong className="block text-lg font-black text-white">Painel administrativo</strong><p className="mt-1 text-sm font-medium text-white/85">Métricas carregadas do Supabase.</p></div>
                      <span className="ml-auto h-4 w-4 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.9)]" aria-hidden="true" />
                    </div>
                    <p className="mt-6 rotate-[-4deg] text-right font-serif text-2xl italic text-white/90">Restaurantes mais fortes todos os dias</p>
                  </div>
                </div>
              </div>
            </section>

            {mensagem ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{mensagem}</p> : null}
            {erro ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{erro}</p> : null}

            <section id="indicadores" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
              <MetricCard icon="🍴" label="Restaurantes" value={totalTenants} hint="Total na plataforma" tone="red" />
              <MetricCard icon="▶" label="Ativos" value={activeTenants} hint="Tenants operando" tone="green" />
              <MetricCard icon="⏱" label="Em teste" value={trialingTenants} hint="Em implantação" tone="amber" />
              <MetricCard icon="Ⅱ" label="Bloqueados" value={blockedTenants} hint="Operação suspensa" tone="slate" />
              <MetricCard icon="👥" label="Usuários" value={tenantUsersCount.count ?? 0} hint="Vínculos cadastrados" tone="blue" />
              <MetricCard icon="🛡" label="Admins ativos" value={platformAdminsCount.count ?? 0} hint="Com acesso à plataforma" tone="purple" />
              <MetricCard icon="🧾" label="Auditoria" value={auditLogsCount.count ?? 0} hint="Eventos registrados" tone="rose" />
            </section>

            {queryError ? (
              <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Alguns dados administrativos não puderam ser carregados agora. Tente novamente ou verifique permissões/RLS da plataforma.</p>
            ) : null}

            <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
              <GrowthChart buckets={monthBuckets} counts={monthlyCounts} />
              <DonutChart active={activeTenants} trialing={trialingTenants} blocked={blockedTenants} cancelled={cancelledTenants} />
            </section>

            <section id="restaurantes" className="mt-9">
              <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                  <span className="mb-3 block h-1 w-8 rounded-full bg-red-600" />
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Tenants</p>
                  <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Restaurantes da plataforma</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Gerencie status, visualize informações e execute ações de bloqueio/desbloqueio com auditoria.</p>
                </div>
                <Link href="/onboarding/restaurante" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-200 hover:bg-red-700"><span aria-hidden="true">＋</span>Novo restaurante</Link>
              </div>

              <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <nav aria-label="Filtrar tenants por status" className="flex gap-2 overflow-x-auto pb-1">
                  {statusFilters.map((status) => (
                    <Link key={status} href={buildSuperAdminHref({ status, q, sort })} className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border px-5 py-2 text-sm font-black shadow-sm transition ${statusFilter === status ? 'border-red-600 bg-red-600 text-white shadow-red-100' : 'border-white bg-white text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700'}`}>{tenantStatusLabels[status]}</Link>
                  ))}
                </nav>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <form action="/super-admin" className="relative min-w-0 sm:w-72">
                    {statusFilter !== 'all' ? <input type="hidden" name="status" value={statusFilter} /> : null}
                    {sort !== 'recent' ? <input type="hidden" name="sort" value={sort} /> : null}
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">⌕</span>
                    <input name="q" defaultValue={q} placeholder="Buscar restaurante..." className="min-h-11 w-full rounded-full border border-white bg-white pl-10 pr-4 text-sm font-semibold text-slate-900 shadow-sm outline-none focus:border-red-300 focus:ring-4 focus:ring-red-100" />
                  </form>
                  <form action="/super-admin" className="flex items-center gap-2 rounded-full border border-white bg-white px-3 py-1 shadow-sm">
                    {statusFilter !== 'all' ? <input type="hidden" name="status" value={statusFilter} /> : null}
                    {q ? <input type="hidden" name="q" value={q} /> : null}
                    <label htmlFor="super-admin-sort" className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Ordenar</label>
                    <select id="super-admin-sort" name="sort" defaultValue={sort} className="min-h-9 rounded-full border-0 bg-transparent text-sm font-black text-slate-800 outline-none">
                      <option value="recent">Mais recentes</option>
                      <option value="oldest">Mais antigos</option>
                      <option value="name">Nome</option>
                    </select>
                    <button type="submit" className="rounded-full bg-slate-900 px-3 py-2 text-xs font-black text-white">Aplicar</button>
                  </form>
                </div>
              </div>

              <p className="mb-3 text-sm font-semibold text-slate-500">Mostrando {tenants.length} de {filteredTenantCount} restaurante(s){q ? ` para “${q}”` : ''}.</p>

              <div className="space-y-4">
                {tenants.map((tenant) => (
                  <article key={tenant.id} className="grid gap-4 rounded-[1.65rem] border border-white bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 xl:grid-cols-[120px_minmax(0,1fr)_minmax(360px,0.95fr)] xl:items-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-950 text-center text-white shadow-xl xl:h-28 xl:w-28">
                      <div><span className="block text-2xl">👨‍🍳</span><strong className="mt-1 block max-w-20 truncate text-lg font-black">{tenant.name}</strong><small className="text-[0.6rem] uppercase tracking-[0.2em] text-white/60">SaaS</small></div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-2xl font-black text-slate-950">{tenant.name}</h3>
                        <StatusBadge status={tenant.status} />
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{tenant.legal_name ?? 'Razão social não informada'}</p>
                      <dl className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2 2xl:grid-cols-4">
                        <div><dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">CNPJ</dt><dd className="mt-1 font-bold text-slate-800">{tenant.document ?? '—'}</dd></div>
                        <div><dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">E-mail</dt><dd className="mt-1 truncate font-bold text-slate-800">{tenant.email ?? '—'}</dd></div>
                        <div><dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Telefone</dt><dd className="mt-1 font-bold text-slate-800">{tenant.phone ?? '—'}</dd></div>
                        <div><dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Criado em</dt><dd className="mt-1 font-bold text-slate-800">{formatDateBR(tenant.created_at)}</dd></div>
                      </dl>
                      <p className="mt-3 inline-flex rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">{tenant.public_slug ? `/${tenant.public_slug}` : 'sem slug público'}</p>
                    </div>
                    <TenantStatusActionForm tenant={tenant} />
                  </article>
                ))}

                {tenants.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-3xl">🍽️</span>
                    <h3 className="mt-4 text-xl font-black text-slate-950">Nenhum restaurante encontrado</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Ajuste os filtros ou aguarde novos tenants visíveis para a plataforma.</p>
                  </div>
                ) : null}
              </div>
            </section>

            <footer className="mt-8 flex flex-col gap-2 pb-6 text-xs font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p><span className="font-black text-red-600">MesaFácil</span> · Restaurante SaaS</p>
              <p>Mais restaurantes. Mais resultados. <span className="text-red-600">♡</span></p>
            </footer>
          </main>
        </div>
      </div>
    </AppShell>
  );
}
