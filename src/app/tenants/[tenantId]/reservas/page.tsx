import Link from 'next/link';
import { redirect } from 'next/navigation';
import { updateReservationStatusAction } from '@/app/actions/reservations';
import { ReservationRealtimeAlert } from '@/components/reservations/reservation-realtime-alert';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { TableReservation, TableReservationStatus } from '@/lib/types/catalog';
import { isUuid } from '@/lib/validation/auth';

const PAGE_LIMIT = 500;
const statusLabels: Record<TableReservationStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Concluída',
  no_show: 'Não compareceu',
};
const statusClasses: Record<TableReservationStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  no_show: 'bg-stone-100 text-stone-700 border-stone-200',
};

type ReservationView = 'day' | 'week' | 'month';
type ReservationStatusFilter = 'all' | TableReservationStatus;

type ReservationFilters = {
  view: ReservationView;
  date: string;
  status: ReservationStatusFilter;
  q: string;
  futureOnly: boolean;
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return isoDate(new Date());
}

function parseView(value: unknown): ReservationView {
  return value === 'week' || value === 'month' ? value : 'day';
}

function parseStatus(value: unknown): ReservationStatusFilter {
  return ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'].includes(String(value)) ? value as TableReservationStatus : 'all';
}

function startOfLocalDate(date: string): Date {
  return new Date(`${date}T03:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function rangeFor(filters: ReservationFilters): { from: Date; to: Date } {
  const base = startOfLocalDate(filters.date);
  if (filters.view === 'day') return { from: base, to: addDays(base, 1) };
  if (filters.view === 'week') {
    const day = base.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const from = addDays(base, mondayOffset);
    return { from, to: addDays(from, 7) };
  }
  const from = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1, 3));
  const to = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1, 3));
  return { from, to };
}

function cleanSearch(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 80) : '';
}

function buildReservationPath(tenantId: string, filters: ReservationFilters, overrides: Partial<ReservationFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  params.set('view', next.view);
  params.set('date', next.date);
  if (next.status !== 'all') params.set('status', next.status);
  if (next.q) params.set('q', next.q);
  if (next.futureOnly) params.set('future', '1');
  return `/tenants/${tenantId}/reservas?${params.toString()}`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function dayKey(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function statusReport(reservations: TableReservation[]) {
  return reservations.reduce<Record<TableReservationStatus, number>>((acc, reservation) => {
    acc[reservation.status] += 1;
    return acc;
  }, { pending: 0, confirmed: 0, cancelled: 0, completed: 0, no_show: 0 });
}

function StatusButton({ tenantId, reservation, status, returnTo }: Readonly<{ tenantId: string; reservation: TableReservation; status: TableReservationStatus; returnTo: string }>) {
  if (reservation.status === status) return null;
  return (
    <form action={updateReservationStatusAction}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="reservationId" value={reservation.id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-black text-stone-700 hover:border-red-300 hover:text-red-600">{statusLabels[status]}</button>
    </form>
  );
}

function ReservationCard({ tenantId, reservation, returnTo }: Readonly<{ tenantId: string; reservation: TableReservation; returnTo: string }>) {
  const table = reservation.tenant_tables;
  return (
    <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">Agendamento</p>
          <h3 className="mt-1 text-xl font-black text-stone-950">{reservation.customer_name}</h3>
          <p className="mt-1 text-sm font-bold text-red-600">{formatDateTime(reservation.scheduled_at)}</p>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${statusClasses[reservation.status]}`}>{statusLabels[reservation.status]}</span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
        <div><dt className="font-black text-stone-500">Mesa</dt><dd>{table ? `${table.number} · ${table.seats} lugares${table.sector ? ` · ${table.sector}` : ''}` : '—'}</dd></div>
        <div><dt className="font-black text-stone-500">Pessoas</dt><dd>{reservation.party_size ?? '—'}</dd></div>
        <div><dt className="font-black text-stone-500">E-mail</dt><dd className="break-words">{reservation.customer_email}</dd></div>
        <div><dt className="font-black text-stone-500">Telefone</dt><dd>{reservation.customer_phone}</dd></div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
        <StatusButton tenantId={tenantId} reservation={reservation} status="confirmed" returnTo={returnTo} />
        <StatusButton tenantId={tenantId} reservation={reservation} status="cancelled" returnTo={returnTo} />
        <StatusButton tenantId={tenantId} reservation={reservation} status="completed" returnTo={returnTo} />
        <StatusButton tenantId={tenantId} reservation={reservation} status="no_show" returnTo={returnTo} />
        <StatusButton tenantId={tenantId} reservation={reservation} status="pending" returnTo={returnTo} />
      </div>
    </article>
  );
}

export default async function ReservasPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ view?: string; date?: string; status?: string; q?: string; future?: string; mensagem?: string; erro?: string }>;
}>) {
  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  const membership = await requireActiveTenant(tenantId);
  if (!['owner', 'admin', 'manager'].includes(membership.role)) {
    redirect(`/tenants/${tenantId}?erro=${encodeURIComponent('Central de reservas restrita à gerência.')}`);
  }

  const raw = await searchParams;
  const filters: ReservationFilters = {
    view: parseView(raw.view),
    date: parseDate(raw.date),
    status: parseStatus(raw.status),
    q: cleanSearch(raw.q),
    futureOnly: raw.future === '1',
  };
  const { from, to } = rangeFor(filters);
  const queryFrom = filters.futureOnly && new Date() > from ? new Date() : from;
  const returnTo = buildReservationPath(tenantId, filters);

  const supabase = await createClient();
  let query = supabase
    .from('tenant_table_reservations')
    .select('*, tenant_tables:tenant_tables!tenant_table_reservations_table_same_tenant(id, number, seats, sector)', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .gte('scheduled_at', queryFrom.toISOString())
    .lt('scheduled_at', to.toISOString())
    .order('scheduled_at', { ascending: true })
    .range(0, PAGE_LIMIT - 1);

  if (filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.q) {
    const term = filters.q.replace(/[^0-9A-Za-zÀ-ÿ@._+ -]/g, '').trim();
    if (term) query = query.or(`customer_name.ilike.%${term}%,customer_email.ilike.%${term}%,customer_phone.ilike.%${term}%`);
  }

  const { data, count, error } = await query;
  if (error) redirect(`/tenants/${tenantId}?erro=${encodeURIComponent('Não foi possível carregar a central de reservas.')}`);
  const reservations = (data ?? []) as unknown as TableReservation[];
  const report = statusReport(reservations);
  const byDay = new Map<string, TableReservation[]>();
  for (const reservation of reservations) {
    const key = dayKey(reservation.scheduled_at);
    byDay.set(key, [...(byDay.get(key) ?? []), reservation]);
  }

  return (
    <TenantModulePage tenantId={tenantId} module="reservas">
      {raw.mensagem ? <p className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-black text-green-700">{raw.mensagem}</p> : null}
      {raw.erro ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">{raw.erro}</p> : null}

      <section className="grid gap-3 md:grid-cols-5">
        {(['pending', 'confirmed', 'cancelled', 'completed', 'no_show'] as TableReservationStatus[]).map((status) => (
          <article key={status} className={`rounded-2xl border p-4 ${statusClasses[status]}`}>
            <p className="text-xs font-black uppercase tracking-[0.14em] opacity-75">{statusLabels[status]}</p>
            <p className="mt-2 text-3xl font-black">{report[status]}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-stone-950">Calendário de agendamentos</h2>
              <ReservationRealtimeAlert tenantId={tenantId} />
            </div>
            <p className="mt-1 text-sm text-stone-500">{count ?? reservations.length} reserva(s) no período selecionado. Limite visual: {PAGE_LIMIT} cards.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-black">
            <Link href={buildReservationPath(tenantId, filters, { view: 'day' })} className={`rounded-full border px-4 py-2 ${filters.view === 'day' ? 'border-red-600 bg-red-600 text-white' : 'border-stone-200 text-stone-700'}`}>Dia</Link>
            <Link href={buildReservationPath(tenantId, filters, { view: 'week' })} className={`rounded-full border px-4 py-2 ${filters.view === 'week' ? 'border-red-600 bg-red-600 text-white' : 'border-stone-200 text-stone-700'}`}>Semana</Link>
            <Link href={buildReservationPath(tenantId, filters, { view: 'month' })} className={`rounded-full border px-4 py-2 ${filters.view === 'month' ? 'border-red-600 bg-red-600 text-white' : 'border-stone-200 text-stone-700'}`}>Mês</Link>
          </div>
        </div>

        <form className="mt-5 grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-[0.8fr_0.8fr_1fr_1.2fr_auto]" action={`/tenants/${tenantId}/reservas`}>
          <select name="view" defaultValue={filters.view} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
          </select>
          <input name="date" type="date" defaultValue={filters.date} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500" />
          <select name="status" defaultValue={filters.status} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
            <option value="all">Todos os status</option>
            <option value="pending">Pendentes</option>
            <option value="confirmed">Confirmadas</option>
            <option value="cancelled">Canceladas</option>
            <option value="completed">Concluídas</option>
            <option value="no_show">Não compareceu</option>
          </select>
          <input name="q" defaultValue={filters.q} placeholder="Buscar nome, e-mail ou telefone" className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500" />
          <label className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-700">
            <input type="checkbox" name="future" value="1" defaultChecked={filters.futureOnly} className="size-4 accent-red-600" />
            Futuras
          </label>
          <button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700 md:col-span-5">Aplicar filtros</button>
        </form>

        {reservations.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm font-semibold text-stone-500">Nenhuma reserva encontrada para os filtros atuais.</p>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
            <aside className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-stone-500">Resumo do calendário</h3>
              <div className="mt-4 grid gap-2">
                {Array.from(byDay.entries()).map(([date, rows]) => (
                  <div key={date} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-black text-stone-700 shadow-sm">
                    <span>{date}</span>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">{rows.length} agendamento(s)</span>
                  </div>
                ))}
              </div>
            </aside>
            <div className="grid gap-4 lg:grid-cols-2">
              {reservations.map((reservation) => <ReservationCard key={reservation.id} tenantId={tenantId} reservation={reservation} returnTo={returnTo} />)}
            </div>
          </div>
        )}
      </section>
    </TenantModulePage>
  );
}
