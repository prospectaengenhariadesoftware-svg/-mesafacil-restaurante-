import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { getCurrentProfile, getTenantMemberships, requireUser } from '@/lib/auth/context';

export default async function DashboardPage({ searchParams }: Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }>) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const memberships = await getTenantMemberships(user.id);
  const profile = await getCurrentProfile(user.id);
  const erro = typeof params.erro === 'string' ? params.erro : undefined;

  return (
    <AppShell>
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm font-semibold text-emerald-300">Dashboard seguro</p>
        <h1 className="mt-2 text-3xl font-black">Olá, {profile?.name ?? user.email}</h1>
        <p className="mt-3 max-w-3xl text-slate-300">Selecione um restaurante/tenant para acessar a página inicial. Usuários sem vínculo ativo não acessam dados de restaurantes.</p>
        {erro ? <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{erro}</p> : null}
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {memberships.map((membership) => (
          <Link key={membership.id} href={`/tenants/${membership.tenant_id}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-emerald-400">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{membership.role}</p>
            <h2 className="mt-2 text-xl font-bold">{membership.tenants?.name ?? 'Restaurante sem nome'}</h2>
            <p className="mt-2 text-sm text-slate-400">Status do vínculo: {membership.status}</p>
            <p className="mt-1 text-sm text-slate-400">Status do tenant: {membership.tenants?.status ?? 'indefinido'}</p>
          </Link>
        ))}
        {memberships.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Nenhum restaurante vinculado</h2>
            <p className="mt-2 text-sm text-slate-400">Crie o primeiro restaurante para receber o papel owner.</p>
            <Link className="mt-4 inline-flex rounded-xl bg-emerald-400 px-4 py-2 font-bold text-slate-950" href="/onboarding/restaurante">Criar restaurante</Link>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
