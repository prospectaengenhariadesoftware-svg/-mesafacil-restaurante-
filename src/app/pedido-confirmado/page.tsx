import { formatCurrencyBRL } from '@/lib/domain/order';

export default async function PedidoConfirmadoPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ codigo?: string; mesa?: string; total?: string }>;
}>) {
  const params = await searchParams;
  const total = Number.parseInt(params.total ?? '0', 10);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <section className="mx-auto max-w-2xl rounded-3xl border border-emerald-400/30 bg-slate-900 p-6 shadow-2xl shadow-emerald-950/20">
        <p className="text-sm font-semibold text-emerald-300">Pedido enviado</p>
        <h1 className="mt-2 text-3xl font-black">Recebemos seu pedido</h1>
        <p className="mt-3 text-slate-300">A equipe do restaurante já pode acompanhar este pedido no painel interno.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500">Código</p>
            <p className="mt-1 font-black text-emerald-300">{params.codigo || '—'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500">Mesa</p>
            <p className="mt-1 font-black">{params.mesa || '—'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500">Total</p>
            <p className="mt-1 font-black">{formatCurrencyBRL(Number.isFinite(total) ? total : 0)}</p>
          </div>
        </div>

        <p className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          Pagamento ainda não está ativo nesta etapa. Aguarde a confirmação da equipe.
        </p>
      </section>
    </main>
  );
}
