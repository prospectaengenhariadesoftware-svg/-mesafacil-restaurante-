import type { Metadata } from 'next';
import type { PublicSitePayload } from '@/lib/types/public-site';

export function publicSiteDescription(site: PublicSitePayload): string {
  return site.profile.description ?? `Conheça ${site.profile.display_name}, veja contatos e cardápio digital no MesaFácil.`;
}

export function getPublicSiteContactHref(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 10) return `tel:${digits}`;
  if (value.startsWith('@')) return `https://instagram.com/${value.slice(1)}`;
  return null;
}

export function getPublicSiteContactLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/wa\.me|whatsapp\.com/i.test(value)) return 'Chamar no WhatsApp';
  return value;
}

export function getPublicSiteWhatsappHref(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) return null;

  const digits = value.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const phone = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${phone}`;
}

export function productImageStyle(imageUrl: string | null | undefined): { backgroundImage: string } | undefined {
  if (!imageUrl) return undefined;
  if (/[\s"'()\\\u0000-\u001f\u007f]/.test(imageUrl)) return undefined;

  try {
    const url = new URL(imageUrl);
    if (url.protocol !== 'https:' || !url.hostname) return undefined;
    return { backgroundImage: `url(${JSON.stringify(url.href)})` };
  } catch {
    return undefined;
  }
}

export function buildPublicSiteUrl(origin: string, publicSlug: string): string {
  const safeOrigin = origin.replace(/\/+$/g, '');
  return `${safeOrigin}/r/${publicSlug}`;
}

export function buildPublicSiteMetadata(site: PublicSitePayload, origin: string): Metadata {
  const title = `${site.profile.display_name} | MesaFácil`;
  const description = publicSiteDescription(site);
  const url = buildPublicSiteUrl(origin, site.profile.public_slug);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'MesaFácil',
      type: 'website',
      locale: 'pt_BR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
