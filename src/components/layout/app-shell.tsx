import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';
import { getTenantNavigation } from '@/lib/tenant/navigation';

export function AppShell({
  children,
  tenantId,
}: Readonly<{
  children: React.ReactNode;
  tenantId?: string;
}>) {
  const tenantNav = tenantId ? getTenantNavigation(tenantId) : [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/dashboard" className="text-xl font-black text-emerald-300">MesaFácil</Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <Link href="/dashboard" className="hover:text-emerald-300">Dashboard</Link>
            <Link href="/perfil" className="hover:text-emerald-300">Perfil</Link>
            <Link href="/onboarding/restaurante" className="hover:text-emerald-300">Novo restaurante</Link>
            <form action={signOutAction}>
              <button className="rounded-full border border-slate-700 px-3 py-1.5 hover:border-emerald-300 hover:text-emerald-300" type="submit">Sair</button>
            </form>
          </nav>
        </div>
        {tenantNav.length > 0 ? (
          <div className="border-t border-slate-800">
            <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 text-sm text-slate-300">
              {tenantNav.map((item) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  className="shrink-0 rounded-full border border-slate-800 px-3 py-1.5 hover:border-emerald-300 hover:text-emerald-300"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        ) : null}
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </main>
  );
}
