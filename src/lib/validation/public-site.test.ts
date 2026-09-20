import { describe, expect, it } from 'vitest';
import { normalizeSiteSlug, validatePublicSiteInput } from './public-site';

describe('normalizeSiteSlug', () => {
  it('normaliza acentos, espaços e símbolos para slug público seguro', () => {
    expect(normalizeSiteSlug(' Pizzaria São João!!! ')).toBe('pizzaria-sao-joao');
  });

  it('remove hífens duplicados e pontas', () => {
    expect(normalizeSiteSlug('---Burger   House---Centro---')).toBe('burger-house-centro');
  });
});

describe('validatePublicSiteInput', () => {
  it('aceita perfil público publicado com contatos opcionais normalizados', () => {
    const result = validatePublicSiteInput({
      displayName: 'Pizzaria Dona Maria',
      publicSlug: 'Pizzaria Dona Maria',
      headline: 'Pizza artesanal no forno a lenha',
      description: 'A melhor pizza da região com ingredientes frescos.',
      phone: '(11) 99999-0000',
      whatsapp: 'https://wa.me/5511999990000',
      instagram: '@pizzariadonamaria',
      addressLine: 'Rua Central, 123',
      isPublished: true,
      showMenu: true,
      acceptsReservations: false,
      acceptsOnlineOrders: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.publicSlug).toBe('pizzaria-dona-maria');
      expect(result.data.isPublished).toBe(true);
      expect(result.data.showMenu).toBe(true);
    }
  });

  it('rejeita slug curto/inválido e descrição excessiva', () => {
    expect(validatePublicSiteInput({ displayName: 'AB', publicSlug: 'x' }).ok).toBe(false);
    expect(validatePublicSiteInput({ displayName: 'Restaurante Teste', publicSlug: 'ok-slug', description: 'x'.repeat(1001) }).ok).toBe(false);
  });
});
