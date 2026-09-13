export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;

const ALLOWED_PRODUCT_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export type ProductImageValidationResult =
  | { success: true; data: File | null }
  | { success: false; error: string };

function extensionForMime(type: string): string {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  return 'png';
}

function randomSuffix(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID().replace(/-/g, '').slice(0, 12);
  return Math.random().toString(36).slice(2, 14).padEnd(12, '0');
}

function slugifyBaseName(originalName: string): string {
  const normalized = originalName
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/\.[^.]*$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return normalized || 'produto';
}

export function buildSafeProductImageName(originalName: string, type: string): string {
  const baseName = slugifyBaseName(originalName);
  return `${baseName}-${randomSuffix()}.${extensionForMime(type)}`;
}

export function validateOptionalProductImageFile(value: FormDataEntryValue | null | undefined): ProductImageValidationResult {
  if (!(value instanceof File)) return { success: true, data: null };
  if (!value.name && value.size === 0) return { success: true, data: null };

  if (!ALLOWED_PRODUCT_IMAGE_TYPES.has(value.type)) {
    return { success: false, error: 'Envie uma imagem PNG, JPG ou WEBP.' };
  }

  if (value.size <= 0) {
    return { success: false, error: 'Envie uma imagem válida.' };
  }

  if (value.size > MAX_PRODUCT_IMAGE_BYTES) {
    return { success: false, error: 'Imagem muito grande. Envie arquivo de até 2 MB.' };
  }

  return { success: true, data: value };
}
