import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildPublicSiteMetadata, getPublicSiteContactHref } from '@/lib/public-site/site';
import { createClient } from '@/lib/supabase/server';
import type { PublicSitePayload } from '@/lib/types/public-site';
import { normalizeSiteSlug } from '@/lib/validation/public-site';

function money(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
  const productsCount = site.categories.reduce((total, category) => total + category.products.length, 0);
  const whatsappHref = getPublicSiteContactHref(site.profile.whatsapp);
  const phoneHref = getPublicSiteContactHref(site.profile.phone);
  const instagramHref = getPublicSiteContactHref(site.profile.instagram);
  const primaryContact = whatsappHref ?? phoneHref ?? instagramHref;

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-stone-950">
      <section className="mx-auto max-w-6xl px-4 py-5 pb-12 sm:px-5 sm:py-7 lg:px-6">
        <header className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl shadow-stone-200/70">
          <div className="bg-gradient-to-br from-stone-950 via-red-800 to-red-600 px-5 py-10 text-white sm:px-8 sm:py-12">
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-white/90">MesaFácil</p>
            <div className="mt-5 max-w-3xl">
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">{site.profile.display_name}</h1>
              <p className="mt-4 text-lg font-semibold text-white/90 sm:text-xl">{site.profile.headline ?? 'Restaurante com cardápio digital MesaFácil.'}</p>
              {site.profile.description ? <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">{site.profile.description}</p> : null}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              {primaryContact ? <a href={primaryContact} className="rounded-full bg-white px-5 py-3 text-sm font-black text-red-700 shadow-sm">Entrar em contato</a> : null}
              {site.profile.show_menu ? <a href="#cardapio" className="rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur">Ver cardápio</a> : null}
            </div>
          </div>
          <div className="grid gap-3 px-5 py-4 text-sm text-stone-700 sm:grid-cols-3 sm:px-7">
            <div className="rounded-2xl bg-stone-50 p-3"><strong className="block text-stone-950">{productsCount}</strong> itens disponíveis</div>
            <div className="rounded-2xl bg-stone-50 p-3"><strong className="block text-stone-950">{site.profile.accepts_reservations ? 'Reservas por contato' : 'Atendimento local'}</strong> perfil comercial</div>
            <div className="rounded-2xl bg-stone-50 p-3"><strong className="block text-stone-950">{site.profile.address_line ?? 'Endereço sob consulta'}</strong> localização</div>
          </div>
        </header>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          {site.profile.phone ? <div className="rounded-3xl border border-stone-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">Telefone</p><p className="mt-2 font-black">{site.profile.phone}</p></div> : null}
          {site.profile.whatsapp ? <div className="rounded-3xl border border-stone-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">WhatsApp</p><p className="mt-2 break-all font-black">{site.profile.whatsapp}</p></div> : null}
          {site.profile.instagram ? <div className="rounded-3xl border border-stone-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">Instagram</p><p className="mt-2 break-all font-black">{site.profile.instagram}</p></div> : null}
        </section>

        {site.profile.show_menu ? (
          <section id="cardapio" className="mt-7 space-y-5">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">Cardápio</p>
              <h2 className="mt-1 text-3xl font-black">Itens disponíveis</h2>
            </div>
            {productsCount === 0 ? (
              <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
                <h3 className="text-2xl font-black">Cardápio em montagem</h3>
                <p className="mt-2 text-stone-500">Este restaurante ainda não publicou produtos nesta página.</p>
              </div>
            ) : (
              site.categories.filter((category) => category.products.length > 0).map((category) => (
                <article key={category.name} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                  <h3 className="text-2xl font-black">{category.name}</h3>
                  {category.description ? <p className="mt-1 text-sm text-stone-500">{category.description}</p> : null}
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {category.products.map((product) => (
                      <div key={product.public_code} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-black text-stone-950">{product.name}</h4>
                            {product.description ? <p className="mt-1 text-sm leading-6 text-stone-500">{product.description}</p> : null}
                          </div>
                          <strong className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-sm text-red-700">{money(product.price_cents)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            )}
          </section>
        ) : (
          <section className="mt-7 rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black">Cardápio sob consulta</h2>
            <p className="mt-2 text-stone-500">Este restaurante optou por não exibir o cardápio público nesta página.</p>
          </section>
        )}

        <footer className="py-8 text-center text-xs text-stone-400">
          Site público MesaFácil • Para pedidos por mesa, use o QR Code do restaurante.
        </footer>
      </section>
    </main>
  );
}
