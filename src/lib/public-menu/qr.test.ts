import { describe, expect, it } from 'vitest';
import { buildPublicMenuPath, normalizePublicSlug, validatePublicMenuParams } from './qr';

describe('public QR menu helpers', () => {
  it('normalizes restaurant names into safe public slugs', () => {
    expect(normalizePublicSlug('Restaurante São João & Cia')).toBe('restaurante-sao-joao-cia');
    expect(normalizePublicSlug('  Mesa  Fácil  ')).toBe('mesa-facil');
  });

  it('builds the public menu path from slug and QR token', () => {
    expect(buildPublicMenuPath('restaurante-sao-joao', '11111111-1111-4111-8111-111111111111')).toBe(
      '/r/restaurante-sao-joao/m/11111111-1111-4111-8111-111111111111',
    );
  });

  it('validates public route params before querying data', () => {
    expect(validatePublicMenuParams({ restaurantSlug: 'restaurante-sao-joao', qrToken: '11111111-1111-4111-8111-111111111111' })).toEqual({
      success: true,
      data: { restaurantSlug: 'restaurante-sao-joao', qrToken: '11111111-1111-4111-8111-111111111111' },
    });
    expect(validatePublicMenuParams({ restaurantSlug: '../admin', qrToken: 'bad' }).success).toBe(false);
  });
});
