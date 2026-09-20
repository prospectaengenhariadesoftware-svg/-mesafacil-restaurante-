import { describe, expect, it } from 'vitest';
import { buildSafeRestaurantLogoName, MAX_RESTAURANT_LOGO_BYTES, validateOptionalRestaurantLogoFile, validateRestaurantLogoSignature } from './restaurant-logo';

function makeFile(name: string, type: string, size = 12): File {
  return new File([new Uint8Array(size)], name, { type });
}

const pngSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe('restaurant logo validation', () => {
  it('accepts png, jpg and webp logos within the size limit', () => {
    expect(validateOptionalRestaurantLogoFile(makeFile('logo.png', 'image/png')).success).toBe(true);
    expect(validateOptionalRestaurantLogoFile(makeFile('logo.jpg', 'image/jpeg')).success).toBe(true);
    expect(validateOptionalRestaurantLogoFile(makeFile('logo.webp', 'image/webp')).success).toBe(true);
  });

  it('rejects svg and oversized logos', () => {
    expect(validateOptionalRestaurantLogoFile(makeFile('logo.svg', 'image/svg+xml')).success).toBe(false);
    expect(validateOptionalRestaurantLogoFile(makeFile('logo.png', 'image/png', MAX_RESTAURANT_LOGO_BYTES + 1)).success).toBe(false);
  });

  it('checks file signatures beyond multipart mime type', async () => {
    await expect(validateRestaurantLogoSignature(new File([pngSignature], 'logo.png', { type: 'image/png' }))).resolves.toEqual({ success: true });
    await expect(validateRestaurantLogoSignature(new File([new Uint8Array([1, 2, 3, 4])], 'fake.png', { type: 'image/png' }))).resolves.toEqual({
      success: false,
      error: 'O conteúdo do arquivo não parece ser uma imagem PNG, JPG ou WEBP válida.',
    });
  });

  it('normalizes suspicious filenames without preserving path traversal', () => {
    const safeName = buildSafeRestaurantLogoName('../Minha Logo Oficial.svg', 'image/png');

    expect(safeName).toMatch(/^minha-logo-oficial-[a-z0-9]{12}\.png$/);
    expect(safeName).not.toContain('..');
    expect(safeName).not.toContain('/');
  });
});
