import { createClient } from '@/lib/supabase/server';
import { PublicOrderForm } from '@/components/public-menu/public-order-form';
import type { PublicMenuPayload } from '@/lib/types/public-menu';
import { validatePublicMenuParams } from '@/lib/public-menu/qr';
import { notFound } from 'next/navigation';

function categoryAnchor(name: string, index: number) {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return `categoria-${slug || 'sem-nome'}-${index}`;
}

export default async function PublicQrMenuPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ restaurantSlug: string; qrToken: string }>;
  searchParams: Promise<{ erro?: string }>;
}>) {
  const routeParams = await params;
  const feedback = await searchParams;
  const validation = validatePublicMenuParams(routeParams);
  if (!validation.success) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_menu_by_qr', {
    menu_slug: validation.data.restaurantSlug,
    menu_qr_token: validation.data.qrToken,
  });

  if (error || !data) notFound();

  const menu = data as PublicMenuPayload;
  const availableProductsCount = menu.categories.reduce((total, category) => total + category.products.length, 0);
  const prepMinutes = menu.tenant.estimated_prep_minutes;

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-stone-950">
      <section className="mx-auto max-w-6xl px-4 py-4 pb-10 sm:px-5 sm:py-6 lg:px-6">
        <header className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl shadow-stone-200/70">
          <div className="bg-gradient-to-br from-red-500 via-red-500 to-red-700 px-5 py-7 text-white sm:px-7 sm:py-9">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-white/90">MesaFácil</p>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{menu.tenant.name}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90 sm:text-base">
                  {menu.tenant.public_description ?? `Cardápio digital da mesa ${menu.table.number}. Escolha seus itens e envie direto para a equipe.`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-64">
                <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                  <span className="block text-xs text-white/75">Mesa</span>
                  <strong className="text-lg">{menu.table.number}</strong>
                </div>
                <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                  <span className="block text-xs text-white/75">Setor</span>
                  <strong className="text-lg">{menu.table.sector ?? 'Salão'}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-5 py-4 text-sm text-stone-700 sm:grid-cols-3 sm:px-7">
            <div className="rounded-2xl bg-stone-50 p-3"><strong className="block text-stone-950">{availableProductsCount}</strong> itens disponíveis</div>
            <div className="rounded-2xl bg-stone-50 p-3"><strong className="block text-stone-950">{prepMinutes ? `${prepMinutes} min` : 'Consultar'}</strong> tempo estimado</div>
            <div className="rounded-2xl bg-stone-50 p-3"><strong className="block text-stone-950">Pagamento</strong> direto no restaurante</div>
          </div>
        </header>

        {feedback.erro ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{feedback.erro}</p> : null}
        {menu.tenant.public_notice ? <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{menu.tenant.public_notice}</p> : null}

        {availableProductsCount === 0 ? (
          <section className="mt-5 rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black">Cardápio em montagem</h2>
            <p className="mt-2 text-stone-500">Este restaurante ainda não publicou produtos disponíveis para esta mesa.</p>
          </section>
        ) : (
          <>
            <nav aria-label="Categorias" className="sticky top-0 z-20 -mx-4 mt-5 flex gap-2 overflow-x-auto border-y border-stone-200 bg-[#f7f7f5]/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-white/95">
              {menu.categories.filter((category) => category.products.length > 0).map((category, index) => (
                <a key={`${category.name}-${index}`} href={`#${categoryAnchor(category.name, index)}`} className="shrink-0 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-black text-stone-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                  {category.name}
                </a>
              ))}
            </nav>

            <PublicOrderForm menu={menu} qrToken={validation.data.qrToken} categoryAnchor={categoryAnchor} />
          </>
        )}

        <footer className="py-8 text-center text-xs text-stone-400">
          Mesa {menu.table.number} • Cardápio protegido por QR Code • MesaFácil
        </footer>
      </section>
    </main>
  );
}
