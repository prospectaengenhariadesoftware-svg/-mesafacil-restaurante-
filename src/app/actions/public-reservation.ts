'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatReservationDateTimeForCustomer, publicReservationFeedbackPath, validatePublicReservationInput } from '@/lib/public-site/reservation';

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function createPublicReservationAction(formData: FormData) {
  const restaurantSlugInput = getString(formData, 'restaurantSlug');
  const validation = validatePublicReservationInput({
    restaurantSlug: restaurantSlugInput,
    tableNumber: getString(formData, 'tableNumber'),
    customerName: getString(formData, 'customerName'),
    customerEmail: getString(formData, 'customerEmail'),
    customerPhone: getString(formData, 'customerPhone'),
    reservationDate: getString(formData, 'reservationDate'),
    reservationTime: getString(formData, 'reservationTime'),
    partySize: getString(formData, 'partySize'),
  });

  if (!validation.success) {
    redirect(publicReservationFeedbackPath(restaurantSlugInput, { erroReserva: validation.error }));
  }

  const supabase = await createClient();
  const fingerprintSource = [
    validation.data.restaurantSlug,
    validation.data.customerEmail,
    validation.data.customerPhone.replace(/\D/g, ''),
    validation.data.scheduledAt,
  ].join('|');
  const requestFingerprint = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintSource))).toString('hex');
  const { data, error } = await supabase.rpc('create_public_table_reservation', {
    site_slug: validation.data.restaurantSlug,
    table_number_input: validation.data.tableNumber,
    customer_name_input: validation.data.customerName,
    customer_email_input: validation.data.customerEmail,
    customer_phone_input: validation.data.customerPhone,
    reservation_scheduled_at: validation.data.scheduledAt,
    reservation_party_size: validation.data.partySize,
    request_fingerprint: requestFingerprint,
  });

  if (error || !data) {
    redirect(publicReservationFeedbackPath(validation.data.restaurantSlug, { erroReserva: 'Não foi possível reservar a mesa. Ela pode já estar reservada.' }));
  }

  const payload = data as { table_number?: string; scheduled_at?: string };
  redirect(publicReservationFeedbackPath(validation.data.restaurantSlug, {
    reserva: 'ok',
    mesa: payload.table_number ?? validation.data.tableNumber,
    data: formatReservationDateTimeForCustomer(payload.scheduled_at ?? validation.data.scheduledAt),
  }));
}
