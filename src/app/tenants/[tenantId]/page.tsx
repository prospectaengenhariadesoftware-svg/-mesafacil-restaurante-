import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { buildOperationalReport, type ReportItemRow, type ReportOrderRow, type ReportPaymentRow } from '@/lib/domain/reports';
import { requireActiveTenant } from '@/lib/auth/context';
import { getTenantNavigation, type TenantModuleSlug, type TenantNavigationItem } from '@/lib/tenant/navigation';
import { isUuid } from '@/lib/validation/auth';
import { createClient } from '@/lib/supabase/server';

const REPORT_ROW_LIMIT = 10000;

type CountedRows<T> = {
  data: T[] | null;
  count: number | null;
};

type RecentOrderTable = { number: string; sector: string | null };

type RecentOrder = {
  id: string;
  public_order_code: string;
  customer_name: string | null;
  status: 'received' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  total_cents: number;
  created_at: string;
  tenant_tables: RecentOrderTable | RecentOrderTable[] | null;
};

type StatusTone = 'red' | 'green' | 'amber' | 'blue' | 'purple' | 'slate' | 'orange';

type QuickModuleMeta = {
  icon: string;
  group: string;
  hint: string;
  tone: StatusTone;
};

const moduleMeta: Partial<Record<TenantModuleSlug, QuickModuleMeta>> = {
  cardapio: { icon: '🍽️', group: 'Cardápio', hint: 'Gerencie categorias', tone: 'red' },
  produtos: { icon: '🧾', group: 'Estoque', hint: 'Produtos e disponibilidade', tone: 'blue' },
  adicionais: { icon: '🧩', group: 'Complementos', hint: 'Adicionais e acréscimos', tone: 'green' },
  mesas: { icon: '🪑', group: 'Salão', hint: 'Mesas, setores e QR', tone: 'purple' },
  pedidos: { icon: '🛒', group: 'Operação', hint: 'Pedidos em tempo real', tone: 'red' },
  cozinha: { icon: '♨️', group: 'Produção', hint: 'Fila de preparo', tone: 'orange' },
  caixa: { icon: '💵', group: 'Financeiro', hint: 'Fechamento e pagamentos', tone: 'amber' },
  equipe: { icon: '👥', group: 'Equipe', hint: 'Usuários e papéis', tone: 'slate' },
  relatorios: { icon: '📊', group: 'Gestão', hint: 'Vendas e desempenho', tone: 'red' },
  configuracoes: { icon: '⚙️', group: 'Ajustes', hint: 'Dados do restaurante', tone: 'slate' },
};

const orderStatusLabels: Record<RecentOrder['status'], string> = {
  received: 'Recebido',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const orderStatusClasses: Record<RecentOrder['status'], string> = {
  received: 'bg-sky-50 text-sky-800 border-sky-100',
  confirmed: 'bg-violet-50 text-violet-800 border-violet-100',
  preparing: 'bg-amber-50 text-amber-900 border-amber-100',
  ready: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  delivered: 'bg-blue-50 text-blue-800 border-blue-100',
  cancelled: 'bg-red-50 text-red-800 border-red-100',
};

function completeRowsOrFallback<T>(result: CountedRows<T>, warnings: string[], label: string): T[] {
  const rows = result.data ?? [];
  if (result.count === null || rows.length !== result.count) {
    warnings.push(`Resumo parcial: ${label}.`);
  }
  return rows;
}

function getRecentOrderTableNumber(order: RecentOrder): string {
  if (Array.isArray(order.tenant_tables)) return order.tenant_tables[0]?.number ?? '—';
  return order.tenant_tables?.number ?? '—';
}

function formatCurrencyBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatTimeBR(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function safePercent(part: number, total: number): number {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

function readinessLabel(value: number): string {
  if (value >= 80) return 'Alta prontidão';
  if (value >= 40) return 'Em evolução';
  return 'Requer atenção';
}

function toneClasses(tone: StatusTone): { icon: string; text: string; bar: string; soft: string } {
  const map: Record<StatusTone, { icon: string; text: string; bar: string; soft: string }> = {
    red: { icon: 'bg-red-50 text-red-700', text: 'text-red-700', bar: 'bg-red-600', soft: 'bg-red-50' },
    green: { icon: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', bar: 'bg-emerald-500', soft: 'bg-emerald-50' },
    amber: { icon: 'bg-amber-50 text-amber-700', text: 'text-amber-700', bar: 'bg-amber-500', soft: 'bg-amber-50' },
    blue: { icon: 'bg-sky-50 text-sky-700', text: 'text-sky-700', bar: 'bg-sky-500', soft: 'bg-sky-50' },
    purple: { icon: 'bg-violet-50 text-violet-700', text: 'text-violet-700', bar: 'bg-violet-500', soft: 'bg-violet-50' },
    slate: { icon: 'bg-slate-100 text-slate-700', text: 'text-slate-700', bar: 'bg-slate-500', soft: 'bg-slate-50' },
    orange: { icon: 'bg-orange-50 text-orange-700', text: 'text-orange-700', bar: 'bg-orange-500', soft: 'bg-orange-50' },
  };
  return map[tone];
}

function KpiCard({ icon, label, value, hint, tone = 'red', progress }: Readonly<{ icon: string; label: string; value: string | number; hint: string; tone?: StatusTone; progress?: number }>) {
  const classes = toneClasses(tone);
  const safeProgress = typeof progress === 'number' ? Math.max(0, Math.min(100, Math.round(progress))) : undefined;
  return (
    <article className="rounded-[1.55rem] border border-white bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(15,23,42,0.11)] sm:p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${classes.icon}`}>{icon}</div>
      <p className="mt-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <strong className="mt-1 block text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{value}</strong>
      <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">{hint}</p>
      {typeof safeProgress === 'number' ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeProgress} aria-label={label}>
          <div className={`h-full rounded-full ${classes.bar}`} style={{ width: `${safeProgress}%` }} />
        </div>
      ) : null}
    </article>
  );
}

function QuickAccessCard({ item, count, compact = false }: Readonly<{ item: TenantNavigationItem; count?: number; compact?: boolean }>) {
  const meta = moduleMeta[item.slug] ?? { icon: '•', group: 'Módulo', hint: item.description, tone: 'slate' as StatusTone };
  const classes = toneClasses(meta.tone);
  return (
    <Link href={item.href} className={`group flex min-w-0 items-center gap-3 rounded-[1.35rem] border border-white bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:ring-red-100 ${compact ? 'flex-col justify-center text-center' : 'sm:p-4'}`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${classes.icon}`}>{meta.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-slate-950">{item.label}</span>
        <span className="mt-0.5 block text-xs font-semibold leading-4 text-slate-500">{compact ? meta.group : meta.hint}</span>
      </span>
      {typeof count === 'number' && count > 0 ? <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white">{count}</span> : null}
      {!compact ? <span className="text-lg font-black text-slate-300 transition group-hover:text-red-600">›</span> : null}
    </Link>
  );
}

function StatusDonut({ tenantId, totalTables, activeTables, openOrders }: Readonly<{ tenantId: string; totalTables: number; activeTables: number; openOrders: number }>) {
  const occupied = Math.min(activeTables, openOrders);
  const available = Math.max(0, activeTables - occupied);
  const inactive = Math.max(0, totalTables - activeTables);
  const total = Math.max(totalTables, 0);
  const availablePct = safePercent(available, total);
  const occupiedPct = safePercent(occupied, total);
  const availableEnd = availablePct;
  const occupiedEnd = availablePct + occupiedPct;
  return (
    <article className="rounded-[1.55rem] border border-white bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">Status das mesas</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Visão operacional aproximada</p>
        </div>
        <Link href={`/tenants/${tenantId}/mesas`} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700">Ver todas</Link>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center">
        <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full p-6" style={{ background: total ? `conic-gradient(#10b981 0 ${availableEnd}%, #ef4444 ${availableEnd}% ${occupiedEnd}%, #cbd5e1 ${occupiedEnd}% 100%)` : 'conic-gradient(#e2e8f0 0 100%)' }}>
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
            <strong className="text-3xl font-black text-slate-950">{totalTables}</strong>
            <span className="text-xs font-black text-slate-500">Mesas</span>
          </div>
        </div>
        <div className="space-y-2">
          {([
            ['Disponíveis', available, 'bg-emerald-500'],
            ['Com pedidos', occupied, 'bg-red-500'],
            ['Inativas', inactive, 'bg-slate-300'],
          ] as const).map(([label, value, color]) => (
            <div key={label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
              <span className="inline-flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${color}`} aria-hidden="true" />{label}</span>
              <span className="font-black text-slate-950">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function SalesMiniChart({ tenantId, ordersToday, revenueCents, openOrders, deliveredOrders }: Readonly<{ tenantId: string; ordersToday: number; revenueCents: number; openOrders: number; deliveredOrders: number }>) {
  const values = [ordersToday, Math.round(revenueCents / 1000), openOrders, deliveredOrders].map((value) => Math.max(0, value));
  const max = Math.max(1, ...values);
  const labels = ['Pedidos', 'Receita', 'Abertos', 'Entregues'];
  return (
    <article className="rounded-[1.55rem] border border-white bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">Vendas x Operação</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Resumo real do dia</p>
        </div>
        <Link href={`/tenants/${tenantId}/relatorios`} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700">Ver relatório</Link>
      </div>
      <div className="mt-8 flex h-44 items-end gap-4 border-b border-l border-slate-100 px-3">
        {values.map((value, index) => (
          <div key={labels[index]} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <span className="text-xs font-black text-red-700">{value}</span>
            <div className="w-full max-w-14 rounded-t-2xl bg-gradient-to-t from-red-100 to-red-500" style={{ height: `${Math.max(8, Math.round((value / max) * 100))}%` }} aria-label={`${labels[index]}: ${value}`} />
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] font-bold text-slate-500">
        {labels.map((label) => <span key={label}>{label}</span>)}
      </div>
    </article>
  );
}

function RecentOrdersCard({ tenantId, orders }: Readonly<{ tenantId: string; orders: RecentOrder[] }>) {
  return (
    <article className="rounded-[1.55rem] border border-white bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">Últimos pedidos</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Acompanhe os mais recentes</p>
        </div>
        <Link href={`/tenants/${tenantId}/pedidos`} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700">Ver todos</Link>
      </div>
      <div className="mt-5 space-y-3">
        {orders.length > 0 ? orders.map((order) => (
          <Link key={order.id} href={`/tenants/${tenantId}/pedidos`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl bg-slate-50 p-3 transition hover:bg-red-50">
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-950">#{order.public_order_code}</span>
              <span className="mt-1 block truncate text-xs font-semibold text-slate-500">Mesa {getRecentOrderTableNumber(order)} · {order.customer_name ?? 'Consumo local'} · {formatTimeBR(order.created_at)}</span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-black text-slate-950">{formatCurrencyBRL(order.total_cents)}</span>
              <span className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[11px] font-black ${orderStatusClasses[order.status]}`}>{orderStatusLabels[order.status]}</span>
            </span>
          </Link>
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-black text-slate-800">Nenhum pedido recente</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Quando o QR receber pedidos, eles aparecerão aqui.</p>
          </div>
        )}
      </div>
    </article>
  );
}

function TopProductsCard({ tenantId, products }: Readonly<{ tenantId: string; products: { productName: string; quantity: number; revenueCents: number }[] }>) {
  const maxQuantity = Math.max(1, ...products.map((product) => product.quantity));
  return (
    <article className="rounded-[1.55rem] border border-white bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">Produtos mais vendidos</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Com base nos pagamentos do dia</p>
        </div>
        <Link href={`/tenants/${tenantId}/relatorios`} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700">Ver todos</Link>
      </div>
      <div className="mt-5 space-y-4">
        {products.length > 0 ? products.slice(0, 3).map((product, index) => (
          <div key={product.productName} className="grid grid-cols-[24px_48px_minmax(0,1fr)] items-center gap-3">
            <strong className="text-center text-lg font-black text-red-700">{index + 1}</strong>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl">🍔</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-slate-950">{product.productName}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">{product.quantity} vendido(s) · {formatCurrencyBRL(product.revenueCents)}</span>
              <span className="mt-2 block h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-red-500" style={{ width: `${safePercent(product.quantity, maxQuantity)}%` }} /></span>
            </span>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-black text-slate-800">Sem ranking hoje</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Produtos aparecem após pagamentos vinculados a pedidos.</p>
          </div>
        )}
      </div>
    </article>
  );
}

export default async function TenantHomePage({ params }: Readonly<{ params: Promise<{ tenantId: string }> }>) {
  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  const membership = await requireActiveTenant(tenantId);
  const tenant = membership.tenants;
  const modules = getTenantNavigation(tenantId).filter((item) => item.slug !== 'visao-geral');
  const moduleBySlug = new Map(modules.map((item) => [item.slug, item]));
  const quickSlugs: TenantModuleSlug[] = ['cardapio', 'pedidos', 'mesas', 'cozinha', 'caixa', 'produtos', 'adicionais', 'relatorios'];
  const quickModules = quickSlugs.map((slug) => moduleBySlug.get(slug)).filter((item): item is TenantNavigationItem => Boolean(item));
  const setupModules = modules.filter((item) => ['cardapio', 'produtos', 'adicionais', 'mesas'].includes(item.slug));
  const adminModules = modules.filter((item) => ['equipe', 'configuracoes'].includes(item.slug));

  const supabase = await createClient();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();

  const [ordersResult, paymentsResult, openOrdersResult, recentOrdersResult, categories, products, availableProducts, tables, activeTables] = await Promise.all([
    supabase.from('tenant_customer_orders').select('id, status, total_cents, created_at', { count: 'exact' }).eq('tenant_id', tenantId).gte('created_at', todayIso).range(0, REPORT_ROW_LIMIT - 1),
    supabase.from('tenant_cash_payments').select('id, payment_method, total_due_cents, amount_paid_cents, change_cents, created_at', { count: 'exact' }).eq('tenant_id', tenantId).eq('status', 'paid').gte('created_at', todayIso).range(0, REPORT_ROW_LIMIT - 1),
    supabase.from('tenant_customer_orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['received', 'confirmed', 'preparing', 'ready']),
    supabase.from('tenant_customer_orders').select('id, public_order_code, customer_name, status, total_cents, created_at, tenant_tables(number, sector)').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5),
    supabase.from('tenant_product_categories').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_available', true),
    supabase.from('tenant_tables').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_tables').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true),
  ]);

  const loadWarnings: string[] = [];
  const firstError = [ordersResult, paymentsResult, openOrdersResult, recentOrdersResult, categories, products, availableProducts, tables, activeTables].find((result) => result.error)?.error;
  if (firstError) loadWarnings.push('Alguns indicadores não puderam ser carregados agora. A central está exibindo os dados disponíveis.');

  const orders = completeRowsOrFallback<ReportOrderRow>(ordersResult, loadWarnings, 'pedidos do dia');
  const payments = completeRowsOrFallback<ReportPaymentRow>(paymentsResult, loadWarnings, 'pagamentos do dia');
  const paidPaymentIds = payments.map((payment) => payment.id);
  const paymentOrdersResult = paidPaymentIds.length > 0
    ? await supabase.from('tenant_cash_payment_orders').select('payment_id, order_id', { count: 'exact' }).eq('tenant_id', tenantId).in('payment_id', paidPaymentIds).range(0, REPORT_ROW_LIMIT - 1)
    : { data: [], count: 0, error: null };
  if (paymentOrdersResult.error) loadWarnings.push('Não foi possível carregar todos os vínculos de pagamento.');

  const paymentOrderRows = completeRowsOrFallback<{ payment_id: string; order_id: string }>(paymentOrdersResult, loadWarnings, 'vínculos de pagamento');
  const orderIdsByPaymentId = new Map<string, string[]>();
  for (const row of paymentOrderRows) {
    const current = orderIdsByPaymentId.get(row.payment_id) ?? [];
    current.push(row.order_id);
    orderIdsByPaymentId.set(row.payment_id, current);
  }
  const paidOrderIds = Array.from(new Set(Array.from(orderIdsByPaymentId.values()).flat()));
  const itemsResult = paidOrderIds.length > 0
    ? await supabase.from('tenant_customer_order_items').select('order_id, product_id, product_name, quantity, line_total_cents', { count: 'exact' }).eq('tenant_id', tenantId).in('order_id', paidOrderIds).range(0, REPORT_ROW_LIMIT - 1)
    : { data: [], count: 0, error: null };
  if (itemsResult.error) loadWarnings.push('Não foi possível carregar todos os itens vendidos.');

  const summary = buildOperationalReport({
    orders,
    payments: payments.map((payment) => ({ ...payment, order_ids: orderIdsByPaymentId.get(payment.id) ?? [] })),
    items: completeRowsOrFallback<ReportItemRow>(itemsResult, loadWarnings, 'itens vendidos'),
    catalog: {
      categories: categories.count ?? 0,
      products: products.count ?? 0,
      availableProducts: availableProducts.count ?? 0,
      tables: tables.count ?? 0,
      activeTables: activeTables.count ?? 0,
    },
    openOrdersCount: openOrdersResult.count ?? 0,
  });

  const productReadiness = safePercent(summary.availableProducts, summary.products);
  const tableReadiness = safePercent(summary.activeTables, summary.tables);
  const readinessScore = Math.round((productReadiness + tableReadiness) / 2);
  const recentOrders = (recentOrdersResult.data ?? []) as RecentOrder[];
  const countByStatus = (status: RecentOrder['status']) => orders.filter((order) => order.status === status).length;

  return (
    <AppShell tenantId={tenantId}>
      <div className="-mx-4 -my-6 min-h-screen bg-[#f7f8fb] px-4 py-5 sm:-mx-5 sm:-my-8 sm:px-5 sm:py-7 lg:-mx-6 lg:px-6">
        <section className="overflow-hidden rounded-[2rem] border border-white bg-slate-950 shadow-[0_24px_70px_rgba(127,29,29,0.18)]">
          <div className="relative min-h-[250px] bg-[radial-gradient(circle_at_80%_25%,rgba(251,191,36,0.25),transparent_22%),linear-gradient(100deg,rgba(69,10,10,0.96)_0%,rgba(153,27,27,0.92)_50%,rgba(15,23,42,0.7)_100%)] p-5 text-white sm:p-7 lg:p-9">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 22% 20%, rgba(255,255,255,.25) 0 2px, transparent 3px)', backgroundSize: '42px 42px' }} />
            <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white backdrop-blur">Olá, {membership.role} 👋</span>
                  <span className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-black text-emerald-700">● Restaurante {tenant?.status ?? 'ativo'}</span>
                </div>
                <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">Bom serviço começa aqui, <span className="text-red-300">{tenant?.name}</span></h1>
                <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white">Gerencie seu restaurante, acompanhe pedidos em tempo real e mantenha atendimento, cozinha e caixa funcionando com clareza.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/tenants/${tenantId}/pedidos`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-900/30 hover:bg-red-500">＋ Novo pedido / Pedidos</Link>
                  <Link href={`/tenants/${tenantId}/cozinha`} className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/15 px-5 py-3 text-sm font-black text-white backdrop-blur hover:bg-white/20">Abrir cozinha</Link>
                </div>
              </div>
              <div className="relative hidden lg:block">
                <div className="rounded-[1.75rem] border border-white/20 bg-white/15 p-5 shadow-2xl backdrop-blur">
                  <p className="text-right font-serif text-3xl italic leading-tight text-white">Boa comida<br />Grandes momentos</p>
                  <div className="mt-8 grid grid-cols-3 gap-2">
                    {[countByStatus('received'), countByStatus('preparing'), countByStatus('ready')].map((value, index) => <span key={index} className="rounded-2xl bg-white/15 p-3 text-center text-xl font-black text-white">{value}</span>)}
                  </div>
                  <p className="mt-2 text-center text-xs font-bold text-white/80">Recebidos · Preparo · Prontos</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {loadWarnings.length > 0 ? (
          <div className="mt-5 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {Array.from(new Set(loadWarnings)).map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        ) : null}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon="🛒" label="Pedidos hoje" value={summary.ordersToday} hint={`${summary.openOrders} aberto(s) agora`} tone="red" />
          <KpiCard icon="💵" label="Faturamento hoje" value={formatCurrencyBRL(summary.netReceivedTodayCents)} hint={`Ticket médio ${formatCurrencyBRL(Math.round(summary.averageTicketCents))}`} tone="green" />
          <KpiCard icon="🪑" label="Mesas ativas" value={`${summary.activeTables} / ${summary.tables}`} hint={`${tableReadiness}% de prontidão`} tone="orange" progress={tableReadiness} />
          <KpiCard icon="🍔" label="Produtos à venda" value={`${summary.availableProducts} / ${summary.products}`} hint={readinessLabel(productReadiness)} tone="blue" progress={productReadiness} />
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <SalesMiniChart tenantId={tenantId} ordersToday={summary.ordersToday} revenueCents={summary.netReceivedTodayCents} openOrders={summary.openOrders} deliveredOrders={summary.deliveredOrders} />
          <StatusDonut tenantId={tenantId} totalTables={summary.tables} activeTables={summary.activeTables} openOrders={summary.openOrders} />
        </section>

        <section className="mt-5 rounded-[1.55rem] border border-white bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-lg font-black text-slate-950">Acesso rápido</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Principais áreas de operação</p>
            </div>
            <span className={`rounded-full border px-4 py-2 text-xs font-black ${readinessScore >= 70 ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-amber-100 bg-amber-50 text-amber-900'}`}>{readinessScore}% pronto para operar</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {quickModules.map((item) => <QuickAccessCard key={item.slug} item={item} count={item.slug === 'pedidos' || item.slug === 'cozinha' ? summary.openOrders : undefined} compact />)}
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <RecentOrdersCard tenantId={tenantId} orders={recentOrders} />
          <TopProductsCard tenantId={tenantId} products={summary.topProducts} />
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-[1.55rem] border border-white bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
            <h2 className="text-lg font-black text-slate-950">Preparar cardápio e salão</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Base comercial para vender pelo QR</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {setupModules.map((item) => <QuickAccessCard key={item.slug} item={item} count={item.slug === 'cardapio' ? summary.categories : item.slug === 'produtos' ? summary.products : item.slug === 'mesas' ? summary.tables : undefined} />)}
            </div>
          </article>
          <article className="rounded-[1.55rem] border border-white bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
            <h2 className="text-lg font-black text-slate-950">Administração</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Equipe, configurações e governança do restaurante</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {adminModules.map((item) => <QuickAccessCard key={item.slug} item={item} />)}
              <Link href="/dashboard" className="group flex min-w-0 items-center gap-3 rounded-[1.35rem] border border-white bg-slate-50 p-3 ring-1 ring-slate-100 transition hover:bg-red-50">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl text-slate-700">↔</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-950">Trocar restaurante</span><span className="mt-0.5 block text-xs font-semibold text-slate-500">Voltar ao dashboard</span></span>
                <span className="text-lg font-black text-slate-300 group-hover:text-red-600">›</span>
              </Link>
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
