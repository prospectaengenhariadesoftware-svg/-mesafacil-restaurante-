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
  active: 'border-green-200 bg-green-50 text-green-800',
  blocked: 'border-red-200 bg-red-50 text-red-800',
  cancelled: 'border-stone-200 bg-stone-100 text-stone-700',
};

const statusFilters = ['all', 'trialing', 'active', 'blocked', 'cancelled'] as const;
type StatusFilter = (typeof statusFilters)[number];

function formatDateBR(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

function normalizeStatusFilter(value: unknown): StatusFilter {
  return typeof value === 'string' && statusFilters.includes(value as StatusFilter) ? value as StatusFilter : 'all';
}

function StatCard({ label, value, hint }: Readonly<{ label: string; value: string | number; hint: string }>) {
  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <strong className="mt-3 block text-3xl font-black text-stone-950">{value}</strong>
      <p className="mt-2 text-sm leading-6 text-stone-600">{hint}</p>
    </div>
  );
}

function StatusBadge({ status }: Readonly<{ status: TenantStatus }>) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${tenantStatusClasses[status] ?? tenantStatusClasses.cancelled}`}>
      {tenantStatusLabels[status] ?? status}
    </span>
  );
}

function TenantStatusActionForm({ tenant }: Readonly<{ tenant: Tenant }>) {
  if (tenant.status === 'cancelled') {
    return (
      <p className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700">
        Tenant cancelado não pode ser reativado por esta ação rápida.
      </p>
    );
  }

  if (tenant.status === 'blocked') {
    return (
      <form action={updateTenantPlatformStatusAction} className="mt-5 rounded-[1.25rem] border border-green-200 bg-green-50 p-4">
        <input type="hidden" name="tenantId" value={tenant.id} />
        <input type="hidden" name="action" value="unblock" />
        <p className="text-sm font-black text-green-900">Desbloquear restaurante</p>
        <p className="mt-1 text-xs leading-5 text-green-800">Digite DESBLOQUEAR para voltar o tenant para status ativo.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)_auto]">
          <input aria-label={`Confirmar desbloqueio de ${tenant.name}`} name="confirmation" placeholder="DESBLOQUEAR" className="min-h-11 rounded-full border border-green-200 bg-white px-4 text-sm font-bold text-stone-900 outline-none focus:border-green-600" />
          <input aria-label={`Observação para desbloqueio de ${tenant.name}`} name="notes" maxLength={240} placeholder="Observação opcional" className="min-h-11 rounded-full border border-green-200 bg-white px-4 text-sm text-stone-900 outline-none focus:border-green-600" />
          <button type="submit" className="min-h-11 rounded-full bg-green-700 px-5 py-2 text-sm font-black text-white shadow-sm hover:bg-green-800">Desbloquear</button>
        </div>
      </form>
    );
  }

  return (
    <form action={updateTenantPlatformStatusAction} className="mt-5 rounded-[1.25rem] border border-red-200 bg-red-50 p-4">
      <input type="hidden" name="tenantId" value={tenant.id} />
      <input type="hidden" name="action" value="block" />
      <p className="text-sm font-black text-red-900">Bloquear restaurante</p>
      <p className="mt-1 text-xs leading-5 text-red-800">Digite BLOQUEAR para suspender o tenant. A ação será registrada em auditoria.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
        <input aria-label={`Confirmar bloqueio de ${tenant.name}`} name="confirmation" placeholder="BLOQUEAR" className="min-h-11 rounded-full border border-red-200 bg-white px-4 text-sm font-bold text-stone-900 outline-none focus:border-red-600" />
        <input aria-label={`Observação para bloqueio de ${tenant.name}`} name="notes" maxLength={240} placeholder="Motivo opcional" className="min-h-11 rounded-full border border-red-200 bg-white px-4 text-sm text-stone-900 outline-none focus:border-red-600" />
        <button type="submit" className="min-h-11 rounded-full bg-red-700 px-5 py-2 text-sm font-black text-white shadow-sm hover:bg-red-800">Bloquear</button>
      </div>
    </form>
  );
}

export default async function SuperAdminPage({ searchParams }: Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }>) {
  const { platformAdmin } = await requirePlatformAdmin();
  const params = (await searchParams) ?? {};
  const statusFilter = normalizeStatusFilter(params.status);
  const erro = typeof params.erro === 'string' ? params.erro : undefined;
  const mensagem = typeof params.mensagem === 'string' ? params.mensagem : undefined;
  const supabase = await createClient();

  let tenantsQuery = supabase
    .from('tenants')
    .select('id, name, legal_name, document, email, phone, status, public_slug, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(50);

  if (statusFilter !== 'all') {
    tenantsQuery = tenantsQuery.eq('status', statusFilter);
  }

  const [tenantsResult, activeTenantsCount, trialingTenantsCount, blockedTenantsCount, tenantUsersCount, profilesCount, platformAdminsCount, auditLogsCount] = await Promise.all([
    tenantsQuery,
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'trialing'),
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'blocked'),
    supabase.from('tenant_users').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('platform_admins').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
  ]);

  const tenants = (tenantsResult.data ?? []) as Tenant[];
  const tenantCount = tenantsResult.count ?? tenants.length;
  const activeTenants = activeTenantsCount.count ?? 0;
  const blockedTenants = blockedTenantsCount.count ?? 0;
  const trialingTenants = trialingTenantsCount.count ?? 0;
  const queryError = tenantsResult.error ?? activeTenantsCount.error ?? trialingTenantsCount.error ?? blockedTenantsCount.error ?? tenantUsersCount.error ?? profilesCount.error ?? platformAdminsCount.error ?? auditLogsCount.error;

  return (
    <AppShell>
      <section className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl shadow-stone-200/70">
        <div className="grid gap-6 bg-gradient-to-br from-red-700 via-red-600 to-red-800 px-6 py-8 text-white lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end lg:px-8 lg:py-10">
          <div>
            <p className="inline-flex rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white backdrop-blur">Super Admin</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Controle da plataforma MesaFácil</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white sm:text-base">
              Visão central para acompanhar restaurantes, usuários, status de operação e auditoria sem entrar como atalho em tenants de clientes.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/20 bg-white/15 p-5 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white">Acesso ativo</p>
            <strong className="mt-2 block text-2xl font-black text-white">{platformAdmin.role}</strong>
            <p className="mt-2 text-sm leading-6 text-white">Liberado por cadastro ativo em `platform_admins`.</p>
          </div>
        </div>
      </section>

      {mensagem ? <p className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">{mensagem}</p> : null}
      {erro ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{erro}</p> : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Restaurantes" value={tenantCount} hint={statusFilter === 'all' ? 'Total visível para a plataforma.' : `Total filtrado por ${tenantStatusLabels[statusFilter]}.`} />
        <StatCard label="Ativos" value={activeTenants} hint="Tenants prontos para operação." />
        <StatCard label="Em teste" value={trialingTenants} hint="Restaurantes em implantação." />
        <StatCard label="Bloqueados" value={blockedTenants} hint="Tenants com operação suspensa." />
        <StatCard label="Usuários" value={tenantUsersCount.count ?? 0} hint="Vínculos em restaurantes." />
      </section>

      {queryError ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Alguns dados administrativos não puderam ser carregados agora. Tente novamente ou verifique permissões/RLS da plataforma.
        </p>
      ) : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">Perfis</p>
          <strong className="mt-2 block text-3xl font-black text-stone-950">{profilesCount.count ?? 0}</strong>
          <p className="mt-2 text-sm leading-6 text-stone-600">Contas cadastradas na plataforma.</p>
        </div>
        <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">Admins ativos</p>
          <strong className="mt-2 block text-3xl font-black text-stone-950">{platformAdminsCount.count ?? 0}</strong>
          <p className="mt-2 text-sm leading-6 text-stone-600">Usuários com acesso de plataforma.</p>
        </div>
        <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">Auditoria</p>
          <strong className="mt-2 block text-3xl font-black text-stone-950">{auditLogsCount.count ?? 0}</strong>
          <p className="mt-2 text-sm leading-6 text-stone-600">Eventos registrados para investigação.</p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-black text-red-700">Tenants</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950">Restaurantes da plataforma</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">Ações de bloqueio/desbloqueio exigem confirmação textual e registram auditoria.</p>
          </div>
          <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-black text-stone-700 shadow-sm hover:border-red-200 hover:bg-red-50 hover:text-red-700">
            Voltar ao dashboard
          </Link>
        </div>

        <nav aria-label="Filtrar tenants por status" className="mb-5 flex gap-2 overflow-x-auto pb-2">
          {statusFilters.map((status) => (
            <Link key={status} href={status === 'all' ? '/super-admin' : `/super-admin?status=${status}`} className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border px-4 py-2 text-sm font-black ${statusFilter === status ? 'border-red-600 bg-red-600 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700'}`}>
              {tenantStatusLabels[status]}
            </Link>
          ))}
        </nav>

        <div className="grid gap-4 xl:grid-cols-2">
          {tenants.map((tenant) => (
            <article key={tenant.id} className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">{tenant.public_slug ? `/${tenant.public_slug}` : 'sem slug público'}</p>
                  <h3 className="mt-2 truncate text-xl font-black text-stone-950">{tenant.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{tenant.legal_name ?? 'Razão social não informada'}</p>
                </div>
                <StatusBadge status={tenant.status} />
              </div>

              <dl className="mt-5 grid gap-2 text-sm text-stone-600 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-stone-50 p-3"><dt className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Documento</dt><dd className="mt-1 font-semibold text-stone-800">{tenant.document ?? '—'}</dd></div>
                <div className="rounded-2xl bg-stone-50 p-3"><dt className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">E-mail</dt><dd className="mt-1 truncate font-semibold text-stone-800">{tenant.email ?? '—'}</dd></div>
                <div className="rounded-2xl bg-stone-50 p-3"><dt className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Telefone</dt><dd className="mt-1 font-semibold text-stone-800">{tenant.phone ?? '—'}</dd></div>
                <div className="rounded-2xl bg-stone-50 p-3"><dt className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Criado</dt><dd className="mt-1 font-semibold text-stone-800">{formatDateBR(tenant.created_at)}</dd></div>
              </dl>

              <TenantStatusActionForm tenant={tenant} />
            </article>
          ))}

          {tenants.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white p-8 text-center shadow-sm">
              <h3 className="text-xl font-black text-stone-950">Nenhum restaurante encontrado</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">Quando houver tenants visíveis para a plataforma, eles aparecerão aqui.</p>
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
