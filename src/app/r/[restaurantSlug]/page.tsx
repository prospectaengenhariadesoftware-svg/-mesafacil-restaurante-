import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createPublicReservationAction } from '@/app/actions/public-reservation';
import { buildPublicSiteMetadata, getPublicSiteContactHref, getPublicSiteWhatsappHref, productImageStyle, publicCategoryAnchorId } from '@/lib/public-site/site';
import { createClient } from '@/lib/supabase/server';
import type { PublicSitePayload, PublicSiteProduct, PublicSiteTable } from '@/lib/types/public-site';
import { normalizeSiteSlug } from '@/lib/validation/public-site';

function money(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function PublicProductImage({ product, priority = false }: Readonly<{ product: PublicSiteProduct; priority?: boolean }>) {
  const imageStyle = productImageStyle(product.image_url);
  const imageClassName = priority
    ? 'block h-full min-h-[220px] w-full bg-stone-100 bg-cover bg-center sm:min-h-[300px]'
    : 'block h-full min-h-[132px] w-full bg-stone-100 bg-cover bg-center transition duration-500 group-hover:scale-[1.03] sm:min-h-[180px]';

  if (imageStyle) {
    return <span aria-label={`Imagem de ${product.name}`} role="img" className={imageClassName} style={imageStyle} />;
  }

  return (
    <div className={`${imageClassName} flex items-center justify-center bg-gradient-to-br from-red-50 via-stone-50 to-stone-100 text-center`}>
      <div>
        <span aria-hidden="true" className={priority ? 'text-6xl' : 'text-4xl'}>🍽️</span>
        <p className="mt-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--brand)]">Foto em breve</p>
      </div>
    </div>
  );
}

function ContactTile({ label, value, href, icon }: Readonly<{ label: string; value: string; href?: string | null; icon: string }>) {
  const content = (
    <>
      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-red-50 text-lg text-[var(--brand)]">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[0.65rem] font-black uppercase tracking-[0.16em] text-stone-400">{label}</span>
        <span className="mt-1 block break-words text-sm font-black leading-5 text-stone-950">{value}</span>
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} className="flex min-h-16 items-center gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg">
        {content}
      </a>
    );
  }

  return <div className="flex min-h-16 items-center gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm">{content}</div>;
}

function ReservationSection({
  restaurantSlug,
  tables,
  feedback,
}: Readonly<{
  restaurantSlug: string;
  tables: PublicSiteTable[];
  feedback: { reserva?: string; mesa?: string; data?: string; erroReserva?: string };
}>) {
  const availableTables = tables.filter((table) => table.reservation_status !== 'reserved');

  return (
    <section id="reservas" className="mx-auto max-w-6xl px-4 pt-8 sm:px-5 sm:pt-10 lg:px-6">
      <div className="grid gap-5 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/70 lg:grid-cols-[0.9fr_1.1fr] lg:p-7">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--brand)]">Reservas</p>
          <h2 className="mt-2 text-[clamp(2rem,8vw,3.2rem)] font-black leading-none tracking-[-0.06em] text-stone-950">Reserve sua mesa</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-stone-500">Escolha mesa, data, horário e informe nome, e-mail e telefone. A solicitação cria um card na Central de Reservas do restaurante.</p>
          <div className="mt-5 grid gap-2 text-sm font-bold text-stone-700 sm:grid-cols-2">
            {tables.length > 0 ? tables.map((table) => (
              <div key={table.number} className={`rounded-2xl border p-3 ${table.reservation_status === 'reserved' ? 'border-red-100 bg-red-50 text-red-700' : 'border-green-100 bg-green-50 text-green-700'}`}>
                Mesa {table.number} · {table.seats} lugares{table.sector ? ` · ${table.sector}` : ''}
                <span className="block text-xs font-black uppercase tracking-[0.12em]">Sujeita à disponibilidade no horário escolhido</span>
              </div>
            )) : <p className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-stone-500">Nenhuma mesa ativa disponível para reserva pública.</p>}
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-stone-50 p-4 ring-1 ring-stone-200 sm:p-5">
          {feedback.reserva === 'ok' ? (
            <p className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-black text-green-700">Reserva recebida para a mesa {feedback.mesa ?? ''}{feedback.data ? ` em ${feedback.data}` : ''}. O restaurante já consegue acompanhar na Central de Reservas.</p>
          ) : null}
          {feedback.erroReserva ? (
            <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">{feedback.erroReserva}</p>
          ) : null}

          <form action={createPublicReservationAction} className="space-y-4">
            <input type="hidden" name="restaurantSlug" value={restaurantSlug} />
            <label className="block text-sm font-black text-stone-700">
              Mesa
              <select name="tableNumber" required disabled={availableTables.length === 0} className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 outline-none focus:border-red-500 disabled:opacity-60">
                <option value="">Escolha uma mesa livre</option>
                {availableTables.map((table) => <option key={table.number} value={table.number}>Mesa {table.number} · {table.seats} lugares{table.sector ? ` · ${table.sector}` : ''}</option>)}
              </select>
            </label>
            <label className="block text-sm font-black text-stone-700">
              Data
              <input name="reservationDate" required type="date" className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-black text-stone-700">
                Horário
                <input name="reservationTime" required type="time" step={1800} className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
              </label>
              <label className="block text-sm font-black text-stone-700">
                Pessoas
                <input name="partySize" required type="number" min={1} max={99} defaultValue={2} className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
              </label>
            </div>
            <label className="block text-sm font-black text-stone-700">
              Nome
              <input name="customerName" required minLength={2} maxLength={120} autoComplete="name" placeholder="Seu nome" className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
            </label>
            <label className="block text-sm font-black text-stone-700">
              E-mail
              <input name="customerEmail" required type="email" maxLength={160} autoComplete="email" placeholder="voce@email.com" className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
            </label>
            <label className="block text-sm font-black text-stone-700">
              Telefone
              <input name="customerPhone" required inputMode="tel" maxLength={32} autoComplete="tel" placeholder="(00) 00000-0000" className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
            </label>
            <button type="submit" disabled={availableTables.length === 0} className="mf-button-primary min-h-12 w-full rounded-2xl bg-[var(--brand)] px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20 transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60">Reservar mesa</button>
          </form>
        </div>
      </div>
    </section>
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
  searchParams,
}: Readonly<{
  params: Promise<{ restaurantSlug: string }>;
  searchParams: Promise<{ reserva?: string; mesa?: string; data?: string; erroReserva?: string }>;
}>) {
  const { restaurantSlug } = await params;
  const feedback = await searchParams;
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
    <main className="min-h-screen overflow-x-hidden bg-stone-50 pb-28 text-stone-950">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--brand)] text-lg font-black text-white shadow-lg shadow-red-600/20">M</div>
            <div className="min-w-0">
              <p className="truncate text-[0.65rem] font-black uppercase tracking-[0.18em] text-[var(--brand)]">MesaFácil</p>
              <p className="truncate text-sm font-black text-stone-950">{site.profile.display_name}</p>
            </div>
          </div>
          {whatsappHref ? (
            <a href={whatsappHref} className="mf-button-primary inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)] px-4 text-sm font-black text-white shadow-lg shadow-red-600/20 transition hover:bg-[var(--brand-dark)]">
              Pedir
            </a>
          ) : primaryContact ? (
            <a href={primaryContact} className="mf-button-primary inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)] px-4 text-sm font-black text-white shadow-lg shadow-red-600/20 transition hover:bg-[var(--brand-dark)]">
              Contato
            </a>
          ) : null}
        </div>
      </header>

      <section className="relative bg-white">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-br from-[var(--brand-dark)] via-[var(--brand)] to-red-700" />
        <div className="relative mx-auto grid max-w-6xl gap-5 px-4 pb-7 pt-5 sm:px-5 sm:pb-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:px-6 lg:pt-8">
          <div className="text-white lg:pb-6">
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] ring-1 ring-white/20">Site oficial do restaurante</p>
            <h1 className="mt-4 max-w-2xl break-words text-[clamp(2.45rem,13vw,5.8rem)] font-black leading-[0.92] tracking-[-0.07em] sm:mt-5">{site.profile.display_name}</h1>
            <p className="mt-4 max-w-xl text-base font-bold leading-7 text-white sm:text-xl sm:leading-8">{heroText}</p>
            {site.profile.description ? <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-white/90 sm:text-base sm:leading-7">{site.profile.description}</p> : null}

            <div className="mt-6 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
              {whatsappHref ? (
                <a href={whatsappHref} className="mf-button-secondary inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[var(--brand)] shadow-xl shadow-red-950/20 transition hover:-translate-y-0.5 sm:text-base">
                  <span aria-hidden="true">🛵</span>
                  Pedir pelo WhatsApp
                </a>
              ) : primaryContact ? (
                <a href={primaryContact} className="mf-button-secondary inline-flex min-h-13 items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-[var(--brand)] shadow-xl shadow-red-950/20 transition hover:-translate-y-0.5 sm:text-base">Entrar em contato</a>
              ) : null}
              {site.profile.show_menu ? <a href="#cardapio" className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-white/25 bg-white/15 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 sm:text-base">Ver cardápio</a> : null}
              {site.profile.accepts_reservations ? <a href="#reservas" className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-white/25 bg-white/15 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 sm:text-base">Reservar mesa</a> : null}
            </div>
          </div>

          <aside className="rounded-[2rem] bg-white p-2 shadow-2xl shadow-red-950/20 ring-1 ring-stone-200 sm:rounded-[2.5rem] sm:p-3">
            <div className="grid overflow-hidden rounded-[1.55rem] bg-stone-50 sm:rounded-[2rem] md:grid-cols-[1.12fr_0.88fr]">
              <div className="relative min-h-[220px] overflow-hidden">
                {featuredProduct ? <PublicProductImage product={featuredProduct} priority /> : <div className="flex h-full min-h-[240px] items-center justify-center bg-gradient-to-br from-red-50 via-stone-50 to-stone-100"><span aria-hidden="true" className="text-7xl">🍽️</span></div>}
                {featuredProduct ? <strong className="absolute bottom-4 right-4 rounded-2xl bg-white px-4 py-2 text-base font-black text-stone-950 shadow-xl">{money(featuredProduct.price_cents)}</strong> : null}
              </div>
              <div className="flex flex-col justify-between gap-5 p-5 sm:p-6">
                <div>
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--brand)]">Destaque do cardápio</p>
                  <h2 className="mt-2 break-words text-2xl font-black leading-tight tracking-[-0.04em] text-stone-950">{featuredProduct?.name ?? 'Cardápio digital'}</h2>
                  {featuredProduct?.description ? <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-stone-500">{featuredProduct.description}</p> : <p className="mt-2 text-sm font-medium leading-6 text-stone-500">Itens publicados pelo restaurante aparecem aqui com preço e contato.</p>}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[0.68rem] font-black sm:text-xs">
                  <div className="rounded-2xl bg-red-50 px-2 py-3 text-red-700"><span className="block text-xl text-[var(--brand)]">{productsCount}</span>itens</div>
                  <div className="rounded-2xl bg-stone-100 px-2 py-3 text-stone-700"><span className="block text-xl text-stone-950">{productsWithImagesCount}</span>fotos</div>
                  <div className="rounded-2xl bg-stone-100 px-2 py-3 text-stone-700"><span className="block text-xl text-stone-950">{visibleCategories.length}</span>seções</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-5 sm:px-5 lg:px-6">
        <div className="grid gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">
          <ContactTile label="Endereço" value={site.profile.address_line ?? 'Consulte o restaurante'} icon="📍" />
          {site.profile.phone ? <ContactTile label="Telefone" value={site.profile.phone} href={phoneHref} icon="☎" /> : null}
          {site.profile.instagram ? <ContactTile label="Instagram" value={site.profile.instagram} href={instagramHref} icon="◎" /> : null}
        </div>
      </section>

      {site.profile.accepts_reservations ? <ReservationSection restaurantSlug={restaurantSlug} tables={site.tables ?? []} feedback={feedback} /> : null}

      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-5 sm:pt-10 lg:px-6">
        {site.profile.show_menu ? (
          <section id="cardapio" className="space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--brand)]">Cardápio</p>
                <h2 className="mt-1 text-[clamp(2.05rem,9vw,3rem)] font-black leading-none tracking-[-0.06em] text-stone-950 sm:text-5xl">Escolha seu pedido</h2>
              </div>
              <p className="max-w-sm text-sm font-semibold leading-6 text-stone-500">Visual de aplicativo de comida: foto, nome, descrição e preço para decidir rápido.</p>
            </div>

            {visibleCategories.length > 0 ? (
              <div className="sticky top-[68px] z-20 -mx-4 overflow-x-auto border-y border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6">
                <div className="flex min-w-max gap-2">
                  {visibleCategories.map((category, index) => (
                    <a key={`${category.name}-${index}`} href={`#${publicCategoryAnchorId(category.name, index)}`} className="mf-button-secondary shrink-0 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[var(--brand)] shadow-sm ring-1 ring-stone-200 transition hover:bg-red-50 hover:ring-red-200">
                      {category.name}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {productsCount === 0 ? (
              <div className="rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-sm">
                <h3 className="text-2xl font-black">Cardápio em montagem</h3>
                <p className="mt-2 text-stone-500">Este restaurante ainda não publicou produtos nesta página.</p>
              </div>
            ) : (
              visibleCategories.map((category, categoryIndex) => (
                <article key={`${category.name}-${categoryIndex}`} id={publicCategoryAnchorId(category.name, categoryIndex)} className="scroll-mt-36 space-y-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-black tracking-[-0.04em] text-stone-950">{category.name}</h3>
                      {category.description ? <p className="mt-1 text-sm leading-6 text-stone-500">{category.description}</p> : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-red-700">{category.products.length} itens</span>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2 xl:gap-4">
                    {category.products.map((product) => (
                      <div key={product.public_code} className="group grid overflow-hidden rounded-[1.7rem] border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-xl min-[520px]:grid-cols-[152px_1fr] sm:min-[520px]:grid-cols-[190px_1fr]">
                        <div className="relative min-h-[132px] overflow-hidden bg-stone-100">
                          <PublicProductImage product={product} />
                        </div>
                        <div className="flex min-w-0 flex-col justify-between gap-4 p-4 sm:p-5">
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="break-words text-lg font-black leading-tight tracking-[-0.03em] text-stone-950 sm:text-xl">{product.name}</h4>
                              <strong className="shrink-0 rounded-2xl bg-red-50 px-3 py-2 text-sm font-black text-red-700">{money(product.price_cents)}</strong>
                            </div>
                            {product.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-500">{product.description}</p> : <p className="mt-2 text-sm leading-6 text-stone-400">Detalhes sob consulta.</p>}
                          </div>
                          {whatsappHref ? <a href={whatsappHref} className="mf-button-primary inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[var(--brand)] px-4 text-sm font-black text-white transition hover:bg-[var(--brand-dark)] sm:w-fit">Pedir este item</a> : null}
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

        <footer className="py-10 text-center text-xs font-semibold text-stone-400">
          Site público MesaFácil • Para pedidos por mesa, use o QR Code do restaurante.
        </footer>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-12px_40px_rgba(28,25,23,0.10)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md gap-2">
          {site.profile.show_menu ? <a href="#cardapio" className="mf-button-secondary inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-[var(--brand)] ring-1 ring-stone-200">Cardápio</a> : null}
          {site.profile.accepts_reservations ? <a href="#reservas" className="mf-button-secondary inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-[var(--brand)] ring-1 ring-stone-200">Reservar</a> : null}
          {whatsappHref ? (
            <a href={whatsappHref} aria-label="Chamar restaurante no WhatsApp" className="mf-button-primary inline-flex min-h-12 flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-4 text-sm font-black text-white shadow-lg shadow-red-600/20">
              <span aria-hidden="true">🛵</span>
              Pedir WhatsApp
            </a>
          ) : primaryContact ? (
            <a href={primaryContact} className="mf-button-primary inline-flex min-h-12 flex-[1.4] items-center justify-center rounded-2xl bg-[var(--brand)] px-4 text-sm font-black text-white shadow-lg shadow-red-600/20">Contato</a>
          ) : null}
        </div>
      </nav>

      {whatsappHref ? (
        <a href={whatsappHref} aria-label="Chamar restaurante no WhatsApp" className="mf-button-primary fixed bottom-5 right-5 z-30 hidden h-16 w-16 items-center justify-center rounded-full bg-[var(--brand)] text-2xl text-white shadow-2xl shadow-red-600/30 transition hover:-translate-y-1 hover:bg-[var(--brand-dark)] sm:inline-flex">
          <span aria-hidden="true">🛵</span>
        </a>
      ) : null}
    </main>
  );
}
