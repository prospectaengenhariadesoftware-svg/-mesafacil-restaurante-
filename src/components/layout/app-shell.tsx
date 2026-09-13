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
    <main className="min-h-screen bg-[#f7f7f5] text-stone-950">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/95 shadow-sm shadow-stone-200/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 sm:px-5 lg:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-stone-950">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-red-500 text-base text-white shadow-lg shadow-red-200">M</span>
              <span>MesaFácil</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-stone-600">
              <Link href="/dashboard" className="rounded-full px-3 py-2 transition hover:bg-red-50 hover:text-red-600">Dashboard</Link>
              <Link href="/perfil" className="rounded-full px-3 py-2 transition hover:bg-red-50 hover:text-red-600">Perfil</Link>
              <Link href="/onboarding/restaurante" className="rounded-full px-3 py-2 transition hover:bg-red-50 hover:text-red-600">Novo restaurante</Link>
              <form action={signOutAction}>
                <button className="rounded-full border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600" type="submit">Sair</button>
              </form>
            </nav>
          </div>

          {tenantNav.length > 0 ? (
            <nav aria-label="Módulos do restaurante" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm font-bold text-stone-600 sm:mx-0 sm:px-0">
              {tenantNav.map((item) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  className="shrink-0 rounded-full border border-stone-200 bg-stone-50 px-4 py-2 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8 lg:px-6">{children}</div>
    </main>
  );
}
