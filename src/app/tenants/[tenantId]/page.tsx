import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/tenant/operational-panels';
import { requireActiveTenant } from '@/lib/auth/context';
import { getTenantNavigation, type TenantModuleSlug, type TenantNavigationItem } from '@/lib/tenant/navigation';
import { isUuid } from '@/lib/validation/auth';
import { createClient } from '@/lib/supabase/server';

const moduleIcons: Partial<Record<TenantModuleSlug, string>> = {
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

const moduleGroups: Partial<Record<TenantModuleSlug, string>> = {
  cardapio: 'Cadastros',
  produtos: 'Cadastros',
  adicionais: 'Cadastros',
  mesas: 'Salão',
  pedidos: 'Operação',
  cozinha: 'Operação',
  caixa: 'Financeiro',
  equipe: 'Equipe',
  relatorios: 'Gestão',
  configuracoes: 'Ajustes',
};

const moduleHints: Partial<Record<TenantModuleSlug, string>> = {
  cardapio: 'Organize categorias antes de cadastrar produtos.',
  produtos: 'Monte o cardápio vendável com preço e disponibilidade.',
  adicionais: 'Configure complementos para aumentar ticket médio.',
  mesas: 'Gere QR Codes por mesa e setor do salão.',
  pedidos: 'Acompanhe novos pedidos e avance status.',
  cozinha: 'Veja fila de preparo em modo produção.',
  caixa: 'Feche contas por mesa e registre pagamento.',
  equipe: 'Controle usuários e papéis do restaurante.',
  relatorios: 'Leia vendas, caixa, produtos e operação.',
  configuracoes: 'Ajuste dados públicos, slug e status.',
};

type ModuleCardProps = Readonly<{
  item: TenantNavigationItem;
  count?: number;
  featured?: boolean;
}>;

function ModuleCard({ item, count, featured = false }: ModuleCardProps) {
  return (
    <Link
      href={item.href}
      className={`group relative flex min-h-44 flex-col rounded-[1.75rem] border bg-white p-5 shadow-sm shadow-stone-200/70 transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-xl hover:shadow-red-100/70 ${featured ? 'border-red-200 ring-1 ring-red-100' : 'border-stone-200'}`}
    >
      {typeof count === 'number' && count > 0 ? (
        <span className="absolute right-4 top-4 inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-black text-white ring-4 ring-red-100">
          {count}
        </span>
      ) : null}
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-stone-50 text-2xl text-stone-700 transition group-hover:bg-red-50 group-hover:text-red-700">
        {moduleIcons[item.slug] ?? '•'}
      </span>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-red-700">{moduleGroups[item.slug] ?? 'Módulo'}</p>
      <h3 className="mt-1 text-lg font-black leading-6 text-stone-950">{item.label}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{moduleHints[item.slug] ?? item.description}</p>
      <span className="mt-auto pt-4 text-sm font-black text-red-700">Abrir módulo →</span>
    </Link>
  );
}

function ProgressBar({ value, label }: Readonly<{ value: number; label: string }>) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue} aria-label={label}>
      <div className="h-full rounded-full bg-red-600" style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function getModuleCount(slug: TenantModuleSlug, counts: { categories: number; products: number; tables: number; openOrders: number }) {
  if (slug === 'cardapio') return counts.categories;
  if (slug === 'produtos') return counts.products;
  if (slug === 'mesas') return counts.tables;
  if (slug === 'pedidos' || slug === 'cozinha') return counts.openOrders;
  return undefined;
}

export default async function TenantHomePage({ params }: Readonly<{ params: Promise<{ tenantId: string }> }>) {
  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  const membership = await requireActiveTenant(tenantId);
  const tenant = membership.tenants;
  const modules = getTenantNavigation(tenantId).filter((item) => item.slug !== 'visao-geral');
  const priorityModules = modules.filter((item) => ['pedidos', 'cozinha', 'caixa', 'relatorios'].includes(item.slug));
  const setupModules = modules.filter((item) => ['cardapio', 'produtos', 'adicionais', 'mesas'].includes(item.slug));
  const adminModules = modules.filter((item) => ['equipe', 'configuracoes'].includes(item.slug));

  const supabase = await createClient();
  const [categories, products, availableProducts, tables, activeTables, openOrders] = await Promise.all([
    supabase.from('tenant_product_categories').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_available', true),
    supabase.from('tenant_tables').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_tables').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('tenant_customer_orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['received', 'confirmed', 'preparing', 'ready']),
  ]);

  const counts = {
    categories: categories.count ?? 0,
    products: products.count ?? 0,
    availableProducts: availableProducts.count ?? 0,
    tables: tables.count ?? 0,
    activeTables: activeTables.count ?? 0,
    openOrders: openOrders.count ?? 0,
  };
  const productReadiness = counts.products > 0 ? (counts.availableProducts / counts.products) * 100 : 0;
  const tableReadiness = counts.tables > 0 ? (counts.activeTables / counts.tables) * 100 : 0;
  const hasBasicSetup = counts.categories > 0 && counts.products > 0 && counts.tables > 0;

  return (
    <AppShell tenantId={tenantId}>
      <section className="space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-xl shadow-stone-200/70">
          <div className="bg-gradient-to-br from-red-700 via-red-600 to-red-800 px-5 py-7 text-white sm:px-8 sm:py-9">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white">MesaFácil • Operação do restaurante</p>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
                  Bom serviço começa aqui, {tenant?.name}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white">
                  Use os atalhos para operar pedidos, cozinha, caixa e relatórios; ou ajuste cadastros antes do salão abrir.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full border border-white/25 bg-white px-3 py-2 text-red-700">Papel: {membership.role}</span>
                <span className="rounded-full border border-white/25 bg-white px-3 py-2 text-red-700">Status: {tenant?.status}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:p-5">
            <StatCard label="Categorias" value={counts.categories} hint="Estrutura do cardápio." />
            <StatCard label="Produtos" value={counts.products} hint={`${counts.availableProducts} disponível(is) para venda.`} />
            <StatCard label="Mesas" value={counts.tables} hint={`${counts.activeTables} ativa(s) com potencial de QR.`} />
            <StatCard label="Pedidos abertos" value={counts.openOrders} hint="Fila operacional atual." />
          </div>
        </div>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <article className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Atalhos de operação</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950">Abrir serviço</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">Fluxo principal: pedidos entram, cozinha prepara, caixa fecha e relatórios acompanham.</p>
              </div>
              <span className={`rounded-full border px-4 py-2 text-xs font-black ${hasBasicSetup ? 'border-green-100 bg-green-50 text-green-800' : 'border-amber-100 bg-amber-50 text-amber-900'}`}>
                {hasBasicSetup ? 'Base pronta' : 'Completar cadastros'}
              </span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {priorityModules.map((item) => <ModuleCard key={item.slug} item={item} count={getModuleCount(item.slug, counts)} featured />)}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Prontidão</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950">Checklist do restaurante</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-stone-950">Produtos à venda</p>
                    <p className="text-sm text-stone-600">{counts.availableProducts}/{counts.products} disponíveis.</p>
                  </div>
                  <span className="text-2xl font-black text-red-700">{Math.round(productReadiness)}%</span>
                </div>
                <div className="mt-3"><ProgressBar value={productReadiness} label="Produtos disponíveis" /></div>
              </div>
              <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-stone-950">Mesas ativas</p>
                    <p className="text-sm text-stone-600">{counts.activeTables}/{counts.tables} prontas para QR.</p>
                  </div>
                  <span className="text-2xl font-black text-red-700">{Math.round(tableReadiness)}%</span>
                </div>
                <div className="mt-3"><ProgressBar value={tableReadiness} label="Mesas ativas" /></div>
              </div>
            </div>
          </article>
        </section>

        <section>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Cadastros</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950">Preparar o cardápio e salão</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {setupModules.map((item) => <ModuleCard key={item.slug} item={item} count={getModuleCount(item.slug, counts)} />)}
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Administração</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950">Equipe e ajustes</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {adminModules.map((item) => <ModuleCard key={item.slug} item={item} />)}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
