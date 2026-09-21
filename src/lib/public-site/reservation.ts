import { normalizeSiteSlug } from '../validation/public-site';

export type PublicReservationInput = {
  restaurantSlug: string;
  tableNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

export type PublicReservationData = {
  restaurantSlug: string;
  tableNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

export type PublicReservationValidationResult =
  | { success: true; data: PublicReservationData }
  | { success: false; error: string };

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function normalizePublicReservationPhone(value: unknown): string {
  return cleanText(value).replace(/[^0-9+()\s.-]/g, '').slice(0, 32);
}

export function validatePublicReservationInput(input: PublicReservationInput): PublicReservationValidationResult {
  const restaurantSlug = normalizeSiteSlug(input.restaurantSlug);
  if (!restaurantSlug) return { success: false, error: 'Restaurante inválido para reserva.' };

  const tableNumber = cleanText(input.tableNumber).slice(0, 20);
  if (!tableNumber) return { success: false, error: 'Escolha a mesa para reservar.' };

  const customerName = cleanText(input.customerName).slice(0, 120);
  if (customerName.length < 2) return { success: false, error: 'Informe seu nome completo.' };

  const customerEmail = cleanText(input.customerEmail).toLowerCase().slice(0, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) return { success: false, error: 'Informe um e-mail válido.' };

  const customerPhone = normalizePublicReservationPhone(input.customerPhone);
  const phoneDigits = customerPhone.replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 15) return { success: false, error: 'Informe um telefone com DDD.' };

  return {
    success: true,
    data: {
      restaurantSlug,
      tableNumber,
      customerName,
      customerEmail,
      customerPhone,
    },
  };
}

export function publicReservationFeedbackPath(restaurantSlug: string, params: Record<string, string>): string {
  const slug = normalizeSiteSlug(restaurantSlug);
  if (!slug) return '/';
  const query = new URLSearchParams(params);
  return `/r/${slug}${query.size ? `?${query.toString()}#reservas` : '#reservas'}`;
}
