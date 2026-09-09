export default async function PublicQrPlaceholderPage({ params }: Readonly<{ params: Promise<{ restaurantSlug: string; qrToken: string }> }>) {
  const { restaurantSlug, qrToken } = await params;
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <section className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm font-semibold text-emerald-300">MesaFácil</p>
        <h1 className="mt-2 text-3xl font-black">Cardápio público ainda não iniciado</h1>
        <p className="mt-3 text-slate-300">A rota pública por QR Code está reservada, mas o módulo de cardápio/pedidos não faz parte da Etapa 1.</p>
        <dl className="mt-6 grid gap-3 text-sm text-slate-400">
          <div><dt>Restaurante slug</dt><dd className="font-mono">{restaurantSlug}</dd></div>
          <div><dt>QR token</dt><dd className="font-mono">{qrToken}</dd></div>
        </dl>
      </section>
    </main>
  );
}
