import { createTableAction, deleteTableAction, releaseTableReservationAction, updateTableAction } from '@/app/actions/catalog';
import Link from 'next/link';
import { headers } from 'next/headers';
import { QrCodeImage } from '@/components/qr/qr-code-svg';
import { buildPublicMenuPath } from '@/lib/public-menu/qr';
import type { RestaurantTable } from '@/lib/types/catalog';
import { CreateModal } from '@/components/ui/create-modal';

type TableStatus = 'all' | 'active' | 'inactive';
type TableSort = 'number' | 'seats' | 'created_at';
type TableDirection = 'asc' | 'desc';

type TableFilters = {
  q: string;
  status: TableStatus;
  sort: TableSort;
  dir: TableDirection;
  page: number;
};

export function TableForm({ tenantId }: Readonly<{ tenantId: string }>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/70">
      <div>
        <p className="text-sm font-black text-red-600">Mesas e QR Codes</p>
        <h2 className="text-xl font-black tracking-tight">Organize o salão</h2>
        <p className="mt-1 text-sm text-stone-500">Cadastre mesas e gere o QR Code público do cardápio.</p>
      </div>
      <CreateModal
        triggerLabel="+ Nova mesa"
        eyebrow="Cadastro"
        title="Nova mesa"
        description="Identifique mesa, lugares e setor para liberar pedidos por QR Code."
      >
        <form action={createTableAction}>
          <input type="hidden" name="tenantId" value={tenantId} />
          <div className="mt-5 space-y-4">
            <TableFields />
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-500">Ao salvar, o QR Code fica disponível no card da mesa.</p>
            <button type="submit" className="min-h-12 rounded-full bg-red-600 px-6 py-3 text-sm font-black text-white hover:bg-red-700">Salvar mesa</button>
          </div>
        </form>
      </CreateModal>
    </div>
  );
}

function TableFields({ table }: Readonly<{ table?: RestaurantTable }>) {
  return (
    <>
      <label className="block text-sm font-bold text-stone-700">
        Número ou identificação
        <input name="number" required maxLength={20} defaultValue={table?.number} placeholder="Ex.: 01, A1, Varanda 3" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="block text-sm font-bold text-stone-700">
        Lugares
        <input name="seats" required type="number" min={1} max={99} defaultValue={table?.seats ?? 4} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="block text-sm font-bold text-stone-700">
        Setor
        <input name="sector" maxLength={60} defaultValue={table?.sector ?? ''} placeholder="Ex.: Salão, Varanda, Área externa" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
        <input name="isActive" type="checkbox" defaultChecked={table?.is_active ?? true} className="size-4 accent-red-500" />
        Mesa ativa
      </label>
    </>
  );
}

function reservationLabel(table: RestaurantTable): string {
  return table.reservation_status === 'reserved' ? 'Reservada' : 'Livre';
}

function reservationBadgeClass(table: RestaurantTable): string {
  return table.reservation_status === 'reserved' ? 'bg-red-100 text-red-700' : 'bg-green-50 text-green-700';
}

function buildQuery(tenantId: string, filters: TableFilters, overrides: Partial<TableFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.status !== 'all') params.set('status', next.status);
  if (next.sort !== 'number') params.set('sort', next.sort);
  if (next.dir !== 'asc') params.set('dir', next.dir);
  if (next.page > 1) params.set('page', String(next.page));
  const suffix = params.toString();
  return `/tenants/${tenantId}/mesas${suffix ? `?${suffix}` : ''}`;
}

export async function TableList({
  tenantId,
  tables,
  publicSlug,
  filters,
  total,
  pageSize,
  canManageReservations,
}: Readonly<{
  tenantId: string;
  tables: RestaurantTable[];
  publicSlug: string;
  filters: TableFilters;
  total: number;
  pageSize: number;
  canManageReservations: boolean;
}>) {
  const headersList = await headers();
  const headerHost = headersList.get('x-forwarded-host') ?? headersList.get('host') ?? 'localhost:3000';
  const headerProto = headersList.get('x-forwarded-proto') ?? (headerHost.startsWith('localhost') ? 'http' : 'https');
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${headerProto}://${headerHost}`;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4 rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Mesas cadastradas</h2>
          <p className="mt-1 text-sm text-stone-500">{total} mesa(s) encontradas no banco deste tenant.</p>
        </div>
        <Link href={buildQuery(tenantId, filters, { q: '', status: 'all', sort: 'number', dir: 'asc', page: 1 })} className="text-sm font-black text-red-600 hover:text-red-700">Limpar filtros</Link>
      </div>

      <form className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]" action={`/tenants/${tenantId}/mesas`}>
        <input name="q" defaultValue={filters.q} placeholder="Buscar número ou setor" className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500" />
        <select name="status" defaultValue={filters.status} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
          <option value="all">Todos os status</option>
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
        </select>
        <select name="sort" defaultValue={filters.sort} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
          <option value="number">Ordenar por número</option>
          <option value="seats">Ordenar por lugares</option>
          <option value="created_at">Ordenar por data</option>
        </select>
        <select name="dir" defaultValue={filters.dir} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
          <option value="asc">Crescente</option>
          <option value="desc">Decrescente</option>
        </select>
        <button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700">Filtrar</button>
      </form>

      {tables.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500">Nenhuma mesa encontrada para os filtros atuais.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {await Promise.all(tables.map(async (table) => {
            const publicPath = buildPublicMenuPath(publicSlug, table.qr_token);
            const publicUrl = new URL(publicPath, origin).toString();
            return (
              <article key={table.id} className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm shadow-stone-200/70">
                <div className="bg-gradient-to-br from-red-50 via-white to-amber-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Mesa</p>
                      <h3 className="mt-1 text-3xl font-black tracking-tight text-stone-950">{table.number}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${table.is_active ? 'bg-red-100 text-red-700' : 'bg-stone-200 text-stone-600'}`}>{table.is_active ? 'Ativa' : 'Inativa'}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${reservationBadgeClass(table)}`}>{reservationLabel(table)}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-full bg-white px-3 py-1 text-stone-700 shadow-sm">{table.seats} lugares</span>
                    <span className="rounded-full bg-white px-3 py-1 text-stone-700 shadow-sm">{table.sector || 'Sem setor'}</span>
                  </div>
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
                  <div className="rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
                    <QrCodeImage value={publicUrl} label={`QR Mesa ${table.number}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-stone-800">Cardápio público</p>
                    <Link href={publicPath} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-sm font-semibold text-red-600 hover:text-red-700">
                      {publicPath}
                    </Link>
                    <p className="mt-2 text-xs text-stone-400">Cliente escaneia, abre o cardápio e faz pedido nesta mesa.</p>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  {table.reservation_status === 'reserved' ? (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                      <p className="text-sm font-black text-red-700">Mesa {table.number} reservada</p>
                      {canManageReservations ? (
                        <>
                          <dl className="mt-3 grid gap-2 text-sm text-stone-700">
                            <div><dt className="font-black text-stone-500">Cliente</dt><dd className="break-words">{table.reserved_customer_name ?? '—'}</dd></div>
                            <div><dt className="font-black text-stone-500">E-mail</dt><dd className="break-words">{table.reserved_customer_email ?? '—'}</dd></div>
                            <div><dt className="font-black text-stone-500">Telefone</dt><dd className="break-words">{table.reserved_customer_phone ?? '—'}</dd></div>
                            <div><dt className="font-black text-stone-500">Reservada em</dt><dd className="break-words">{table.reserved_at ? new Date(table.reserved_at).toLocaleString('pt-BR') : '—'}</dd></div>
                          </dl>
                          <form action={releaseTableReservationAction} className="mt-4">
                            <input type="hidden" name="tenantId" value={tenantId} />
                            <input type="hidden" name="tableId" value={table.id} />
                            <button className="w-full rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-700 hover:bg-red-50">Liberar reserva e limpar dados</button>
                          </form>
                        </>
                      ) : (
                        <p className="mt-2 text-sm font-semibold text-red-700/80">Dados do cliente restritos à gerência.</p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-black text-green-700">Mesa disponível para reserva pública.</div>
                  )}
                </div>

                <details className="mx-4 mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <summary className="cursor-pointer text-sm font-black text-red-600">Editar mesa</summary>
                  <form action={updateTableAction} className="mt-4 space-y-3">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="tableId" value={table.id} />
                    <TableFields table={table} />
                    <button className="w-full rounded-full bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700">Salvar alterações</button>
                  </form>
                </details>

                <details className="mx-4 mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <summary className="cursor-pointer text-sm font-black text-red-700">Excluir ou inativar</summary>
                  <form action={deleteTableAction} className="mt-4 space-y-3">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="tableId" value={table.id} />
                    <input name="confirmDelete" placeholder="Digite CONFIRMAR" className="w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500" />
                    <button className="w-full rounded-full border border-red-200 px-4 py-2 text-sm font-black text-red-700 hover:bg-white">Excluir ou inativar</button>
                    <p className="text-xs text-stone-400">Com pedidos vinculados, a mesa será inativada para preservar histórico.</p>
                  </form>
                </details>
              </article>
            );
          }))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4 text-sm text-stone-500">
        <span>Página {filters.page} de {totalPages}</span>
        <div className="flex gap-2">
          <Link aria-disabled={filters.page <= 1} href={buildQuery(tenantId, filters, { page: Math.max(1, filters.page - 1) })} className={`rounded-full border border-stone-300 px-4 py-2 font-bold ${filters.page <= 1 ? 'pointer-events-none opacity-40' : 'hover:border-red-500 hover:text-red-600'}`}>Anterior</Link>
          <Link aria-disabled={filters.page >= totalPages} href={buildQuery(tenantId, filters, { page: Math.min(totalPages, filters.page + 1) })} className={`rounded-full border border-stone-300 px-4 py-2 font-bold ${filters.page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:border-red-500 hover:text-red-600'}`}>Próxima</Link>
        </div>
      </div>
    </section>
  );
}
