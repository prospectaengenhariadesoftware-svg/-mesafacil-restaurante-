import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';
import { NavigationPendingIndicator } from '@/components/navigation/navigation-pending-indicator';
import { getTenantNavigation, getTenantPrimaryMobileNavigation, type TenantModuleSlug, type TenantNavigationItem } from '@/lib/tenant/navigation';

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

const moduleShortLabels: Partial<Record<TenantModuleSlug, string>> = {
  'visao-geral': 'Home',
  cardapio: 'Cardápio',
  produtos: 'Produtos',
  adicionais: 'Adic.',
  mesas: 'Mesas',
  pedidos: 'Pedidos',
  cozinha: 'Cozinha',
  caixa: 'Caixa',
  equipe: 'Equipe',
  relatorios: 'Gestão',
  configuracoes: 'Ajustes',
};

const moduleGroups: ReadonlyArray<{
  title: string;
  slugs: TenantModuleSlug[];
}> = [
  { title: 'Operação', slugs: ['visao-geral', 'pedidos', 'cozinha', 'caixa'] },
  { title: 'Cadastros', slugs: ['cardapio', 'produtos', 'adicionais', 'mesas'] },
  { title: 'Gestão', slugs: ['relatorios', 'equipe', 'configuracoes'] },
];

function TenantNavPill({ item, featured = false }: Readonly<{ item: TenantNavigationItem; featured?: boolean }>) {
  return (
    <Link
      href={item.href}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-700 hover:shadow-md ${featured ? 'border-red-200 bg-red-50 text-red-800' : 'border-stone-200 bg-white text-stone-700'}`}
    >
      <span aria-hidden className={`grid h-7 w-7 place-items-center rounded-xl ${featured ? 'bg-red-600 text-white' : 'bg-stone-100 text-stone-700'}`}>
        {moduleIcons[item.slug] ?? '•'}
      </span>
      {item.label}
    </Link>
  );
}

function TenantModuleGroup({
  title,
  items,
}: Readonly<{
  title: string;
  items: TenantNavigationItem[];
}>) {
  if (items.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-2 rounded-[1.25rem] border border-stone-200 bg-stone-50 p-2">
      <span className="hidden px-2 text-[11px] font-black uppercase tracking-[0.14em] text-stone-500 lg:inline">{title}</span>
      {items.map((item) => <TenantNavPill key={item.slug} item={item} featured={['pedidos', 'cozinha', 'caixa'].includes(item.slug)} />)}
    </div>
  );
}

function MobileNavItem({ item }: Readonly<{ item: TenantNavigationItem }>) {
  const featured = ['pedidos', 'cozinha', 'caixa'].includes(item.slug);

  return (
    <Link
      href={item.href}
      className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px] font-black transition hover:bg-red-50 hover:text-red-700 ${featured ? 'text-red-700' : 'text-stone-600'}`}
    >
      <span className={`grid h-8 w-8 place-items-center rounded-xl text-lg ${featured ? 'bg-red-50 text-red-700' : 'bg-stone-50 text-stone-700'}`}>{moduleIcons[item.slug] ?? '•'}</span>
      <span className="flex max-w-full items-center justify-center truncate">{moduleShortLabels[item.slug] ?? item.label}<NavigationPendingIndicator /></span>
    </Link>
  );
}

export function AppShell({
  children,
  tenantId,
}: Readonly<{
  children: React.ReactNode;
  tenantId?: string;
}>) {
  const tenantNav = tenantId ? getTenantNavigation(tenantId) : [];
  const bottomNav = tenantId ? getTenantPrimaryMobileNavigation(tenantId) : [];
  const groupedTenantNav = moduleGroups.map((group) => ({
    ...group,
    items: tenantNav.filter((item) => group.slugs.includes(item.slug)),
  }));

  return (
    <main className="min-h-screen bg-[#f7f7f5] pb-24 text-stone-950 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/95 shadow-sm shadow-stone-200/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-5 lg:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="inline-flex min-w-0 items-center gap-3 rounded-2xl pr-3 text-lg font-black tracking-tight text-stone-950 transition hover:bg-stone-50 sm:text-xl">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-600 text-base text-white shadow-lg shadow-red-200">M</span>
              <span className="min-w-0">
                <span className="block truncate leading-tight">MesaFácil</span>
                <span className="block truncate text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">Restaurante SaaS</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-2 text-sm font-semibold text-stone-600 md:flex">
              <Link href="/dashboard" className="rounded-full px-3 py-2 transition hover:bg-red-50 hover:text-red-700">Dashboard</Link>
              <Link href="/perfil" className="rounded-full px-3 py-2 transition hover:bg-red-50 hover:text-red-700">Perfil</Link>
              <Link href="/onboarding/restaurante" className="rounded-full bg-red-600 px-4 py-2 font-black text-white shadow-lg shadow-red-100 transition hover:bg-red-700">Novo restaurante</Link>
              <form action={signOutAction}>
                <button className="rounded-full border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700" type="submit">Sair</button>
              </form>
            </nav>

            <form action={signOutAction} className="md:hidden">
              <button aria-label="Sair" className="grid h-11 w-11 place-items-center rounded-2xl border border-stone-200 bg-white text-stone-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700" type="submit">↗</button>
            </form>
          </div>

          {tenantNav.length > 0 ? (
            <nav aria-label="Módulos do restaurante" className="-mx-4 hidden gap-3 overflow-x-auto px-4 pb-1 md:flex sm:mx-0 sm:px-0">
              {groupedTenantNav.map((group) => <TenantModuleGroup key={group.title} title={group.title} items={group.items} />)}
            </nav>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8 lg:px-6">{children}</div>

      {bottomNav.length > 0 ? (
        <nav aria-label="Navegação principal do restaurante" className="fixed inset-x-3 bottom-3 z-50 rounded-[1.5rem] border border-stone-200 bg-white/95 p-2 shadow-2xl shadow-stone-300/70 backdrop-blur md:hidden">
          <div className="grid grid-cols-5 gap-1">
            {bottomNav.map((item) => <MobileNavItem key={item.slug} item={item} />)}
          </div>
        </nav>
      ) : null}
    </main>
  );
}
