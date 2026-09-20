export const MAX_RESTAURANT_LOGO_BYTES = 1024 * 1024;

const ALLOWED_RESTAURANT_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export type RestaurantLogoValidationResult =
  | { success: true; data: File | null }
  | { success: false; error: string };

export type RestaurantLogoSignatureValidationResult =
  | { success: true }
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

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return Array.from(bytes.slice(start, end), (byte) => String.fromCharCode(byte)).join('');
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
    .slice(0, 48);

  return normalized || 'logo-restaurante';
}

export function buildSafeRestaurantLogoName(originalName: string, type: string): string {
  const baseName = slugifyBaseName(originalName);
  return `${baseName}-${randomSuffix()}.${extensionForMime(type)}`;
}

export function validateOptionalRestaurantLogoFile(value: FormDataEntryValue | null | undefined): RestaurantLogoValidationResult {
  if (!(value instanceof File)) return { success: true, data: null };
  if (!value.name && value.size === 0) return { success: true, data: null };

  if (!ALLOWED_RESTAURANT_LOGO_TYPES.has(value.type)) {
    return { success: false, error: 'Envie uma logo PNG, JPG ou WEBP.' };
  }

  if (value.size <= 0) {
    return { success: false, error: 'Envie uma logo válida.' };
  }

  if (value.size > MAX_RESTAURANT_LOGO_BYTES) {
    return { success: false, error: 'Logo muito grande. Envie arquivo de até 1 MB.' };
  }

  return { success: true, data: value };
}

export async function validateRestaurantLogoSignature(file: File): Promise<RestaurantLogoSignatureValidationResult> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const isPng = file.type === 'image/png'
    && bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a;
  const isJpeg = file.type === 'image/jpeg'
    && bytes.length >= 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff;
  const isWebp = file.type === 'image/webp'
    && bytes.length >= 12
    && ascii(bytes, 0, 4) === 'RIFF'
    && ascii(bytes, 8, 12) === 'WEBP';

  if (isPng || isJpeg || isWebp) return { success: true };
  return { success: false, error: 'O conteúdo do arquivo não parece ser uma imagem PNG, JPG ou WEBP válida.' };
}
