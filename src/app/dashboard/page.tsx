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
      <section className="rounded-3xl border border-stone-200 bg-white p-6">
        <p className="text-sm font-semibold text-red-600">Dashboard seguro</p>
        <h1 className="mt-2 text-3xl font-black">Olá, {profile?.name ?? user.email}</h1>
        <p className="mt-3 max-w-3xl text-stone-600">Selecione um restaurante/tenant para acessar a página inicial. Usuários sem vínculo ativo não acessam dados de restaurantes.</p>
        {erro ? <p className="mt-4 rounded-xl border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p> : null}
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {memberships.map((membership) => (
          <Link key={membership.id} href={`/tenants/${membership.tenant_id}`} className="rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-red-500">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{membership.role}</p>
            <h2 className="mt-2 text-xl font-bold">{membership.tenants?.name ?? 'Restaurante sem nome'}</h2>
            <p className="mt-2 text-sm text-stone-500">Status do vínculo: {membership.status}</p>
            <p className="mt-1 text-sm text-stone-500">Status do tenant: {membership.tenants?.status ?? 'indefinido'}</p>
          </Link>
        ))}
        {memberships.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-5">
            <h2 className="text-xl font-bold">Nenhum restaurante vinculado</h2>
            <p className="mt-2 text-sm text-stone-500">Crie o primeiro restaurante para receber o papel owner.</p>
            <Link className="mt-4 inline-flex rounded-xl bg-red-500 px-4 py-2 font-bold text-white" href="/onboarding/restaurante">Criar restaurante</Link>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
