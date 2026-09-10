import Link from 'next/link';
import { formatCurrencyBRL } from '@/lib/domain/order';
import type { Tenant, TenantRole, TenantUserStatus } from '@/lib/types/saas';

export type CashOrderSummary = {
  id: string;
  public_order_code: string;
  table_number?: string;
  table_sector?: string | null;
  customer_name: string | null;
  status: 'received' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  total_cents: number;
  created_at: string;
};

export type TeamMemberSummary = {
  id: string;
  user_id: string;
  role: TenantRole;
  status: TenantUserStatus;
  created_at: string;
  profiles?: {
    name: string;
    email: string;
    phone: string | null;
    status: string;
  } | null;
};

export type ReportSummary = {
  ordersToday: number;
  revenueTodayCents: number;
  openOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  categories: number;
  products: number;
  availableProducts: number;
  tables: number;
  activeTables: number;
};

const statusLabels: Record<CashOrderSummary['status'], string> = {
  received: 'Recebido',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const roleLabels: Record<TenantRole, string> = {
  super_admin: 'Super admin',
  owner: 'Proprietário',
  admin: 'Administrador',
  manager: 'Gerente',
  waiter: 'Garçom',
  attendant: 'Atendente',
  kitchen: 'Cozinha',
  cashier: 'Caixa',
};

export function StatCard({ label, value, hint }: Readonly<{ label: string; value: string | number; hint?: string }>) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-100">{value}</p>
      {hint ? <p className="mt-1 text-sm text-slate-400">{hint}</p> : null}
    </article>
  );
}

export function CashPanel({ tenantId, orders }: Readonly<{ tenantId: string; orders: CashOrderSummary[] }>) {
  const payableOrders = orders.filter((order) => order.status !== 'cancelled');
  const totalOpenCents = payableOrders.reduce((sum, order) => sum + order.total_cents, 0);
  const readyOrDelivered = orders.filter((order) => order.status === 'ready' || order.status === 'delivered').length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Comandas abertas" value={payableOrders.length} hint="Recebidas, em preparo, prontas ou entregues." />
        <StatCard label="Total em conferência" value={formatCurrencyBRL(totalOpenCents)} hint="Soma dos pedidos não cancelados listados." />
        <StatCard label="Prontos/entregues" value={readyOrDelivered} hint="Pedidos próximos do fechamento." />
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold">Conferência de consumo</h2>
            <p className="mt-1 text-sm text-slate-400">Lista operacional para o caixa conferir mesa, status e valor antes de receber.</p>
          </div>
          <Link href={`/tenants/${tenantId}/pedidos`} className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10">
            Ver pedidos
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">Nenhum pedido disponível para conferência.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {orders.map((order) => (
              <article key={order.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Pedido {order.public_order_code}</p>
                    <h3 className="mt-1 font-bold text-slate-100">Mesa {order.table_number ?? '—'}{order.table_sector ? ` • ${order.table_sector}` : ''}</h3>
                    <p className="mt-1 text-sm text-slate-400">{order.customer_name ? `Cliente: ${order.customer_name}` : 'Cliente não identificado'}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">{statusLabels[order.status]}</span>
                    <p className="mt-2 text-lg font-black text-emerald-300">{formatCurrencyBRL(order.total_cents)}</p>
                    <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
        <h2 className="text-lg font-bold text-amber-100">Limite desta etapa</h2>
        <p className="mt-2 text-sm leading-6 text-amber-100/80">A tela faz conferência gerencial, mas ainda não registra pagamento, sangria, desconto, forma de recebimento ou emissão fiscal.</p>
      </section>
    </div>
  );
}

export function TeamPanel({ members }: Readonly<{ members: TeamMemberSummary[] }>) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div>
        <h2 className="text-xl font-bold">Equipe vinculada ao restaurante</h2>
        <p className="mt-1 text-sm text-slate-400">Usuários com vínculo ativo/inativo neste tenant. Convites externos ainda não foram habilitados.</p>
      </div>

      {members.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">Nenhum membro visível pelas políticas atuais.</p>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {members.map((member) => (
            <article key={member.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-100">{member.profiles?.name ?? 'Usuário sem perfil visível'}</h3>
                  <p className="mt-1 text-sm text-slate-400">{member.profiles?.email ?? member.user_id}</p>
                  {member.profiles?.phone ? <p className="mt-1 text-sm text-slate-500">{member.profiles.phone}</p> : null}
                </div>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">{roleLabels[member.role]}</span>
              </div>
              <dl className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
                <div><dt>Status do vínculo</dt><dd className="font-semibold text-slate-200">{member.status}</dd></div>
                <div><dt>Desde</dt><dd className="font-semibold text-slate-200">{new Date(member.created_at).toLocaleDateString('pt-BR')}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <h3 className="font-bold text-slate-100">Papéis previstos</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">Proprietário, administrador, gerente, garçom, atendente, cozinha e caixa. O cadastro/invite de novos usuários deve ser a próxima etapa com fluxo de convite seguro.</p>
      </div>
    </section>
  );
}

export function ReportsPanel({ summary }: Readonly<{ summary: ReportSummary }>) {
  const productAvailability = summary.products > 0 ? Math.round((summary.availableProducts / summary.products) * 100) : 0;
  const tableActivation = summary.tables > 0 ? Math.round((summary.activeTables / summary.tables) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pedidos hoje" value={summary.ordersToday} hint="Criados a partir de 00:00." />
        <StatCard label="Receita hoje" value={formatCurrencyBRL(summary.revenueTodayCents)} hint="Somente pedidos entregues de hoje." />
        <StatCard label="Pedidos abertos" value={summary.openOrders} hint="Recebidos, confirmados, em preparo ou prontos." />
        <StatCard label="Cancelados hoje" value={summary.cancelledOrders} hint="Acompanhar falhas de operação." />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Categorias" value={summary.categories} />
        <StatCard label="Produtos disponíveis" value={`${summary.availableProducts}/${summary.products}`} hint={`${productAvailability}% do cadastro.`} />
        <StatCard label="Mesas ativas" value={`${summary.activeTables}/${summary.tables}`} hint={`${tableActivation}% das mesas.`} />
        <StatCard label="Pedidos entregues hoje" value={summary.deliveredOrders} />
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-xl font-bold">Leitura gerencial</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          <li className="flex gap-2"><span className="text-emerald-300">•</span><span>Use pedidos abertos para decidir reforço na cozinha/atendimento.</span></li>
          <li className="flex gap-2"><span className="text-emerald-300">•</span><span>Produtos indisponíveis impactam diretamente o cardápio público por QR Code.</span></li>
          <li className="flex gap-2"><span className="text-emerald-300">•</span><span>Mesas inativas não devem ser usadas para atendimento ao cliente.</span></li>
        </ul>
      </section>
    </div>
  );
}

export function SettingsPanel({ tenant }: Readonly<{ tenant: Tenant & { public_slug?: string | null } }>) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-xl font-bold">Dados do restaurante</h2>
      <p className="mt-1 text-sm text-slate-400">Dados protegidos por tenant_id e alteráveis por roles autorizados no Supabase.</p>

      <dl className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">Nome fantasia</dt><dd className="mt-1 font-semibold text-slate-100">{tenant.name}</dd></div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">Razão social</dt><dd className="mt-1 font-semibold text-slate-100">{tenant.legal_name ?? 'Não informado'}</dd></div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">Documento</dt><dd className="mt-1 font-semibold text-slate-100">{tenant.document ?? 'Não informado'}</dd></div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">E-mail</dt><dd className="mt-1 font-semibold text-slate-100">{tenant.email ?? 'Não informado'}</dd></div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">Telefone</dt><dd className="mt-1 font-semibold text-slate-100">{tenant.phone ?? 'Não informado'}</dd></div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">Slug público</dt><dd className="mt-1 break-all font-mono text-sm text-slate-100">{tenant.public_slug ?? 'Não definido'}</dd></div>
      </dl>

      <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
        <h3 className="font-bold text-amber-100">Edição controlada</h3>
        <p className="mt-2 text-sm leading-6 text-amber-100/80">Por segurança, esta tela ainda não altera slug público nem status do tenant. A próxima etapa pode incluir formulário de edição com auditoria e bloqueio contra colisão de slug.</p>
      </div>
    </section>
  );
}
