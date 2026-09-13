import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';
import { getTenantNavigation, type TenantModuleSlug } from '@/lib/tenant/navigation';

const moduleIcons: Partial<Record<TenantModuleSlug, string>> = {
  'visao-geral': '⌂',
  cardapio: '☰',
  produtos: '▦',
  adicionais: '+',
  mesas: '▣',
  pedidos: '◷',
  cozinha: '♨',
  caixa: '$',
  equipe: '👥',
  relatorios: '▥',
  configuracoes: '⚙',
};

export function AppShell({
  children,
  tenantId,
}: Readonly<{
  children: React.ReactNode;
  tenantId?: string;
}>) {
  const tenantNav = tenantId ? getTenantNavigation(tenantId) : [];
  const bottomNav = tenantNav.length > 0
    ? tenantNav.filter((item) => ['visao-geral', 'produtos', 'pedidos', 'cozinha', 'caixa'].includes(item.slug))
    : [];

  return (
    <main className="min-h-screen bg-[#f7f7f5] pb-24 text-stone-950 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/95 shadow-sm shadow-stone-200/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-5 lg:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="inline-flex min-w-0 items-center gap-2 text-lg font-black tracking-tight text-stone-950 sm:text-xl">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-red-600 text-base text-white shadow-lg shadow-red-200">M</span>
              <span className="truncate">MesaFácil</span>
            </Link>
            <nav className="hidden flex-wrap items-center gap-2 text-sm font-semibold text-stone-600 md:flex">
              <Link href="/dashboard" className="rounded-full px-3 py-2 transition hover:bg-red-50 hover:text-red-600">Dashboard</Link>
              <Link href="/perfil" className="rounded-full px-3 py-2 transition hover:bg-red-50 hover:text-red-600">Perfil</Link>
              <Link href="/onboarding/restaurante" className="rounded-full px-3 py-2 transition hover:bg-red-50 hover:text-red-600">Novo restaurante</Link>
              <form action={signOutAction}>
                <button className="rounded-full border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600" type="submit">Sair</button>
              </form>
            </nav>
            <form action={signOutAction} className="md:hidden">
              <button aria-label="Sair" className="grid h-10 w-10 place-items-center rounded-2xl border border-stone-200 bg-white text-stone-600 shadow-sm" type="submit">↗</button>
            </form>
          </div>

          {tenantNav.length > 0 ? (
            <nav aria-label="Módulos do restaurante" className="-mx-4 hidden gap-2 overflow-x-auto px-4 pb-1 text-sm font-bold text-stone-600 md:flex sm:mx-0 sm:px-0">
              {tenantNav.map((item) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-2 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <span aria-hidden>{moduleIcons[item.slug] ?? '•'}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8 lg:px-6">{children}</div>

      {bottomNav.length > 0 ? (
        <nav aria-label="Navegação principal do restaurante" className="fixed inset-x-3 bottom-3 z-50 rounded-[1.5rem] border border-stone-200 bg-white/95 p-2 shadow-2xl shadow-stone-300/70 backdrop-blur md:hidden">
          <div className="grid grid-cols-5 gap-1">
            {bottomNav.map((item) => (
              <Link key={item.slug} href={item.href} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px] font-bold text-stone-500 transition hover:bg-red-50 hover:text-red-600">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-stone-50 text-lg text-stone-600">{moduleIcons[item.slug] ?? '•'}</span>
                <span className="max-w-full truncate">{item.slug === 'visao-geral' ? 'Home' : item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </main>
  );
}
