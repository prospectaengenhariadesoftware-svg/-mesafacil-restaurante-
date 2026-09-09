import Link from 'next/link';

export default function OrderConfirmedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-5 text-stone-950">
      <section className="max-w-md rounded-[2rem] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✓</div>
        <p className="mt-6 text-sm uppercase tracking-[0.25em] text-amber-700">Pedido recebido</p>
        <h1 className="mt-3 text-4xl font-bold">Pedido #0001 enviado</h1>
        <p className="mt-4 leading-7 text-stone-600">
          Demonstração do fluxo do cliente. Na versão conectada, este pedido será salvo no Supabase e aparecerá em tempo real na cozinha.
        </p>
        <Link className="mt-8 inline-flex rounded-full bg-stone-950 px-6 py-3 font-bold text-white" href="/admin/kitchen">
          Ver na cozinha
        </Link>
      </section>
    </main>
  );
}
