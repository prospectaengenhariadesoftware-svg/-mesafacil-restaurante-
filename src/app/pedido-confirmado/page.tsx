import { formatCurrencyBRL } from '@/lib/domain/order';

export default async function PedidoConfirmadoPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ codigo?: string; mesa?: string; total?: string }>;
}>) {
  const params = await searchParams;
  const total = Number.parseInt(params.total ?? '0', 10);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-950">
      <section className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-6 shadow-2xl shadow-red-100/70">
        <p className="text-sm font-semibold text-red-600">Pedido enviado</p>
        <h1 className="mt-2 text-3xl font-black">Recebemos seu pedido</h1>
        <p className="mt-3 text-stone-600">A equipe do restaurante já pode acompanhar este pedido no painel interno.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs text-stone-400">Código</p>
            <p className="mt-1 font-black text-red-600">{params.codigo || '—'}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs text-stone-400">Mesa</p>
            <p className="mt-1 font-black">{params.mesa || '—'}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs text-stone-400">Total</p>
            <p className="mt-1 font-black">{formatCurrencyBRL(Number.isFinite(total) ? total : 0)}</p>
          </div>
        </div>

        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Pagamento ainda não está ativo nesta etapa. Aguarde a confirmação da equipe.
        </p>
      </section>
    </main>
  );
}
