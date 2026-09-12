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

export function StatCard({ label, value, hint }: Readonly<{ label: string; value: string | number; hint?: string }>) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-100">{value}</p>
      {hint ? <p className="mt-1 text-sm text-slate-400">{hint}</p> : null}
    </article>
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
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Contas fecháveis" value={payableOrders.length} hint="Somente pedidos prontos ou entregues e ainda não pagos." />
        <StatCard label="Subtotal em aberto" value={formatCurrencyBRL(totalOpenCents)} hint="Soma dos pedidos aptos para recebimento." />
        <StatCard label="Taxa de serviço" value={`${serviceFeePercent.toLocaleString('pt-BR')}%`} hint="Configurada no restaurante." />
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold">Fechamento de conta por mesa</h2>
            <p className="mt-1 text-sm text-slate-400">Registre pagamento real de pedidos prontos/entregues. Pedidos pagos não entram de novo no fechamento.</p>
          </div>
          <Link href={`/tenants/${tenantId}/pedidos`} className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10">
            Ver pedidos
          </Link>
        </div>

        {groupedByTable.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">Nenhum pedido pronto/entregue disponível para fechamento.</p>
        ) : (
          <div className="mt-5 space-y-4">
            {groupedByTable.map(([tableId, tableOrders]) => {
              const subtotalCents = tableOrders.reduce((sum, order) => sum + order.total_cents, 0);
              const settlement = calculateCashSettlement({
                subtotalCents,
                serviceFeePercent,
                discountCents: 0,
                amountPaidCents: Math.max(1, subtotalCents + Math.round(subtotalCents * (serviceFeePercent / 100))),
              });
              const firstOrder = tableOrders[0];

              return (
                <article key={tableId} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Mesa</p>
                      <h3 className="mt-1 text-xl font-black text-slate-100">
                        {firstOrder?.table_number ?? '—'}{firstOrder?.table_sector ? ` • ${firstOrder.table_sector}` : ''}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">{tableOrders.length} pedido(s) apto(s) para fechamento.</p>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-3 lg:min-w-[430px]">
                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3"><span className="text-slate-500">Subtotal</span><strong className="block text-slate-100">{formatCurrencyBRL(settlement.subtotalCents)}</strong></div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3"><span className="text-slate-500">Serviço</span><strong className="block text-slate-100">{formatCurrencyBRL(settlement.serviceFeeCents)}</strong></div>
                      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3"><span className="text-emerald-200">Total sugerido</span><strong className="block text-emerald-100">{formatCurrencyBRL(settlement.totalDueCents)}</strong></div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {tableOrders.map((order) => (
                      <div key={order.id} className="flex flex-col justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 sm:flex-row sm:items-center">
                        <div>
                          <p className="text-sm font-bold text-slate-100">Pedido {order.public_order_code}</p>
                          <p className="text-xs text-slate-400">{order.customer_name ? `Cliente: ${order.customer_name}` : 'Cliente não identificado'} • {new Date(order.created_at).toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">{statusLabels[order.status]}</span>
                          <p className="mt-1 font-black text-emerald-300">{formatCurrencyBRL(order.total_cents)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form action={closeCashPaymentAction} className="mt-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:grid-cols-2 xl:grid-cols-6">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="tableId" value={tableId} />
                    <input type="hidden" name="subtotalCents" value={subtotalCents} />
                    <input type="hidden" name="serviceFeePercent" value={serviceFeePercent} />
                    {tableOrders.map((order) => <input key={order.id} type="hidden" name="orderIds" value={order.id} />)}

                    <label className="text-sm font-medium text-slate-300">
                      Forma
                      <select name="paymentMethod" defaultValue="pix" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400">
                        <option value="pix">Pix</option>
                        <option value="money">Dinheiro</option>
                        <option value="debit">Débito</option>
                        <option value="credit">Crédito</option>
                        <option value="other">Outro</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium text-slate-300">
                      Desconto
                      <input name="discount" defaultValue="0,00" inputMode="decimal" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400" />
                    </label>
                    <label className="text-sm font-medium text-slate-300">
                      Valor pago *
                      <input name="amountPaid" defaultValue={(settlement.totalDueCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} inputMode="decimal" required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400" />
                    </label>
                    <label className="text-sm font-medium text-slate-300 xl:col-span-2">
                      Observação
                      <input name="notes" maxLength={300} placeholder="Ex.: pagamento no Pix do caixa" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400" />
                    </label>
                    <button className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 xl:self-end">Fechar conta</button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
        <h2 className="text-lg font-bold text-emerald-100">Controle implementado nesta etapa</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-100/80">O fechamento registra forma de pagamento, desconto, taxa de serviço, valor pago, troco/saldo e impede novo pagamento do mesmo pedido no banco.</p>
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
        <StatCard label="Recebido no caixa" value={formatCurrencyBRL(summary.netReceivedTodayCents)} hint="Pagamentos fechados hoje, descontando troco." />
        <StatCard label="Ticket médio" value={formatCurrencyBRL(Math.round(summary.averageTicketCents))} hint="Média por fechamento de caixa." />
        <StatCard label="Cancelamentos" value={`${summary.cancelledOrders} (${summary.cancellationRatePercent.toFixed(1)}%)`} hint="Pedidos cancelados sobre pedidos do dia." />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pedidos abertos" value={summary.openOrders} hint="Recebidos, confirmados, em preparo ou prontos." />
        <StatCard label="Pedidos entregues" value={summary.deliveredOrders} />
        <StatCard label="Produtos disponíveis" value={`${summary.availableProducts}/${summary.products}`} hint={`${productAvailability}% do cadastro.`} />
        <StatCard label="Mesas ativas" value={`${summary.activeTables}/${summary.tables}`} hint={`${tableActivation}% das mesas.`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-xl font-bold">Produtos mais vendidos hoje</h2>
          {summary.topProducts.length === 0 ? (
            <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">Ainda não há itens vendidos no período.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {summary.topProducts.map((product, index) => (
                <article key={product.productId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">#{index + 1}</p>
                    <h3 className="font-bold text-slate-100">{product.productName}</h3>
                    <p className="text-sm text-slate-400">{product.quantity} unidade(s)</p>
                  </div>
                  <strong className="text-right text-emerald-300">{formatCurrencyBRL(product.revenueCents)}</strong>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-xl font-bold">Formas de pagamento hoje</h2>
          {summary.paymentBreakdown.length === 0 ? (
            <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">Nenhum pagamento fechado hoje.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {summary.paymentBreakdown.map((payment) => (
                <article key={payment.paymentMethod} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold uppercase text-slate-100">{payment.paymentMethod}</h3>
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">{payment.count} fechamento(s)</span>
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm text-slate-400 sm:grid-cols-3">
                    <div><dt>Total devido</dt><dd className="font-bold text-slate-100">{formatCurrencyBRL(payment.totalDueCents)}</dd></div>
                    <div><dt>Pago</dt><dd className="font-bold text-slate-100">{formatCurrencyBRL(payment.amountPaidCents)}</dd></div>
                    <div><dt>Troco</dt><dd className="font-bold text-slate-100">{formatCurrencyBRL(payment.changeCents)}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-xl font-bold">Leitura gerencial</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          <li className="flex gap-2"><span className="text-emerald-300">•</span><span>Use pedidos abertos para decidir reforço na cozinha/atendimento.</span></li>
          <li className="flex gap-2"><span className="text-emerald-300">•</span><span>Compare produtos mais vendidos com disponibilidade para evitar ruptura operacional.</span></li>
          <li className="flex gap-2"><span className="text-emerald-300">•</span><span>Receita financeira vem do caixa fechado, não apenas de pedido entregue.</span></li>
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
