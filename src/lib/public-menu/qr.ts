import { isUuid } from '../validation/auth';

export type PublicMenuParams = {
  restaurantSlug: string;
  qrToken: string;
};

export type PublicMenuValidationResult =
  | { success: true; data: PublicMenuParams }
  | { success: false; error: string };

export function normalizePublicSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80) || 'restaurante';
}

export function buildPublicMenuPath(restaurantSlug: string, qrToken: string): string {
  return `/r/${normalizePublicSlug(restaurantSlug)}/m/${qrToken}`;
}

export function validatePublicMenuParams(input: Record<string, unknown>): PublicMenuValidationResult {
  const restaurantSlug = typeof input.restaurantSlug === 'string' ? input.restaurantSlug.trim() : '';
  const qrToken = typeof input.qrToken === 'string' ? input.qrToken.trim() : '';

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(restaurantSlug) || restaurantSlug.length > 80) {
    return { success: false, error: 'Restaurante inválido.' };
  }
  if (!isUuid(qrToken)) return { success: false, error: 'Mesa inválida.' };

  return { success: true, data: { restaurantSlug, qrToken } };
}
