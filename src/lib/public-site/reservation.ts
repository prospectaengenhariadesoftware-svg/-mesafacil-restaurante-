import { normalizeSiteSlug } from '../validation/public-site';

export type PublicReservationInput = {
  restaurantSlug: string;
  tableNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  partySize: string;
};

export type PublicReservationData = {
  restaurantSlug: string;
  tableNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  scheduledAt: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
};

export type PublicReservationValidationResult =
  | { success: true; data: PublicReservationData }
  | { success: false; error: string };


export type PublicReservationRpcError = {
  code?: string;
  message?: string;
} | null | undefined;

export const PUBLIC_RESERVATION_TABLE_BLOCKED_MESSAGE = 'Esta mesa já está reservada e só será liberada para nova reserva após o fechamento da conta.';

export function mapPublicReservationRpcError(error: PublicReservationRpcError): string {
  if (
    error?.code === '23505'
    || error?.message?.includes('Já existe reserva ativa')
    || error?.message?.includes('Mesa aguardando fechamento de conta')
  ) {
    return PUBLIC_RESERVATION_TABLE_BLOCKED_MESSAGE;
  }

  return 'Não foi possível reservar a mesa. Ela pode já estar reservada.';
}

const SAO_PAULO_OFFSET = '-03:00';

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function cleanDate(value: unknown): string {
  const date = cleanText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function cleanTime(value: unknown): string {
  const time = cleanText(value);
  return /^\d{2}:\d{2}$/.test(time) ? time : '';
}

export function normalizePublicReservationPhone(value: unknown): string {
  return cleanText(value).replace(/[^0-9+()\s.-]/g, '').slice(0, 32);
}

export function buildPublicReservationScheduledAt(date: string, time: string): string | null {
  const reservationDate = cleanDate(date);
  const reservationTime = cleanTime(time);
  if (!reservationDate || !reservationTime) return null;

  const scheduledAt = new Date(`${reservationDate}T${reservationTime}:00${SAO_PAULO_OFFSET}`);
  if (Number.isNaN(scheduledAt.getTime())) return null;
  return scheduledAt.toISOString();
}

export function formatReservationDateTimeForCustomer(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

export function validatePublicReservationInput(input: PublicReservationInput, now = new Date()): PublicReservationValidationResult {
  const restaurantSlug = normalizeSiteSlug(input.restaurantSlug);
  if (!restaurantSlug) return { success: false, error: 'Restaurante inválido para reserva.' };

  const tableNumber = cleanText(input.tableNumber).slice(0, 20);
  if (!tableNumber) return { success: false, error: 'Escolha a mesa para reservar.' };

  const reservationDate = cleanDate(input.reservationDate);
  const reservationTime = cleanTime(input.reservationTime);
  const scheduledAt = buildPublicReservationScheduledAt(reservationDate, reservationTime);
  if (!scheduledAt) return { success: false, error: 'Escolha data e horário da reserva.' };

  const scheduledDate = new Date(scheduledAt);
  if (scheduledDate.getUTCMinutes() !== 0 && scheduledDate.getUTCMinutes() !== 30) {
    return { success: false, error: 'Escolha um horário em intervalo de 30 minutos.' };
  }
  if (scheduledDate.getTime() < now.getTime() + 30 * 60 * 1000) {
    return { success: false, error: 'Escolha um horário com pelo menos 30 minutos de antecedência.' };
  }

  const partySize = Number.parseInt(cleanText(input.partySize), 10);
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 99) return { success: false, error: 'Informe a quantidade de pessoas.' };

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
      scheduledAt,
      reservationDate,
      reservationTime,
      partySize,
    },
  };
}

export type PublicReservationWhatsappDetails = {
  tableNumber?: string;
  reservationDate?: string;
  reservationTime?: string;
  partySize?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};

export function buildPublicReservationWhatsappHref(whatsappHref: string | null, details: PublicReservationWhatsappDetails | null, fallback: { mesa?: string; data?: string; pessoas?: string } = {}): string | null {
  if (!whatsappHref) return null;
  const table = details?.tableNumber || fallback.mesa || '';
  const dateTime = details?.reservationDate && details?.reservationTime
    ? `${details.reservationDate} às ${details.reservationTime}`
    : fallback.data || '';
  const partySize = details?.partySize || fallback.pessoas || '';
  const message = [
    'Olá! Acabei de fazer uma reserva pelo site MesaFácil.',
    table ? `Mesa: ${table}` : null,
    dateTime ? `Data e horário: ${dateTime}` : null,
    partySize ? `Pessoas: ${partySize}` : null,
    'Por favor, confirme o recebimento.',
  ].filter(Boolean).join('\n');

  try {
    const url = new URL(whatsappHref);
    const existingText = url.searchParams.get('text');
    url.searchParams.set('text', existingText ? `${existingText}\n\n${message}` : message);
    return url.toString();
  } catch {
    const separator = whatsappHref.includes('?') ? '&' : '?';
    return `${whatsappHref}${separator}text=${encodeURIComponent(message)}`;
  }
}

export function publicReservationFeedbackPath(restaurantSlug: string, params: Record<string, string>): string {
  const slug = normalizeSiteSlug(restaurantSlug);
  if (!slug) return '/';
  const query = new URLSearchParams(params);
  return `/r/${slug}${query.size ? `?${query.toString()}#reservas` : '#reservas'}`;
}
