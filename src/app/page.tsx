import Link from 'next/link';

const highlights = [
  'Cardápio digital por QR Code',
  'Pedidos em tempo real',
  'Painel da cozinha',
  'Gestão de mesas e produtos',
];

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-50">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="mb-8 inline-flex w-fit rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200">
          MVP inicial • restaurante • QR Code
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-amber-300">MesaFácil</p>
            <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-7xl">
              Pedido na mesa, cozinha organizada e atendimento mais rápido.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-300">
              Sistema web para restaurante receber pedidos por QR Code, controlar cardápio,
              acompanhar status e operar o salão sem comanda manual perdida.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-stone-950 transition hover:bg-amber-300" href="/r/mesafacil-demo/m/mesa-12">
                Ver demo do cliente
              </Link>
              <Link className="rounded-full border border-stone-700 px-6 py-3 font-semibold text-stone-100 transition hover:bg-stone-900" href="/admin">
                Abrir painel admin
              </Link>
              <Link className="rounded-full border border-stone-700 px-6 py-3 font-semibold text-stone-100 transition hover:bg-stone-900" href="/admin/kitchen">
                Painel da cozinha
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-stone-800 bg-stone-900/70 p-6 shadow-2xl">
            <div className="rounded-[1.5rem] bg-stone-50 p-5 text-stone-950">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-500">Mesa 12</p>
                  <h2 className="text-2xl font-bold">Pedido #0001</h2>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Recebido</span>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl bg-stone-100 p-4">
                  <p className="font-semibold">2× Burger Clássico</p>
                  <p className="text-sm text-stone-500">Um sem tomate</p>
                </div>
                <div className="rounded-2xl bg-stone-100 p-4">
                  <p className="font-semibold">2× Suco de Laranja</p>
                  <p className="text-sm text-stone-500">Natural gelado</p>
                </div>
              </div>
              <p className="mt-5 text-right text-xl font-bold">R$ 77,80</p>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <div className="rounded-2xl border border-stone-800 bg-stone-900 p-5 text-sm text-stone-300" key={item}>
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
