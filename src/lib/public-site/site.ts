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
