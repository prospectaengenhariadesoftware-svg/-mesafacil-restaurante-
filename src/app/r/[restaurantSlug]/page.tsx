import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildPublicSiteMetadata, getPublicSiteContactHref, getPublicSiteWhatsappHref, productImageStyle, publicCategoryAnchorId } from '@/lib/public-site/site';
import { createClient } from '@/lib/supabase/server';
import type { PublicSitePayload, PublicSiteProduct } from '@/lib/types/public-site';
import { normalizeSiteSlug } from '@/lib/validation/public-site';

function money(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function PublicProductImage({ product, priority = false }: Readonly<{ product: PublicSiteProduct; priority?: boolean }>) {
  const imageStyle = productImageStyle(product.image_url);
  if (imageStyle) {
    return (
      <span
        aria-label={`Imagem de ${product.name}`}
        role="img"
        className={priority ? 'block aspect-[16/10] w-full bg-stone-100 bg-cover bg-center sm:aspect-[1.05/1]' : 'block aspect-[4/3] w-full bg-stone-100 bg-cover bg-center transition duration-500 group-hover:scale-[1.04]'}
        style={imageStyle}
      />
    );
  }

  return (
    <div className={priority ? 'flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-amber-100 text-center sm:aspect-[1.05/1]' : 'flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-amber-100 text-center'}>
      <div>
        <span aria-hidden="true" className={priority ? 'text-6xl' : 'text-4xl'}>🍽️</span>
        <p className="mt-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-700">Foto em breve</p>
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
  const products = visibleCategories.flatMap((category) => category.products);
  const productsCount = products.length;
  const productsWithImagesCount = products.filter((product) => productImageStyle(product.image_url)).length;
  const featuredProduct = products.find((product) => productImageStyle(product.image_url)) ?? products[0] ?? null;
  const whatsappHref = getPublicSiteWhatsappHref(site.profile.whatsapp);
  const phoneHref = getPublicSiteContactHref(site.profile.phone);
  const instagramHref = getPublicSiteContactHref(site.profile.instagram);
  const primaryContact = whatsappHref ?? phoneHref ?? instagramHref;
  const heroText = site.profile.headline ?? 'Cardápio digital com fotos, preços e contato direto do restaurante.';

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fffaf5] text-[#241f1c]">
      <section className="relative overflow-hidden bg-[#ff385c] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(255,255,255,0.32),transparent_26%),radial-gradient(circle_at_90%_5%,rgba(255,184,107,0.45),transparent_28%),linear-gradient(135deg,#ff385c_0%,#f04438_46%,#b42318_100%)]" />
        <div className="absolute -bottom-16 left-0 right-0 h-32 rounded-t-[100%] bg-[#fffaf5]" />

        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-4 sm:px-5 sm:pb-16 lg:px-6 lg:pb-20">
          <nav className="flex items-center justify-between gap-3 rounded-full border border-white/20 bg-white/15 px-3 py-2.5 text-[0.64rem] font-black uppercase tracking-[0.12em] shadow-2xl shadow-red-950/10 backdrop-blur sm:px-4 sm:py-3 sm:text-xs sm:tracking-[0.18em]">
            <span>MesaFácil</span>
            {site.profile.show_menu ? <a href="#cardapio" className="rounded-full bg-white px-3 py-2 text-[#e00b41]">Ver cardápio</a> : null}
          </nav>

          <div className="mt-7 grid items-end gap-6 sm:mt-9 lg:grid-cols-[0.98fr_1.02fr] lg:gap-8">
            <header className="pb-2">
              <p className="inline-flex max-w-full rounded-full bg-white/18 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-white shadow-sm ring-1 ring-white/20 sm:text-[0.68rem] sm:tracking-[0.22em]">Site oficial do restaurante</p>
              <h1 className="mt-4 max-w-3xl break-words text-[clamp(2.65rem,15vw,5rem)] font-black leading-[0.92] tracking-[-0.07em] sm:mt-5 sm:text-[clamp(4.5rem,10vw,7rem)] lg:text-8xl">{site.profile.display_name}</h1>
              <p className="mt-4 max-w-xl text-base font-bold leading-7 text-white sm:mt-5 sm:text-xl sm:leading-8">{heroText}</p>
              {site.profile.description ? <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-white/90 sm:text-base">{site.profile.description}</p> : null}

              <div className="mt-6 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap sm:mt-7">
                {whatsappHref ? (
                  <a href={whatsappHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#222222] px-5 py-3 text-sm font-black text-white shadow-2xl shadow-red-950/25 transition hover:-translate-y-0.5 hover:bg-black sm:min-h-14 sm:px-6 sm:py-4 sm:text-base">
                    <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-[#25d366] text-white">✆</span>
                    Chamar no WhatsApp
                  </a>
                ) : primaryContact ? (
                  <a href={primaryContact} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#222222] px-5 py-3 text-sm font-black text-white shadow-2xl shadow-red-950/25 transition hover:-translate-y-0.5 hover:bg-black sm:min-h-14 sm:px-6 sm:py-4 sm:text-base">Entrar em contato</a>
                ) : null}
                {site.profile.show_menu ? <a href="#cardapio" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-[#e00b41] shadow-xl shadow-red-950/10 transition hover:-translate-y-0.5 sm:min-h-14 sm:px-6 sm:py-4 sm:text-base">Explorar cardápio</a> : null}
              </div>
            </header>

            <aside className="relative mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none">
              <div className="absolute -left-4 top-10 hidden h-24 w-24 rounded-[2rem] bg-white/15 blur-sm sm:block" />
              <div className="relative overflow-hidden rounded-[2rem] bg-white p-3 text-[#222222] shadow-[0_24px_80px_rgba(88,28,12,0.32)] ring-1 ring-black/5 sm:rounded-[2.5rem] sm:p-4">
                {featuredProduct ? (
                  <div className="overflow-hidden rounded-[1.55rem] sm:rounded-[2rem]">
                    <PublicProductImage product={featuredProduct} priority />
                  </div>
                ) : (
                  <div className="flex aspect-[1.05/1] items-center justify-center rounded-[1.55rem] bg-gradient-to-br from-red-50 via-orange-50 to-amber-100 sm:rounded-[2rem]">
                    <span aria-hidden="true" className="text-7xl">🍽️</span>
                  </div>
                )}
                <div className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#ff385c]">Destaque do cardápio</p>
                      <h2 className="mt-1 break-words text-xl font-black tracking-[-0.04em] sm:text-2xl">{featuredProduct?.name ?? 'Cardápio digital'}</h2>
                    </div>
                    {featuredProduct ? <strong className="shrink-0 rounded-full bg-[#222222] px-3 py-2 text-xs text-white sm:text-sm">{money(featuredProduct.price_cents)}</strong> : null}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[0.68rem] font-black sm:text-xs">
                    <div className="rounded-2xl bg-[#fff1f2] px-2 py-3 text-[#be123c]"><span className="block text-xl">{productsCount}</span>itens</div>
                    <div className="rounded-2xl bg-[#fff7ed] px-2 py-3 text-[#c2410c]"><span className="block text-xl">{productsWithImagesCount}</span>fotos</div>
                    <div className="rounded-2xl bg-[#f5f5f4] px-2 py-3 text-stone-700"><span className="block text-xl">{visibleCategories.length}</span>seções</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-6 max-w-6xl px-4 sm:-mt-8 sm:px-5 lg:px-6">
        <div className="grid gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-[1.6rem] border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(34,34,34,0.08)]">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-stone-400">Endereço</p>
            <p className="mt-2 text-sm font-bold leading-6 text-stone-900">{site.profile.address_line ?? 'Consulte o restaurante'}</p>
          </div>
          {site.profile.phone ? (
            phoneHref ? (
              <a href={phoneHref} className="rounded-[1.6rem] border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(34,34,34,0.08)] transition hover:-translate-y-0.5">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-stone-400">Telefone</p>
                <p className="mt-2 text-sm font-black text-stone-900">{site.profile.phone}</p>
              </a>
            ) : (
              <div className="rounded-[1.6rem] border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(34,34,34,0.08)]">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-stone-400">Telefone</p>
                <p className="mt-2 text-sm font-black text-stone-900">{site.profile.phone}</p>
              </div>
            )
          ) : null}
          {site.profile.instagram ? (
            instagramHref ? (
              <a href={instagramHref} className="rounded-[1.6rem] border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(34,34,34,0.08)] transition hover:-translate-y-0.5">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-stone-400">Instagram</p>
                <p className="mt-2 break-all text-sm font-black text-stone-900">{site.profile.instagram}</p>
              </a>
            ) : (
              <div className="rounded-[1.6rem] border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(34,34,34,0.08)]">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-stone-400">Instagram</p>
                <p className="mt-2 break-all text-sm font-black text-stone-900">{site.profile.instagram}</p>
              </div>
            )
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-5 sm:pt-10 lg:px-6">
        {site.profile.show_menu ? (
          <section id="cardapio" className="space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff385c]">Cardápio</p>
                <h2 className="mt-1 text-[clamp(2.2rem,10vw,3.2rem)] font-black leading-none tracking-[-0.06em] text-[#222222] sm:text-5xl">Escolha pelo visual</h2>
              </div>
              <p className="max-w-sm text-sm font-semibold leading-6 text-stone-500">Fotos grandes, preço claro e contato sempre à mão para facilitar a decisão do cliente.</p>
            </div>

            {visibleCategories.length > 0 ? (
              <div className="sticky top-0 z-10 -mx-4 overflow-x-auto border-y border-black/5 bg-[#fffaf5]/92 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6">
                <div className="flex min-w-max gap-2">
                  {visibleCategories.map((category, index) => (
                    <a key={`${category.name}-${index}`} href={`#${publicCategoryAnchorId(category.name, index)}`} className="shrink-0 rounded-full bg-white px-4 py-3 text-sm font-black text-[#222222] shadow-sm ring-1 ring-black/5 transition hover:bg-[#ff385c] hover:text-white">
                      {category.name}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {productsCount === 0 ? (
              <div className="rounded-[2rem] border border-black/5 bg-white p-8 text-center shadow-[0_8px_30px_rgba(34,34,34,0.08)]">
                <h3 className="text-2xl font-black">Cardápio em montagem</h3>
                <p className="mt-2 text-stone-500">Este restaurante ainda não publicou produtos nesta página.</p>
              </div>
            ) : (
              visibleCategories.map((category, categoryIndex) => (
                <article key={`${category.name}-${categoryIndex}`} id={publicCategoryAnchorId(category.name, categoryIndex)} className="scroll-mt-20 space-y-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-black tracking-[-0.04em] text-[#222222]">{category.name}</h3>
                      {category.description ? <p className="mt-1 text-sm leading-6 text-stone-500">{category.description}</p> : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-[#fff1f2] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#be123c]">{category.products.length} itens</span>
                  </div>

                  <div className="grid gap-4 min-[560px]:grid-cols-2 lg:gap-5 xl:grid-cols-3">
                    {category.products.map((product) => (
                      <div key={product.public_code} className="group overflow-hidden rounded-[1.8rem] bg-white shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.10)_0px_4px_14px] ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(34,34,34,0.16)]">
                        <div className="relative overflow-hidden">
                          <PublicProductImage product={product} />
                          <strong className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-2 text-sm font-black text-[#222222] shadow-lg">{money(product.price_cents)}</strong>
                        </div>
                        <div className="p-4 sm:p-5">
                          <h4 className="break-words text-lg font-black leading-tight tracking-[-0.03em] text-[#222222] sm:text-xl">{product.name}</h4>
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
          <section className="rounded-[2rem] border border-black/5 bg-white p-8 text-center shadow-[0_8px_30px_rgba(34,34,34,0.08)]">
            <h2 className="text-2xl font-black">Cardápio sob consulta</h2>
            <p className="mt-2 text-stone-500">Este restaurante optou por não exibir o cardápio público nesta página.</p>
          </section>
        )}

        <footer className="py-10 text-center text-xs font-semibold text-stone-400">
          Site público MesaFácil • Para pedidos por mesa, use o QR Code do restaurante.
        </footer>
      </section>

      {whatsappHref ? (
        <a href={whatsappHref} aria-label="Chamar restaurante no WhatsApp" className="fixed bottom-4 left-4 right-4 z-20 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#25d366] px-5 py-3 text-base font-black text-white shadow-2xl shadow-green-400/40 transition hover:-translate-y-1 hover:bg-[#1ebe5b] sm:left-auto sm:right-5 sm:h-16 sm:w-16 sm:px-0 sm:text-3xl">
          <span aria-hidden="true">✆</span>
          <span className="sm:hidden">Chamar no WhatsApp</span>
        </a>
      ) : null}
    </main>
  );
}
