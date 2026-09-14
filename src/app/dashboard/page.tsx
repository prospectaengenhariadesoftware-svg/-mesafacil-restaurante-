import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { getCurrentPlatformAdmin, getCurrentProfile, getTenantMemberships, requireUser } from '@/lib/auth/context';

export default async function DashboardPage({ searchParams }: Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }>) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const memberships = await getTenantMemberships(user.id);
  const profile = await getCurrentProfile(user.id);
  const platformAdmin = await getCurrentPlatformAdmin(user.id);
  const erro = typeof params.erro === 'string' ? params.erro : undefined;
  const activeMemberships = memberships.filter((membership) => membership.status === 'active');

  return (
    <AppShell>
      <section className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl shadow-stone-200/70">
        <div className="grid gap-6 bg-gradient-to-br from-red-500 via-red-500 to-red-700 px-6 py-8 text-white lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end lg:px-8 lg:py-10">
          <div>
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-white">Dashboard MesaFácil</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Bom trabalho, {profile?.name ?? user.email}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white sm:text-base">
              Escolha um restaurante para operar pedidos, cardápio, equipe, caixa e relatórios em um ambiente isolado por tenant.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <span className="block text-xs text-white/85">Restaurantes</span>
              <strong className="mt-1 block text-3xl font-black">{memberships.length}</strong>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <span className="block text-xs text-white/85">Ativos</span>
              <strong className="mt-1 block text-3xl font-black">{activeMemberships.length}</strong>
            </div>
          </div>
        </div>

        {erro ? <p className="m-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p> : null}

        <div className="grid gap-3 px-6 py-5 text-sm text-stone-700 md:grid-cols-3 lg:px-8">
          <div className="rounded-2xl bg-stone-50 p-4"><strong className="block text-stone-950">Acesso seguro</strong> Dados liberados só para vínculos ativos.</div>
          <div className="rounded-2xl bg-stone-50 p-4"><strong className="block text-stone-950">Operação por QR</strong> Cliente pede pelo cardápio público da mesa.</div>
          <div className="rounded-2xl bg-stone-50 p-4"><strong className="block text-stone-950">Gestão centralizada</strong> Caixa, cozinha, equipe e relatórios por restaurante.</div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-black text-red-600">Restaurantes vinculados</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950">Escolha onde trabalhar agora</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {platformAdmin ? (
              <Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-950 px-5 py-2 text-sm font-black text-white shadow-sm hover:bg-red-700" href="/super-admin">
                Super Admin
              </Link>
            ) : null}
            <Link className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-5 py-2 text-sm font-black text-red-600 shadow-sm hover:bg-red-50" href="/onboarding/restaurante">
              Novo restaurante
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {memberships.map((membership) => (
            <Link key={membership.id} href={`/tenants/${membership.tenant_id}`} className="group rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70 transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-xl hover:shadow-red-100/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">{membership.role}</p>
                  <h3 className="mt-2 text-xl font-black text-stone-950 group-hover:text-red-600">{membership.tenants?.name ?? 'Restaurante sem nome'}</h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${membership.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-600'}`}>
                  {membership.status}
                </span>
              </div>
              <div className="mt-5 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
                <div className="rounded-2xl bg-stone-50 p-3"><span className="block text-xs text-stone-400">Tenant</span>{membership.tenants?.status ?? 'indefinido'}</div>
                <div className="rounded-2xl bg-stone-50 p-3"><span className="block text-xs text-stone-400">Ação</span>Abrir painel →</div>
              </div>
            </Link>
          ))}

          {memberships.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white p-6 text-center shadow-sm">
              <h2 className="text-xl font-black">Nenhum restaurante vinculado</h2>
              <p className="mt-2 text-sm leading-6 text-stone-500">Crie o primeiro restaurante para receber o papel owner e começar a configurar o cardápio.</p>
              <Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-5 py-2 font-black text-white shadow-lg shadow-red-100 hover:bg-red-700" href="/onboarding/restaurante">Criar restaurante</Link>
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
