import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildPublicSiteMetadata, getPublicSiteContactHref, getPublicSiteContactLabel, getPublicSiteWhatsappHref, productImageStyle } from '@/lib/public-site/site';
import { createClient } from '@/lib/supabase/server';
import type { PublicSitePayload, PublicSiteProduct } from '@/lib/types/public-site';
import { normalizeSiteSlug } from '@/lib/validation/public-site';

function money(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function PublicProductImage({ product }: Readonly<{ product: PublicSiteProduct }>) {
  const imageStyle = productImageStyle(product.image_url);
  if (imageStyle) {
    return <span aria-label={`Imagem de ${product.name}`} role="img" className="block aspect-[4/3] w-full bg-stone-100 bg-cover bg-center transition duration-300 group-hover:scale-[1.02]" style={imageStyle} />;
  }

  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-stone-100 text-center">
      <div>
        <span aria-hidden="true" className="text-4xl">🍽️</span>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-red-700">Foto em breve</p>
      </div>
    </div>
  );
}

async function loadPublicSite(restaurantSlug: string): Promise<PublicSitePayload | null> {
  const slug = normalizeSiteSlug(restaurantSlug);
  if (!slug) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_site_by_slug', { site_slug: slug });
  if (error || !data) return null;
  return data as PublicSitePayload;
}

function publicOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://mesafacil-restaurante.vercel.app';
}

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ restaurantSlug: string }>;
}>): Promise<Metadata> {
  const { restaurantSlug } = await params;
  const site = await loadPublicSite(restaurantSlug);
  if (!site) return { title: 'Restaurante não encontrado | MesaFácil' };
  return buildPublicSiteMetadata(site, publicOrigin());
}

export default async function PublicRestaurantSitePage({
  params,
}: Readonly<{
  params: Promise<{ restaurantSlug: string }>;
}>) {
  const { restaurantSlug } = await params;
  const site = await loadPublicSite(restaurantSlug);
  if (!site) notFound();

  const visibleCategories = site.categories.filter((category) => category.products.length > 0);
  const productsCount = visibleCategories.reduce((total, category) => total + category.products.length, 0);
  const productsWithImagesCount = visibleCategories.reduce(
    (total, category) => total + category.products.filter((product) => productImageStyle(product.image_url)).length,
    0,
  );
  const whatsappHref = getPublicSiteWhatsappHref(site.profile.whatsapp);
  const whatsappLabel = whatsappHref ? 'Chamar no WhatsApp' : (getPublicSiteContactLabel(site.profile.whatsapp) ?? 'Chamar no WhatsApp');
  const phoneHref = getPublicSiteContactHref(site.profile.phone);
  const instagramHref = getPublicSiteContactHref(site.profile.instagram);
  const primaryContact = whatsappHref ?? phoneHref ?? instagramHref;

  return (
    <main className="min-h-screen bg-[#fff8f1] text-stone-950">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.2),_transparent_30%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-6 pb-10 sm:px-5 sm:py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-6 lg:py-12">
          <header className="flex flex-col justify-center rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-2xl shadow-red-100/70 backdrop-blur sm:p-8 lg:p-10">
            <p className="inline-flex w-fit rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-red-700">MesaFácil • site público</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-stone-950 sm:text-6xl">{site.profile.display_name}</h1>
            <p className="mt-4 max-w-2xl text-lg font-bold leading-8 text-stone-700 sm:text-xl">{site.profile.headline ?? 'Restaurante com cardápio digital, contatos e informações em um só lugar.'}</p>
            {site.profile.description ? <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">{site.profile.description}</p> : null}

            <div className="mt-7 flex flex-wrap gap-3">
              {whatsappHref ? (
                <a href={whatsappHref} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#25d366] px-5 py-3 text-sm font-black text-white shadow-lg shadow-green-200 transition hover:-translate-y-0.5 hover:bg-[#1ebe5b]">
                  <span aria-hidden="true" className="text-lg">✆</span>
                  {whatsappLabel}
                </a>
              ) : primaryContact ? (
                <a href={primaryContact} className="inline-flex min-h-12 items-center rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-red-700">Entrar em contato</a>
              ) : null}
              {site.profile.show_menu ? <a href="#cardapio" className="inline-flex min-h-12 items-center rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50">Ver cardápio</a> : null}
            </div>
          </header>

          <aside className="grid content-start gap-4">
            <div className="rounded-[2rem] border border-white/70 bg-stone-950 p-5 text-white shadow-2xl shadow-stone-300/60 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-200">Resumo</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-3xl bg-white/10 p-4">
                  <strong className="block text-3xl font-black">{productsCount}</strong>
                  <span className="mt-1 block text-xs font-bold text-white/80">itens no cardápio</span>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <strong className="block text-3xl font-black">{productsWithImagesCount}</strong>
                  <span className="mt-1 block text-xs font-bold text-white/80">com foto</span>
                </div>
              </div>
              <div className="mt-4 rounded-3xl bg-white p-4 text-stone-950">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Localização</p>
                <p className="mt-2 text-sm font-bold leading-6">{site.profile.address_line ?? 'Endereço sob consulta'}</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto -mt-3 grid max-w-6xl gap-4 px-4 sm:px-5 md:grid-cols-3 lg:px-6">
        {site.profile.phone && phoneHref ? (
          <a href={phoneHref ?? undefined} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Telefone</p>
            <p className="mt-2 font-black text-stone-950">{site.profile.phone}</p>
          </a>
        ) : site.profile.phone ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Telefone</p>
            <p className="mt-2 font-black text-stone-950">{site.profile.phone}</p>
          </div>
        ) : null}
        {site.profile.whatsapp && whatsappHref ? (
          <a href={whatsappHref} className="rounded-3xl border border-green-200 bg-green-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700">WhatsApp</p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-2 text-sm font-black text-white"><span aria-hidden="true">✆</span>{whatsappLabel}</p>
          </a>
        ) : null}
        {site.profile.instagram && instagramHref ? (
          <a href={instagramHref ?? undefined} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Instagram</p>
            <p className="mt-2 break-all font-black text-stone-950">{site.profile.instagram}</p>
          </a>
        ) : site.profile.instagram ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Instagram</p>
            <p className="mt-2 break-all font-black text-stone-950">{site.profile.instagram}</p>
          </div>
        ) : null}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-7 sm:px-5 lg:px-6">
        {site.profile.show_menu ? (
          <section id="cardapio" className="space-y-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-red-700">Cardápio</p>
                <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Pratos em destaque</h2>
              </div>
              <p className="max-w-sm text-sm font-semibold leading-6 text-stone-500">Fotos, descrições e preços para o cliente decidir com mais confiança.</p>
            </div>

            {productsCount === 0 ? (
              <div className="rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-sm">
                <h3 className="text-2xl font-black">Cardápio em montagem</h3>
                <p className="mt-2 text-stone-500">Este restaurante ainda não publicou produtos nesta página.</p>
              </div>
            ) : (
              visibleCategories.map((category) => (
                <article key={category.name} className="rounded-[2rem] border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-2xl font-black">{category.name}</h3>
                      {category.description ? <p className="mt-1 text-sm leading-6 text-stone-500">{category.description}</p> : null}
                    </div>
                    <span className="w-fit rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-red-700">{category.products.length} itens</span>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {category.products.map((product) => (
                      <div key={product.public_code} className="group overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-200/80">
                        <PublicProductImage product={product} />
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-lg font-black leading-tight text-stone-950">{product.name}</h4>
                            <strong className="shrink-0 rounded-full bg-red-600 px-3 py-1 text-sm text-white shadow-sm">{money(product.price_cents)}</strong>
                          </div>
                          {product.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-500">{product.description}</p> : <p className="mt-2 text-sm leading-6 text-stone-400">Descrição em breve.</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            )}
          </section>
        ) : (
          <section className="rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black">Cardápio sob consulta</h2>
            <p className="mt-2 text-stone-500">Este restaurante optou por não exibir o cardápio público nesta página.</p>
          </section>
        )}

        <footer className="py-8 text-center text-xs text-stone-400">
          Site público MesaFácil • Para pedidos por mesa, use o QR Code do restaurante.
        </footer>
      </section>

      {whatsappHref ? (
        <a href={whatsappHref} aria-label="Chamar restaurante no WhatsApp" className="fixed bottom-5 right-5 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-[#25d366] text-3xl text-white shadow-2xl shadow-green-300 transition hover:-translate-y-1 hover:bg-[#1ebe5b]">
          <span aria-hidden="true">✆</span>
        </a>
      ) : null}
    </main>
  );
}
