import { createTableAction } from '@/app/actions/catalog';
import Link from 'next/link';
import { headers } from 'next/headers';
import { QrCodeImage } from '@/components/qr/qr-code-svg';
import { buildPublicMenuPath } from '@/lib/public-menu/qr';
import type { RestaurantTable } from '@/lib/types/catalog';

export function TableForm({ tenantId }: Readonly<{ tenantId: string }>) {
  return (
    <form action={createTableAction} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div>
        <h2 className="text-xl font-bold">Cadastrar mesa</h2>
        <p className="mt-1 text-sm text-slate-400">Identifique as mesas do salão para uso futuro com QR Code.</p>
      </div>
      <label className="block text-sm font-medium text-slate-300">
        Número ou identificação
        <input name="number" required maxLength={20} placeholder="Ex.: 01, A1, Varanda 3" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <label className="block text-sm font-medium text-slate-300">
        Lugares
        <input name="seats" required type="number" min={1} max={99} defaultValue={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <label className="block text-sm font-medium text-slate-300">
        Setor
        <input name="sector" placeholder="Ex.: Salão, Varanda, Área externa" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400" />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input name="isActive" type="checkbox" defaultChecked className="size-4 accent-emerald-400" />
        Mesa ativa
      </label>
      <button type="submit" className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300">Salvar mesa</button>
    </form>
  );
}

export async function TableList({ tables, publicSlug }: Readonly<{ tables: RestaurantTable[]; publicSlug: string }>) {
  const headersList = await headers();
  const headerHost = headersList.get('x-forwarded-host') ?? headersList.get('host') ?? 'localhost:3000';
  const headerProto = headersList.get('x-forwarded-proto') ?? (headerHost.startsWith('localhost') ? 'http' : 'https');
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${headerProto}://${headerHost}`;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-xl font-bold">Mesas cadastradas</h2>
      {tables.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Nenhuma mesa cadastrada ainda.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {await Promise.all(tables.map(async (table) => {
            const publicPath = buildPublicMenuPath(publicSlug, table.qr_token);
            const publicUrl = new URL(publicPath, origin).toString();
            return (
            <article key={table.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-100">Mesa {table.number}</h3>
                  <p className="mt-1 text-sm text-slate-400">{table.seats} lugares{table.sector ? ` • ${table.sector}` : ''}</p>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">{table.is_active ? 'Ativa' : 'Inativa'}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                <QrCodeImage value={publicUrl} label={`QR Mesa ${table.number}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-200">Cardápio público da mesa</p>
                  <Link href={publicPath} target="_blank" className="mt-2 inline-flex break-all text-sm text-emerald-300 hover:text-emerald-200">
                    {publicPath}
                  </Link>
                  <p className="mt-2 text-xs text-slate-500">Use este QR para o cliente abrir o cardápio desta mesa.</p>
                </div>
              </div>
            </article>
          );
          }))}
        </div>
      )}
    </section>
  );
}
