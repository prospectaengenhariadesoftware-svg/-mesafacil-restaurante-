import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/tenant/operational-panels';
import { requireActiveTenant } from '@/lib/auth/context';
import { getTenantNavigation, type TenantModuleSlug } from '@/lib/tenant/navigation';
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

export default async function TenantHomePage({ params }: Readonly<{ params: Promise<{ tenantId: string }> }>) {
  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  const membership = await requireActiveTenant(tenantId);
  const tenant = membership.tenants;
  const modules = getTenantNavigation(tenantId).filter((item) => item.slug !== 'visao-geral');

  const supabase = await createClient();
  const [categories, products, tables, openOrders] = await Promise.all([
    supabase.from('tenant_product_categories').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_tables').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_customer_orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['received', 'confirmed', 'preparing', 'ready']),
  ]);

  return (
    <AppShell tenantId={tenantId}>
      <section className="space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl shadow-stone-200/70">
          <div className="bg-gradient-to-br from-white via-white to-red-50 px-6 py-8 sm:px-8">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-red-600">Operação do restaurante</p>
            <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-stone-950 sm:text-5xl">
              Controle total do {tenant?.name} em um só lugar
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
              Gerencie cardápio, produtos, mesas, pedidos, cozinha e caixa com visual organizado para desktop, tablet e celular.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">Papel: {membership.role}</span>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-700">Status: {tenant?.status}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Categorias" value={categories.count ?? 0} />
          <StatCard label="Produtos" value={products.count ?? 0} />
          <StatCard label="Mesas" value={tables.count ?? 0} />
          <StatCard label="Pedidos abertos" value={openOrders.count ?? 0} />
        </div>

        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black text-red-600">Módulos</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">O que deseja fazer?</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
            {modules.map((item) => (
              <Link key={item.slug} href={item.href} className="group relative min-h-40 rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70 transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-xl hover:shadow-red-100/70">
                {item.slug === 'pedidos' && (openOrders.count ?? 0) > 0 ? <span className="absolute right-4 top-4 h-3 w-3 rounded-full bg-red-600 ring-4 ring-red-100" /> : null}
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-stone-50 text-2xl text-stone-600 transition group-hover:bg-red-50 group-hover:text-red-600">{moduleIcons[item.slug] ?? '•'}</span>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-stone-400">{moduleGroups[item.slug] ?? 'Módulo'}</p>
                <h3 className="mt-1 text-lg font-black leading-6 text-stone-950">{item.label}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
