import { describe, expect, it } from 'vitest';
import { buildPublicSiteMetadata, getPublicSiteContactHref, publicSiteDescription } from './site';
import type { PublicSitePayload } from '@/lib/types/public-site';

const site = {
  profile: {
    display_name: 'Tuus Restaurante',
    public_slug: 'tuus',
    headline: 'Comida brasileira no Canto do Forte',
    description: 'Almoço, jantar e cardápio digital com pratos da casa.',
    phone: '(13) 97403-8515',
    whatsapp: 'https://wa.me/13974038515',
    instagram: '@tuusrestaurante',
    address_line: 'Av. Mallet, 158 - Canto do Forte',
    show_menu: true,
    accepts_reservations: true,
    accepts_online_orders: false,
  },
  tenant: {
    name: 'Tuus',
    public_slug: 'tuus',
    status: 'active',
  },
  categories: [],
} satisfies PublicSitePayload;

describe('getPublicSiteContactHref', () => {
  it('preserva links HTTPS de WhatsApp', () => {
    expect(getPublicSiteContactHref('https://wa.me/13974038515')).toBe('https://wa.me/13974038515');
  });

  it('converte telefone com máscara para tel', () => {
    expect(getPublicSiteContactHref('(13) 97403-8515')).toBe('tel:13974038515');
  });

  it('converte @perfil em link do Instagram', () => {
    expect(getPublicSiteContactHref('@tuusrestaurante')).toBe('https://instagram.com/tuusrestaurante');
  });
});

describe('publicSiteDescription', () => {
  it('usa descrição pública quando disponível', () => {
    expect(publicSiteDescription(site)).toBe('Almoço, jantar e cardápio digital com pratos da casa.');
  });

  it('usa fallback comercial quando descrição está vazia', () => {
    const withoutDescription = { ...site, profile: { ...site.profile, description: null } } satisfies PublicSitePayload;
    expect(publicSiteDescription(withoutDescription)).toContain('Conheça Tuus Restaurante');
  });
});

describe('buildPublicSiteMetadata', () => {
  it('gera title, description e canonical para compartilhamento do site público', () => {
    const metadata = buildPublicSiteMetadata(site, 'https://mesafacil-restaurante.vercel.app');

    expect(metadata.title).toBe('Tuus Restaurante | MesaFácil');
    expect(metadata.description).toBe('Almoço, jantar e cardápio digital com pratos da casa.');
    expect(metadata.alternates?.canonical).toBe('https://mesafacil-restaurante.vercel.app/r/tuus');
    expect(metadata.openGraph?.url).toBe('https://mesafacil-restaurante.vercel.app/r/tuus');
    expect(metadata.openGraph).toMatchObject({ type: 'website' });
  });
});
