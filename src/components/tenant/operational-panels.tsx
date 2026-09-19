import Link from 'next/link';
import { closeCashPaymentAction } from '@/app/actions/cash';
import { calculateCashSettlement, formatCurrencyBRL } from '@/lib/domain/order';
import type { OperationalReportSummary } from '@/lib/domain/reports';
import type { Tenant, TenantRole, TenantUserStatus } from '@/lib/types/saas';

export type CashOrderSummary = {
  id: string;
  table_id: string;
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

export type ReportSummary = OperationalReportSummary;

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

const statusStyles: Record<CashOrderSummary['status'], string> = {
  received: 'bg-sky-50 text-sky-700 border-sky-100',
  confirmed: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  preparing: 'bg-amber-50 text-amber-700 border-amber-100',
  ready: 'bg-red-50 text-red-700 border-red-100',
  delivered: 'bg-green-50 text-green-700 border-green-100',
  cancelled: 'bg-stone-100 text-stone-600 border-stone-200',
};

export function StatCard({ label, value, hint }: Readonly<{ label: string; value: string | number; hint?: string }>) {
  return (
    <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-stone-950">{value}</p>
      {hint ? <p className="mt-2 text-sm leading-6 text-stone-500">{hint}</p> : null}
    </article>
  );
}

function formatCashDate(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function openTableMinutes(orders: CashOrderSummary[]): number {
  if (orders.length === 0) return 0;
  const oldest = Math.min(...orders.map((order) => new Date(order.created_at).getTime()).filter(Number.isFinite));
  if (!Number.isFinite(oldest)) return 0;
  return Math.max(0, Math.floor((Date.now() - oldest) / 60000));
}

function CashSettlementTiles({ settlement }: Readonly<{ settlement: ReturnType<typeof calculateCashSettlement> }>) {
  return (
    <div className="grid w-full gap-2 text-sm text-stone-600 sm:grid-cols-3 lg:max-w-[520px]">
      <div className="rounded-2xl border border-stone-200 bg-white p-3">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Subtotal</span>
        <strong className="block text-lg text-stone-950">{formatCurrencyBRL(settlement.subtotalCents)}</strong>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-3">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Serviço</span>
        <strong className="block text-lg text-stone-950">{formatCurrencyBRL(settlement.serviceFeeCents)}</strong>
      </div>
      <div className="rounded-2xl border border-red-200 bg-red-50 p-3 shadow-sm">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-red-800">Total sugerido</span>
        <strong className="block text-xl text-red-900">{formatCurrencyBRL(settlement.totalDueCents)}</strong>
      </div>
    </div>
  );
}

export function CashPanel({
  tenantId,
  orders,
  serviceFeeBasisPoints,
}: Readonly<{
  tenantId: string;
  orders: CashOrderSummary[];
  serviceFeeBasisPoints: number;
}>) {
  const payableOrders = orders.filter((order) => order.status === 'ready' || order.status === 'delivered');
  const totalOpenCents = payableOrders.reduce((sum, order) => sum + order.total_cents, 0);
  const serviceFeePercent = serviceFeeBasisPoints / 100;
  const groupedByTable = Array.from(
    payableOrders.reduce((groups, order) => {
      const current = groups.get(order.table_id) ?? [];
      current.push(order);
      groups.set(order.table_id, current);
      return groups;
    }, new Map<string, CashOrderSummary[]>()),
  ).sort(([, leftOrders], [, rightOrders]) => {
    const leftOldest = Math.min(...leftOrders.map((order) => new Date(order.created_at).getTime()));
    const rightOldest = Math.min(...rightOrders.map((order) => new Date(order.created_at).getTime()));
    return leftOldest - rightOldest;
  });
  const openTables = groupedByTable.length;
  const deliveredOrders = payableOrders.filter((order) => order.status === 'delivered').length;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-sm shadow-stone-200/70">
        <div className="bg-gradient-to-br from-red-700 via-red-600 to-red-800 p-5 text-white sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white">Caixa operacional</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Fechamento de contas</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white">Mesas com pedidos prontos ou entregues, ainda não pagos. Registre pagamento real com método, desconto, valor pago e observação.</p>
            </div>
            <Link href={`/tenants/${tenantId}/pedidos`} className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 bg-white px-5 py-3 text-sm font-black text-red-700 shadow-sm transition hover:bg-red-50">
              Ver pedidos
            </Link>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:p-5">
          <StatCard label="Mesas abertas" value={openTables} hint="Mesas com pedidos aptos para pagamento." />
          <StatCard label="Pedidos fecháveis" value={payableOrders.length} hint={`${deliveredOrders} já entregue(s), restante pronto.`} />
          <StatCard label="Subtotal em aberto" value={formatCurrencyBRL(totalOpenCents)} hint="Soma dos pedidos ainda não pagos." />
          <StatCard label="Taxa de serviço" value={`${serviceFeePercent.toLocaleString('pt-BR')}%`} hint="Configurada no restaurante." />
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm shadow-stone-200/70">
        <div className="flex flex-col justify-between gap-3 border-b border-stone-100 bg-gradient-to-r from-white to-red-50 px-5 py-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-stone-950">Contas por mesa</h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">Cada card agrupa os pedidos da mesa para o fechamento financeiro.</p>
          </div>
          <span className="inline-flex min-h-10 items-center rounded-full border border-red-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-700">{openTables} mesa(s)</span>
        </div>

        {groupedByTable.length === 0 ? (
          <div className="m-5 rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-2xl shadow-sm">💳</div>
            <p className="mt-4 text-base font-black text-stone-950">Nenhuma conta aberta para fechar</p>
            <p className="mt-1 text-sm leading-6 text-stone-500">Pedidos precisam estar prontos ou entregues e ainda não pagos para aparecer no caixa.</p>
          </div>
        ) : (
          <div className="grid gap-4 p-4 xl:grid-cols-2 sm:p-5">
            {groupedByTable.map(([tableId, tableOrders]) => {
              const subtotalCents = tableOrders.reduce((sum, order) => sum + order.total_cents, 0);
              const settlement = calculateCashSettlement({
                subtotalCents,
                serviceFeePercent,
                discountCents: 0,
                amountPaidCents: Math.max(1, subtotalCents + Math.round(subtotalCents * (serviceFeePercent / 100))),
              });
              const firstOrder = tableOrders[0];
              const defaultAmountPaid = (settlement.totalDueCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

              return (
                <article key={tableId} className="flex min-h-full flex-col rounded-[1.75rem] border border-stone-200 bg-stone-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-stone-200/80 sm:p-5">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Mesa</p>
                      <h3 className="mt-1 break-words text-3xl font-black tracking-tight text-stone-950">
                        {firstOrder?.table_number ?? '—'}{firstOrder?.table_sector ? ` • ${firstOrder.table_sector}` : ''}
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-stone-700">
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1">{tableOrders.length} pedido(s)</span>
                        <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-amber-900">Aberta há {openTableMinutes(tableOrders)} min</span>
                      </div>
                    </div>
                    <CashSettlementTiles settlement={settlement} />
                  </div>

                  <div className="mt-4 space-y-2">
                    {tableOrders.map((order) => (
                      <div key={order.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-black text-stone-950">Pedido {order.public_order_code}</p>
                          <p className="mt-1 text-xs leading-5 text-stone-600">{order.customer_name ? `Cliente: ${order.customer_name}` : 'Cliente não identificado'} • {formatCashDate(order.created_at)}</p>
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusStyles[order.status]}`}>{statusLabels[order.status]}</span>
                          <p className="mt-1 font-black text-red-700">{formatCurrencyBRL(order.total_cents)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form action={closeCashPaymentAction} className="mt-auto grid gap-3 rounded-[1.5rem] border border-stone-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-6">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="tableId" value={tableId} />
                    <input type="hidden" name="subtotalCents" value={subtotalCents} />
                    <input type="hidden" name="serviceFeePercent" value={serviceFeePercent} />
                    {tableOrders.map((order) => <input key={order.id} type="hidden" name="orderIds" value={order.id} />)}

                    <label className="text-sm font-bold text-stone-700">
                      Forma
                      <select name="paymentMethod" defaultValue="pix" className="mt-2 min-h-12 w-full rounded-2xl border border-stone-300 bg-stone-50 px-3 py-2 text-stone-950 outline-none transition focus:border-red-500 focus:bg-white">
                        <option value="pix">Pix</option>
                        <option value="money">Dinheiro</option>
                        <option value="debit">Débito</option>
                        <option value="credit">Crédito</option>
                        <option value="other">Outro</option>
                      </select>
                    </label>
                    <label className="text-sm font-bold text-stone-700">
                      Desconto
                      <input name="discount" defaultValue="0,00" inputMode="decimal" className="mt-2 min-h-12 w-full rounded-2xl border border-stone-300 bg-stone-50 px-3 py-2 text-stone-950 outline-none transition focus:border-red-500 focus:bg-white" />
                    </label>
                    <label className="text-sm font-bold text-stone-700">
                      Valor pago *
                      <input name="amountPaid" defaultValue={defaultAmountPaid} inputMode="decimal" required className="mt-2 min-h-12 w-full rounded-2xl border border-stone-300 bg-stone-50 px-3 py-2 text-stone-950 outline-none transition focus:border-red-500 focus:bg-white" />
                    </label>
                    <label className="text-sm font-bold text-stone-700 xl:col-span-2">
                      Observação
                      <input name="notes" maxLength={300} placeholder="Ex.: pagamento no Pix do caixa" className="mt-2 min-h-12 w-full rounded-2xl border border-stone-300 bg-stone-50 px-3 py-2 text-stone-950 outline-none transition focus:border-red-500 focus:bg-white" />
                    </label>
                    <button className="min-h-12 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-100 transition hover:bg-red-700 xl:self-end">Fechar conta</button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-[1.5rem] border border-red-100 bg-red-50 p-5">
        <h2 className="text-lg font-black text-red-800">Controle implementado nesta etapa</h2>
        <p className="mt-2 text-sm leading-6 text-red-800">O fechamento registra forma de pagamento, desconto, taxa de serviço, valor pago, troco/saldo e impede novo pagamento do mesmo pedido no banco.</p>
      </section>
    </div>
  );
}

export function TeamPanel({ members }: Readonly<{ members: TeamMemberSummary[] }>) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="text-xl font-bold">Equipe vinculada ao restaurante</h2>
        <p className="mt-1 text-sm text-stone-500">Usuários com vínculo ativo/inativo neste tenant. Convites externos ainda não foram habilitados.</p>
      </div>

      {members.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">Nenhum membro visível pelas políticas atuais.</p>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {members.map((member) => (
            <article key={member.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-stone-950">{member.profiles?.name ?? 'Usuário sem perfil visível'}</h3>
                  <p className="mt-1 text-sm text-stone-500">{member.profiles?.email ?? member.user_id}</p>
                  {member.profiles?.phone ? <p className="mt-1 text-sm text-stone-400">{member.profiles.phone}</p> : null}
                </div>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">{roleLabels[member.role]}</span>
              </div>
              <dl className="mt-4 grid gap-3 text-xs text-stone-500 sm:grid-cols-2">
                <div><dt>Status do vínculo</dt><dd className="font-semibold text-stone-800">{member.status}</dd></div>
                <div><dt>Desde</dt><dd className="font-semibold text-stone-800">{new Date(member.created_at).toLocaleDateString('pt-BR')}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h3 className="font-bold text-stone-950">Papéis previstos</h3>
        <p className="mt-2 text-sm leading-6 text-stone-500">Proprietário, administrador, gerente, garçom, atendente, cozinha e caixa. O cadastro/invite de novos usuários deve ser a próxima etapa com fluxo de convite seguro.</p>
      </div>
    </section>
  );
}

const paymentMethodLabels: Record<string, string> = {
  pix: 'Pix',
  money: 'Dinheiro',
  debit: 'Débito',
  credit: 'Crédito',
  other: 'Outro',
};

function percentLabel(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue.toFixed(1).replace('.', ',')}%`;
}

function durationLabel(minutes: number): string {
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
  if (safeMinutes < 60) return `${safeMinutes} min`;
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
}

function TimingCard({ label, value, sampleSize, hint }: Readonly<{ label: string; value: number; sampleSize: number; hint: string }>) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-stone-950">{durationLabel(value)}</p>
      <p className="mt-1 text-xs leading-5 text-stone-600">{sampleSize > 0 ? `${sampleSize} pedido(s) com horário registrado.` : 'Aguardando pedidos com este marco registrado.'}</p>
      <p className="mt-2 text-xs leading-5 text-stone-500">{hint}</p>
    </div>
  );
}

function ProgressBar({ value, colorClass }: Readonly<{ value: number; colorClass: string }>) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
  return (
    <div
      className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
      aria-label={`${safeValue}%`}
    >
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${safeValue}%` }} />
    </div>
  );
}

export function ReportsPanel({ summary }: Readonly<{ summary: ReportSummary }>) {
  const productAvailability = summary.products > 0 ? Math.round((summary.availableProducts / summary.products) * 100) : 0;
  const tableActivation = summary.tables > 0 ? Math.round((summary.activeTables / summary.tables) * 100) : 0;
  const revenuePerOrderCents = summary.ordersToday > 0 ? summary.netReceivedTodayCents / summary.ordersToday : 0;
  const cancellationRateLabel = percentLabel(summary.cancellationRatePercent);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-sm shadow-stone-200/70">
        <div className="bg-gradient-to-br from-red-700 via-red-600 to-red-800 p-5 text-white sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white">Relatórios gerenciais</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Resumo do dia</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white">Acompanhe operação, recebimento no caixa, ticket médio, cancelamentos e itens mais vendidos com base nos dados fechados hoje.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
              <div className="rounded-3xl border border-white/25 bg-white/15 p-3 backdrop-blur">
                <p className="text-2xl font-black">{summary.ordersToday}</p>
                <p className="text-xs font-bold">pedidos</p>
              </div>
              <div className="rounded-3xl border border-white/25 bg-white/15 p-3 backdrop-blur">
                <p className="text-2xl font-black">{formatCurrencyBRL(summary.netReceivedTodayCents)}</p>
                <p className="text-xs font-bold">recebido</p>
              </div>
              <div className="col-span-2 rounded-3xl border border-white/25 bg-white/15 p-3 backdrop-blur sm:col-span-1">
                <p className="text-2xl font-black">{cancellationRateLabel}</p>
                <p className="text-xs font-bold">cancelamento</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:p-5">
          <StatCard label="Pedidos hoje" value={summary.ordersToday} hint="Criados a partir de 00:00." />
          <StatCard label="Recebido no caixa" value={formatCurrencyBRL(summary.netReceivedTodayCents)} hint="Pagamentos fechados hoje, descontando troco." />
          <StatCard label="Ticket médio" value={formatCurrencyBRL(Math.round(summary.averageTicketCents))} hint="Média por fechamento de caixa." />
          <StatCard label="Receita por pedido" value={formatCurrencyBRL(Math.round(revenuePerOrderCents))} hint="Recebido líquido dividido por pedidos do dia." />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Saúde operacional</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950">Fila e cancelamentos</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">Use estes números para decidir reforço de atendimento, cozinha e revisão de gargalos.</p>
            </div>
            <span className="rounded-full border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-800">{summary.openOrders} aberto(s)</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-900">Pedidos abertos</p>
              <p className="mt-2 text-3xl font-black text-amber-950">{summary.openOrders}</p>
              <p className="mt-1 text-xs leading-5 text-amber-900">Recebidos, confirmados, em preparo ou prontos.</p>
            </div>
            <div className="rounded-3xl border border-green-100 bg-green-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-green-800">Entregues</p>
              <p className="mt-2 text-3xl font-black text-green-950">{summary.deliveredOrders}</p>
              <p className="mt-1 text-xs leading-5 text-green-800">Pedidos concluídos na operação.</p>
            </div>
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-800">Cancelados</p>
              <p className="mt-2 text-3xl font-black text-rose-950">{summary.cancelledOrders}</p>
              <p className="mt-1 text-xs leading-5 text-rose-800">{cancellationRateLabel} dos pedidos do dia.</p>
            </div>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Cadastro operacional</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950">Prontidão do restaurante</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-stone-950">Produtos disponíveis</p>
                  <p className="text-sm text-stone-600">{summary.availableProducts}/{summary.products} itens ativos no cardápio.</p>
                </div>
                <span className="text-2xl font-black text-red-700">{productAvailability}%</span>
              </div>
              <ProgressBar value={productAvailability} colorClass="bg-red-600" />
            </div>
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-stone-950">Mesas ativas</p>
                  <p className="text-sm text-stone-600">{summary.activeTables}/{summary.tables} mesas prontas para QR.</p>
                </div>
                <span className="text-2xl font-black text-red-700">{tableActivation}%</span>
              </div>
              <ProgressBar value={tableActivation} colorClass="bg-red-600" />
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Tempos da operação</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950">Pedido, cozinha, pronto e entrega</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">Médias do dia calculadas com horários reais gravados quando o pedido muda de etapa.</p>
          </div>
          <span className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-black text-stone-700">Hoje</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TimingCard label="Pedido → cozinha" value={summary.timing.toKitchen.averageMinutes} sampleSize={summary.timing.toKitchen.sampleSize} hint="Do pedido feito até entrar em preparo." />
          <TimingCard label="Tempo de preparo" value={summary.timing.preparation.averageMinutes} sampleSize={summary.timing.preparation.sampleSize} hint="Da cozinha até marcar como pronto." />
          <TimingCard label="Pronto → mesa" value={summary.timing.readyToDelivery.averageMinutes} sampleSize={summary.timing.readyToDelivery.sampleSize} hint="Do prato pronto até entrega na mesa." />
          <TimingCard label="Pedido → entrega" value={summary.timing.totalToDelivery.averageMinutes} sampleSize={summary.timing.totalToDelivery.sampleSize} hint="Ciclo completo até a mesa receber." />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Vendas</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950">Produtos mais vendidos hoje</h2>
            </div>
            <span className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-black text-stone-700">Top {summary.topProducts.length}</span>
          </div>
          {summary.topProducts.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">Ainda não há itens vendidos no período.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {summary.topProducts.map((product, index) => (
                <article key={product.productId} className="rounded-3xl border border-stone-200 bg-stone-50 p-4 transition hover:bg-white hover:shadow-md hover:shadow-stone-200/70">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">#{index + 1}</p>
                      <h3 className="mt-1 break-words font-black text-stone-950">{product.productName}</h3>
                      <p className="mt-1 text-sm text-stone-600">{product.quantity} unidade(s)</p>
                    </div>
                    <strong className="shrink-0 text-right text-xl text-red-700">{formatCurrencyBRL(product.revenueCents)}</strong>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Financeiro</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950">Formas de pagamento hoje</h2>
            </div>
            <span className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-black text-stone-700">{summary.paymentBreakdown.length} método(s)</span>
          </div>
          {summary.paymentBreakdown.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">Nenhum pagamento fechado hoje.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {summary.paymentBreakdown.map((payment) => (
                <article key={payment.paymentMethod} className="rounded-3xl border border-stone-200 bg-stone-50 p-4 transition hover:bg-white hover:shadow-md hover:shadow-stone-200/70">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="font-black text-stone-950">{paymentMethodLabels[payment.paymentMethod] ?? payment.paymentMethod}</h3>
                      <p className="mt-1 text-sm text-stone-600">{payment.count} fechamento(s)</p>
                    </div>
                    <strong className="text-xl text-red-700">{formatCurrencyBRL(payment.amountPaidCents - payment.changeCents)}</strong>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm text-stone-600 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-3"><dt className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Total devido</dt><dd className="mt-1 font-black text-stone-950">{formatCurrencyBRL(payment.totalDueCents)}</dd></div>
                    <div className="rounded-2xl bg-white p-3"><dt className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Pago</dt><dd className="mt-1 font-black text-stone-950">{formatCurrencyBRL(payment.amountPaidCents)}</dd></div>
                    <div className="rounded-2xl bg-white p-3"><dt className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Troco</dt><dd className="mt-1 font-black text-stone-950">{formatCurrencyBRL(payment.changeCents)}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-[1.75rem] border border-red-100 bg-red-50 p-5">
        <h2 className="text-lg font-black text-red-800">Leitura gerencial</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-red-800">
          <li className="flex gap-2"><span className="font-black">•</span><span>Use pedidos abertos para decidir reforço na cozinha/atendimento.</span></li>
          <li className="flex gap-2"><span className="font-black">•</span><span>Compare produtos mais vendidos com disponibilidade para evitar ruptura operacional.</span></li>
          <li className="flex gap-2"><span className="font-black">•</span><span>Receita financeira vem do caixa fechado, não apenas de pedido entregue.</span></li>
        </ul>
      </section>
    </div>
  );
}

export function SettingsPanel({ tenant }: Readonly<{ tenant: Tenant & { public_slug?: string | null } }>) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="text-xl font-bold">Dados do restaurante</h2>
      <p className="mt-1 text-sm text-stone-500">Dados protegidos por tenant_id e alteráveis por roles autorizados no Supabase.</p>

      <dl className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><dt className="text-xs uppercase tracking-wide text-stone-400">Nome fantasia</dt><dd className="mt-1 font-semibold text-stone-950">{tenant.name}</dd></div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><dt className="text-xs uppercase tracking-wide text-stone-400">Razão social</dt><dd className="mt-1 font-semibold text-stone-950">{tenant.legal_name ?? 'Não informado'}</dd></div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><dt className="text-xs uppercase tracking-wide text-stone-400">Documento</dt><dd className="mt-1 font-semibold text-stone-950">{tenant.document ?? 'Não informado'}</dd></div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><dt className="text-xs uppercase tracking-wide text-stone-400">E-mail</dt><dd className="mt-1 font-semibold text-stone-950">{tenant.email ?? 'Não informado'}</dd></div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><dt className="text-xs uppercase tracking-wide text-stone-400">Telefone</dt><dd className="mt-1 font-semibold text-stone-950">{tenant.phone ?? 'Não informado'}</dd></div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><dt className="text-xs uppercase tracking-wide text-stone-400">Slug público</dt><dd className="mt-1 break-all font-mono text-sm text-stone-950">{tenant.public_slug ?? 'Não definido'}</dd></div>
      </dl>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="font-bold text-amber-800">Edição controlada</h3>
        <p className="mt-2 text-sm leading-6 text-amber-800/80">Por segurança, esta tela ainda não altera slug público nem status do tenant. A próxima etapa pode incluir formulário de edição com auditoria e bloqueio contra colisão de slug.</p>
      </div>
    </section>
  );
}
