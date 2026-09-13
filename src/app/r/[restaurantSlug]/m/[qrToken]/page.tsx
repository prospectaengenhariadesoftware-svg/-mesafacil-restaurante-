import { createClient } from '@/lib/supabase/server';
import { PublicOrderForm } from '@/components/public-menu/public-order-form';
import type { PublicMenuPayload } from '@/lib/types/public-menu';
import { formatMoneyFromCents } from '@/lib/validation/catalog';
import { validatePublicMenuParams } from '@/lib/public-menu/qr';
import { notFound } from 'next/navigation';

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

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <section className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl shadow-emerald-950/20">
          <p className="text-sm font-semibold text-emerald-300">MesaFácil</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{menu.tenant.name}</h1>
          <p className="mt-3 text-slate-300">
            Cardápio digital da mesa {menu.table.number}{menu.table.sector ? ` • ${menu.table.sector}` : ''}.
          </p>
          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            Confira os produtos disponíveis e envie seu pedido para a equipe do restaurante. Pagamento ainda não está ativado nesta etapa.
          </div>
        </header>

        {feedback.erro ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{feedback.erro}</p> : null}

        {availableProductsCount === 0 ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center">
            <h2 className="text-2xl font-bold">Cardápio em montagem</h2>
            <p className="mt-2 text-slate-400">Este restaurante ainda não publicou produtos disponíveis para esta mesa.</p>
          </section>
        ) : (
          <>
            <PublicOrderForm menu={menu} qrToken={validation.data.qrToken} />
            <div className="space-y-5">
            {menu.categories.map((category) => (
              <section key={category.name} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-2xl font-black">{category.name}</h2>
                  {category.description ? <p className="mt-1 text-sm text-slate-400">{category.description}</p> : null}
                </div>
                {category.products.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">Nenhum produto disponível nesta categoria.</p>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {category.products.map((product) => (
                      <article key={product.public_code} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3">
                            {product.image_url ? (
                              <span aria-label={`Imagem de ${product.name}`} role="img" className="h-24 w-24 shrink-0 rounded-2xl border border-slate-800 bg-cover bg-center" style={{ backgroundImage: `url(${product.image_url})` }} />
                            ) : null}
                            <div>
                            <h3 className="font-bold text-slate-100">{product.name}</h3>
                            {product.description ? <p className="mt-1 text-sm leading-6 text-slate-400">{product.description}</p> : null}
                            </div>
                          </div>
                          <p className="shrink-0 rounded-full bg-emerald-400 px-3 py-1 text-sm font-black text-slate-950">
                            {formatMoneyFromCents(product.price_cents)}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))}
            </div>
          </>
        )}

        <footer className="pb-8 text-center text-xs text-slate-500">
          Mesa {menu.table.number} • Cardápio protegido por QR Code • MesaFácil
        </footer>
      </section>
    </main>
  );
}
