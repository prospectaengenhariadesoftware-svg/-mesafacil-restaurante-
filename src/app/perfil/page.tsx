import { AppShell } from '@/components/layout/app-shell';
import { getCurrentProfile, requireUser } from '@/lib/auth/context';

export default async function PerfilPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile(user.id);

  return (
    <AppShell>
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm font-semibold text-emerald-300">Perfil do usuário</p>
        <h1 className="mt-2 text-3xl font-black">{profile?.name ?? 'Perfil pendente'}</h1>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">E-mail</dt><dd className="font-semibold">{profile?.email ?? user.email}</dd></div>
          <div><dt className="text-slate-500">Status</dt><dd className="font-semibold">{profile?.status ?? 'sem perfil'}</dd></div>
          <div><dt className="text-slate-500">User ID</dt><dd className="break-all font-mono text-xs">{user.id}</dd></div>
        </dl>
      </section>
    </AppShell>
  );
}
