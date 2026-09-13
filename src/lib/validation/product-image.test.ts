import { describe, expect, it } from 'vitest';
import {
  MAX_PRODUCT_IMAGE_BYTES,
  buildSafeProductImageName,
  validateOptionalProductImageFile,
} from './product-image';

function file(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('validateOptionalProductImageFile', () => {
  it('accepts png, jpeg and webp images within the size limit', () => {
    for (const mime of ['image/png', 'image/jpeg', 'image/webp']) {
      const result = validateOptionalProductImageFile(file('produto.png', mime, 32));

      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({ type: mime, size: 32 }),
      });
    }
  });

  it('treats missing or empty form file as no image change', () => {
    expect(validateOptionalProductImageFile(null)).toEqual({ success: true, data: null });
    expect(validateOptionalProductImageFile(undefined)).toEqual({ success: true, data: null });
    expect(validateOptionalProductImageFile(file('', 'application/octet-stream', 0))).toEqual({ success: true, data: null });
  });

  it('rejects unsupported image types and oversized files', () => {
    expect(validateOptionalProductImageFile(file('script.svg', 'image/svg+xml', 32))).toEqual({
      success: false,
      error: 'Envie uma imagem PNG, JPG ou WEBP.',
    });
    expect(validateOptionalProductImageFile(file('readme.txt', 'text/plain', 32))).toEqual({
      success: false,
      error: 'Envie uma imagem PNG, JPG ou WEBP.',
    });
    expect(validateOptionalProductImageFile(file('grande.png', 'image/png', MAX_PRODUCT_IMAGE_BYTES + 1))).toEqual({
      success: false,
      error: 'Imagem muito grande. Envie arquivo de até 2 MB.',
    });
  });

  it('builds safe file names without path traversal or unsafe characters', () => {
    expect(buildSafeProductImageName('../Café especial ção.PNG', 'image/png')).toMatch(/^cafe-especial-cao-[a-z0-9]{12}\.png$/);
    expect(buildSafeProductImageName('..\\segredo.webp', 'image/webp')).toMatch(/^segredo-[a-z0-9]{12}\.webp$/);
    expect(buildSafeProductImageName('###', 'image/jpeg')).toMatch(/^produto-[a-z0-9]{12}\.jpg$/);
  });
});
