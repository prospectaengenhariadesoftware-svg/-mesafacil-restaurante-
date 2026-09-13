import { createTableAction, deleteTableAction, updateTableAction } from '@/app/actions/catalog';
import Link from 'next/link';
import { headers } from 'next/headers';
import { QrCodeImage } from '@/components/qr/qr-code-svg';
import { buildPublicMenuPath } from '@/lib/public-menu/qr';
import type { RestaurantTable } from '@/lib/types/catalog';

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
    <form action={createTableAction} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div>
        <h2 className="text-xl font-bold">Cadastrar mesa</h2>
        <p className="mt-1 text-sm text-stone-500">Identifique as mesas do salão para gerar QR Code e receber pedidos.</p>
      </div>
      <TableFields />
      <button type="submit" className="rounded-full bg-red-500 px-5 py-3 text-sm font-bold text-white hover:bg-red-600">Salvar mesa</button>
    </form>
  );
}

function TableFields({ table }: Readonly<{ table?: RestaurantTable }>) {
  return (
    <>
      <label className="block text-sm font-medium text-stone-600">
        Número ou identificação
        <input name="number" required maxLength={20} defaultValue={table?.number} placeholder="Ex.: 01, A1, Varanda 3" className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="block text-sm font-medium text-stone-600">
        Lugares
        <input name="seats" required type="number" min={1} max={99} defaultValue={table?.seats ?? 4} className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="block text-sm font-medium text-stone-600">
        Setor
        <input name="sector" maxLength={60} defaultValue={table?.sector ?? ''} placeholder="Ex.: Salão, Varanda, Área externa" className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input name="isActive" type="checkbox" defaultChecked={table?.is_active ?? true} className="size-4 accent-red-500" />
        Mesa ativa
      </label>
    </>
  );
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
}: Readonly<{
  tenantId: string;
  tables: RestaurantTable[];
  publicSlug: string;
  filters: TableFilters;
  total: number;
  pageSize: number;
}>) {
  const headersList = await headers();
  const headerHost = headersList.get('x-forwarded-host') ?? headersList.get('host') ?? 'localhost:3000';
  const headerProto = headersList.get('x-forwarded-proto') ?? (headerHost.startsWith('localhost') ? 'http' : 'https');
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${headerProto}://${headerHost}`;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-bold">Mesas cadastradas</h2>
          <p className="mt-1 text-sm text-stone-500">{total} mesa(s) encontradas no banco deste tenant.</p>
        </div>
        <Link href={buildQuery(tenantId, filters, { q: '', status: 'all', sort: 'number', dir: 'asc', page: 1 })} className="text-sm font-semibold text-red-600 hover:text-red-600">Limpar filtros</Link>
      </div>

      <form className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]" action={`/tenants/${tenantId}/mesas`}>
        <input name="q" defaultValue={filters.q} placeholder="Buscar número ou setor" className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500" />
        <select name="status" defaultValue={filters.status} className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
          <option value="all">Todos os status</option>
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
        </select>
        <select name="sort" defaultValue={filters.sort} className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
          <option value="number">Ordenar por número</option>
          <option value="seats">Ordenar por lugares</option>
          <option value="created_at">Ordenar por data</option>
        </select>
        <select name="dir" defaultValue={filters.dir} className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
          <option value="asc">Crescente</option>
          <option value="desc">Decrescente</option>
        </select>
        <button className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">Filtrar</button>
      </form>

      {tables.length === 0 ? (
        <p className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">Nenhuma mesa encontrada para os filtros atuais.</p>
      ) : (
        <div className="mt-4 grid gap-4">
          {await Promise.all(tables.map(async (table) => {
            const publicPath = buildPublicMenuPath(publicSlug, table.qr_token);
            const publicUrl = new URL(publicPath, origin).toString();
            return (
              <article key={table.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-stone-950">Mesa {table.number}</h3>
                        <p className="mt-1 text-sm text-stone-500">{table.seats} lugares{table.sector ? ` • ${table.sector}` : ''}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${table.is_active ? 'bg-red-50 text-red-600' : 'bg-stone-100 text-stone-600'}`}>{table.is_active ? 'Ativa' : 'Inativa'}</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                      <QrCodeImage value={publicUrl} label={`QR Mesa ${table.number}`} />
                      <div>
                        <p className="text-sm font-semibold text-stone-800">Cardápio público da mesa</p>
                        <Link href={publicPath} target="_blank" className="mt-2 inline-flex break-all text-sm text-red-600 hover:text-red-600">
                          {publicPath}
                        </Link>
                        <p className="mt-2 text-xs text-stone-400">Use este QR para o cliente abrir o cardápio desta mesa.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-3">
                    <form action={updateTableAction} className="space-y-3">
                      <input type="hidden" name="tenantId" value={tenantId} />
                      <input type="hidden" name="tableId" value={table.id} />
                      <TableFields table={table} />
                      <button className="w-full rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">Salvar alterações</button>
                    </form>
                    <form action={deleteTableAction} className="space-y-2 border-t border-stone-200 pt-3">
                      <input type="hidden" name="tenantId" value={tenantId} />
                      <input type="hidden" name="tableId" value={table.id} />
                      <input name="confirmDelete" placeholder="Digite CONFIRMAR" className="w-full rounded-xl border border-red-900/60 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-400" />
                      <button className="w-full rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50">Excluir ou inativar</button>
                      <p className="text-xs text-stone-400">Com pedidos vinculados, a mesa será inativada para preservar histórico.</p>
                    </form>
                  </div>
                </div>
              </article>
            );
          }))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-stone-500">
        <span>Página {filters.page} de {totalPages}</span>
        <div className="flex gap-2">
          <Link aria-disabled={filters.page <= 1} href={buildQuery(tenantId, filters, { page: Math.max(1, filters.page - 1) })} className={`rounded-full border border-stone-300 px-4 py-2 ${filters.page <= 1 ? 'pointer-events-none opacity-40' : 'hover:border-red-500 hover:text-red-600'}`}>Anterior</Link>
          <Link aria-disabled={filters.page >= totalPages} href={buildQuery(tenantId, filters, { page: Math.min(totalPages, filters.page + 1) })} className={`rounded-full border border-stone-300 px-4 py-2 ${filters.page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:border-red-500 hover:text-red-600'}`}>Próxima</Link>
        </div>
      </div>
    </section>
  );
}
