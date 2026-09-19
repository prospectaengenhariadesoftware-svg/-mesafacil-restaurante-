import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';
import { getTenantNavigation, getTenantPrimaryMobileNavigation, type TenantModuleSlug } from '@/lib/tenant/navigation';
import { NavigationPendingIndicator } from '@/components/navigation/navigation-pending-indicator';
import { AppIcon, type AppIconName } from './app-icon';
import { Button } from './primitives';

const moduleIcons: Partial<Record<TenantModuleSlug, AppIconName>> = {
  'visao-geral': 'home',
  pedidos: 'orders',
  mesas: 'tables',
  cozinha: 'kitchen',
  caixa: 'cash',
  cardapio: 'menu',
  produtos: 'products',
  adicionais: 'addons',
  relatorios: 'reports',
  equipe: 'team',
  configuracoes: 'settings',
};

const sidebarGroups: { title: string; items: TenantModuleSlug[] }[] = [
  { title: 'Operação', items: ['visao-geral', 'pedidos', 'mesas', 'cozinha', 'caixa'] },
  { title: 'Cardápio', items: ['cardapio', 'produtos', 'adicionais'] },
  { title: 'Gestão', items: ['relatorios', 'equipe', 'configuracoes'] },
];

export function DesignSystemShell({ tenantId, activeModule = 'pedidos', children }: Readonly<{ tenantId: string; activeModule?: TenantModuleSlug; children: React.ReactNode }>) {
  const nav = getTenantNavigation(tenantId);
  const bySlug = new Map(nav.map((item) => [item.slug, item]));
  const mobileItems = getTenantPrimaryMobileNavigation(tenantId);

  return (
    <main className="min-h-screen bg-[#fbfafc] pb-24 text-gray-950 md:pb-0">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] border-r border-gray-200 bg-white px-3 py-4 md:flex md:flex-col">
        <Link href={`/tenants/${tenantId}`} className="flex items-center gap-3 rounded-2xl px-2 py-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-600 text-white"><AppIcon name="brand" size={22} /></span>
          <span className="leading-tight"><span className="block text-base font-black tracking-tight">MesaFácil</span><span className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Restaurante SaaS</span></span>
        </Link>

        <nav aria-label="Navegação piloto MesaFácil" className="mt-6 flex-1 space-y-5 overflow-y-auto pr-1">
          {sidebarGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">{group.title}</p>
              <div className="space-y-1">
                {group.items.map((slug) => {
                  const item = bySlug.get(slug);
                  if (!item) return null;
                  const active = activeModule === slug;
                  return (
                    <Link key={slug} href={item.href} className={`flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-extrabold transition ${active ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'}`}>
                      <AppIcon name={moduleIcons[slug] ?? 'home'} size={18} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm font-black text-gray-950">Restaurante atual</p>
          <p className="mt-1 text-xs font-semibold text-green-700">● Operação ativa</p>
          <div className="mt-3 grid gap-2">
            <Button href="/perfil" variant="secondary" className="min-h-10 justify-start px-3"><AppIcon name="customers" size={16} />Perfil</Button>
            <form action={signOutAction}>
              <button className="inline-flex min-h-10 w-full items-center justify-start gap-2 rounded-xl px-3 py-2 text-sm font-extrabold text-gray-600 transition hover:bg-white hover:text-red-700" type="submit"><AppIcon name="logout" size={16} />Sair</button>
            </form>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur md:ml-[232px]">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 md:px-6">
          <Link href={`/tenants/${tenantId}`} className="flex items-center gap-2 md:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-600 text-white"><AppIcon name="brand" size={20} /></span><span className="font-black">MesaFácil</span></Link>
          <div className="hidden items-center gap-2 text-sm font-semibold text-gray-500 md:flex"><AppIcon name="bell" size={18} /><span>Central operacional do restaurante</span></div>
          <Button href={`/tenants/${tenantId}`} variant="secondary"><AppIcon name="home" size={16} />Início</Button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:ml-[232px] md:px-6 lg:px-8">{children}</section>

      <nav aria-label="Navegação inferior piloto" className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-gray-200 bg-white/95 p-2 shadow-2xl shadow-gray-300/60 backdrop-blur md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileItems.map((item) => item ? (
            <Link key={item.slug} href={item.href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-black ${item.slug === activeModule ? 'text-red-700' : 'text-gray-500'}`}>
              <AppIcon name={moduleIcons[item.slug] ?? 'home'} size={18} />
              <span className="flex items-center justify-center">{item.slug === 'visao-geral' ? 'Início' : item.label}<NavigationPendingIndicator /></span>
            </Link>
          ) : null)}
        </div>
      </nav>
    </main>
  );
}
