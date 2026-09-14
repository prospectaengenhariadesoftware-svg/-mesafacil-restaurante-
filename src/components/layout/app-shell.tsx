import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';
import { getTenantNavigation, type TenantModuleSlug, type TenantNavigationItem } from '@/lib/tenant/navigation';

const moduleShortLabels: Partial<Record<TenantModuleSlug, string>> = {
  'visao-geral': 'Início',
  cardapio: 'Cardápio',
  produtos: 'Produtos',
  adicionais: 'Adic.',
  mesas: 'Mesas',
  pedidos: 'Pedidos',
  cozinha: 'Cozinha',
  caixa: 'Caixa',
  equipe: 'Equipe',
  relatorios: 'Relatórios',
  configuracoes: 'Ajustes',
};

const moduleGroups: ReadonlyArray<{
  title: string;
  slugs: TenantModuleSlug[];
}> = [
  { title: 'Operação', slugs: ['visao-geral', 'pedidos', 'mesas', 'cozinha', 'caixa'] },
  { title: 'Cardápio', slugs: ['cardapio', 'produtos', 'adicionais'] },
  { title: 'Gestão', slugs: ['relatorios', 'equipe', 'configuracoes'] },
];

function LineIcon({ name }: Readonly<{ name: TenantModuleSlug | 'dashboard' | 'profile' | 'logout' | 'new' | 'bell' }>) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, React.ReactNode> = {
    'visao-geral': <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    pedidos: <><path d="M8 7h12l-1.5 9h-9z" /><path d="M8 7 7 4H4" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
    mesas: <><path d="M5 10h14" /><path d="M7 10v10" /><path d="M17 10v10" /><path d="M9 4h6a4 4 0 0 1 4 4v2H5V8a4 4 0 0 1 4-4Z" /></>,
    cozinha: <><path d="M6 11h12" /><path d="M8 11v8" /><path d="M16 11v8" /><path d="M9 7c0-2 2-2 2-4" /><path d="M15 7c0-2 2-2 2-4" /></>,
    caixa: <><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M4 10h16" /><path d="M8 14h3" /></>,
    cardapio: <><path d="M5 5h7a3 3 0 0 1 3 3v11H8a3 3 0 0 0-3 3z" /><path d="M15 8h4v11h-4" /></>,
    produtos: <><path d="M12 3 4 7v10l8 4 8-4V7z" /><path d="M4 7l8 4 8-4" /><path d="M12 11v10" /></>,
    adicionais: <><circle cx="12" cy="12" r="8" /><path d="M12 8v8" /><path d="M8 12h8" /></>,
    relatorios: <><path d="M5 19V9" /><path d="M12 19V5" /><path d="M19 19v-7" /></>,
    equipe: <><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>,
    configuracoes: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2 3.46-.08-.02a1.65 1.65 0 0 0-1.84.4 1.65 1.65 0 0 0-.45 1.8h-4a1.65 1.65 0 0 0-.45-1.8 1.65 1.65 0 0 0-1.84-.4l-.08.02-2-3.46.06-.06A1.65 1.65 0 0 0 6.6 15 1.65 1.65 0 0 0 5 13.75V10.25A1.65 1.65 0 0 0 6.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2-3.46.08.02a1.65 1.65 0 0 0 1.84-.4 1.65 1.65 0 0 0 .45-1.8h4a1.65 1.65 0 0 0 .45 1.8 1.65 1.65 0 0 0 1.84.4l.08-.02 2 3.46-.06.06A1.65 1.65 0 0 0 17.4 9 1.65 1.65 0 0 0 19 10.25v3.5A1.65 1.65 0 0 0 17.4 15z" /></>,
    dashboard: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 3v18" /></>,
    new: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" {...common}>{paths[name] ?? paths.dashboard}</svg>;
}

function BrandMark({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-600 text-lg font-black text-white shadow-lg shadow-red-200">🍴</span>
      {!compact ? (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-lg font-black tracking-tight text-gray-950">MesaFácil</span>
          <span className="block truncate text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Restaurante SaaS</span>
        </span>
      ) : null}
    </Link>
  );
}

function TenantSidebarItem({ item, active }: Readonly<{ item: TenantNavigationItem; active: boolean }>) {
  return (
    <Link
      href={item.href}
      className={`group flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-extrabold transition ${active ? 'bg-red-50 text-red-700 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-950'}`}
    >
      <span className={`shrink-0 ${active ? 'text-red-600' : 'text-gray-500 group-hover:text-gray-800'}`}><LineIcon name={item.slug} /></span>
      <span className="truncate">{item.label}</span>

    </Link>
  );
}

function Sidebar({ tenantNav, activeModule }: Readonly<{ tenantNav: TenantNavigationItem[]; activeModule?: TenantModuleSlug }>) {
  const groupedTenantNav = moduleGroups.map((group) => ({
    ...group,
    items: tenantNav.filter((item) => group.slugs.includes(item.slug)),
  }));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] border-r border-gray-200 bg-[#f8fafc] px-4 py-5 md:flex md:flex-col">
      <BrandMark />
      <nav aria-label="Módulos do restaurante" className="mt-7 flex-1 space-y-5 overflow-y-auto pr-1">
        {groupedTenantNav.map((group) => group.items.length > 0 ? (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => <TenantSidebarItem key={item.slug} item={item} active={item.slug === activeModule} />)}
            </div>
          </div>
        ) : null)}
      </nav>
      <div className="mt-5 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gray-950 text-sm font-black text-white">MF</div>
        <p className="mt-3 text-sm font-black text-gray-950">Operação ativa</p>
        <p className="mt-1 text-xs font-semibold text-gray-500">Dados protegidos por tenant.</p>
        <Link href="/dashboard" className="mt-3 flex min-h-10 items-center justify-center rounded-xl border border-gray-200 text-xs font-black text-gray-700 hover:border-red-200 hover:text-red-700">Trocar restaurante</Link>
      </div>
      <form action={signOutAction} className="mt-3">
        <button className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-extrabold text-gray-600 hover:bg-white hover:text-red-700" type="submit"><LineIcon name="logout" />Sair</button>
      </form>
    </aside>
  );
}

function TopBar({ tenantMode }: Readonly<{ tenantMode: boolean }>) {
  return (
    <header className={`sticky top-0 z-30 border-b border-gray-200 bg-white/92 backdrop-blur ${tenantMode ? 'md:ml-[252px]' : ''}`}>
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="md:hidden"><BrandMark compact /></div>
        {!tenantMode ? <BrandMark /> : null}
        <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
          <div className="flex h-11 w-full max-w-xl items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-500" aria-label="Padrão visual MesaFácil">
            <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden="true" />
            <span className="truncate">Gestão rápida para restaurantes · operação, salão, cozinha e caixa</span>
          </div>
        </div>
        <nav className="hidden items-center gap-2 md:flex">
          <Link href="/dashboard" className="mf-btn-secondary"><LineIcon name="dashboard" />Dashboard</Link>
          <Link href="/onboarding/restaurante" className="mf-btn-primary"><LineIcon name="new" />Novo restaurante</Link>
          <Link href="/perfil" className="grid h-11 w-11 place-items-center rounded-2xl bg-red-600 font-black text-white" aria-label="Perfil">T</Link>
          {!tenantMode ? (
            <form action={signOutAction}>
              <button className="mf-btn-secondary" type="submit"><LineIcon name="logout" />Sair</button>
            </form>
          ) : null}
        </nav>
        <form action={signOutAction} className="md:hidden">
          <button aria-label="Sair" className="grid h-11 w-11 place-items-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm" type="submit"><LineIcon name="logout" /></button>
        </form>
      </div>
    </header>
  );
}

function MobileNavItem({ item, active }: Readonly<{ item: TenantNavigationItem; active: boolean }>) {
  return (
    <Link
      href={item.href}
      className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px] font-black transition ${active ? 'text-red-700' : 'text-gray-500 hover:text-gray-900'}`}
    >
      <LineIcon name={item.slug} />
      <span className="max-w-full truncate">{moduleShortLabels[item.slug] ?? item.label}</span>
    </Link>
  );
}

export function AppShell({
  children,
  tenantId,
  activeModule,
}: Readonly<{
  children: React.ReactNode;
  tenantId?: string;
  activeModule?: TenantModuleSlug;
}>) {
  const tenantNav = tenantId ? getTenantNavigation(tenantId) : [];
  const bottomNav = tenantNav.length > 0
    ? tenantNav.filter((item) => ['visao-geral', 'cardapio', 'pedidos', 'mesas', 'caixa'].includes(item.slug))
    : [];
  const tenantMode = tenantNav.length > 0;

  return (
    <main className="mf-app-bg min-h-screen pb-24 md:pb-0">
      {tenantMode ? <Sidebar tenantNav={tenantNav} activeModule={activeModule} /> : null}
      <TopBar tenantMode={tenantMode} />
      <div className={`mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 ${tenantMode ? 'md:ml-[252px]' : ''}`}>{children}</div>
      {bottomNav.length > 0 ? (
        <nav aria-label="Navegação principal do restaurante" className="fixed inset-x-3 bottom-3 z-50 rounded-[1.35rem] border border-gray-200 bg-white/95 p-2 shadow-2xl shadow-gray-300/60 backdrop-blur md:hidden">
          <div className="grid grid-cols-5 gap-1">
            {bottomNav.map((item) => <MobileNavItem key={item.slug} item={item} active={item.slug === activeModule} />)}
          </div>
        </nav>
      ) : null}
    </main>
  );
}
