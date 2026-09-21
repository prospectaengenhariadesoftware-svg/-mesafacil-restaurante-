'use server';

import { redirect } from 'next/navigation';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { TableReservationStatus } from '@/lib/types/catalog';
import { isUuid } from '@/lib/validation/auth';

const allowedStatus: TableReservationStatus[] = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function fail(path: string, message: string): never {
  redirect(`${path}?erro=${encodeURIComponent(message)}`);
}

export async function updateReservationStatusAction(formData: FormData) {
  const tenantId = getString(formData, 'tenantId');
  const reservationId = getString(formData, 'reservationId');
  const nextStatus = getString(formData, 'status') as TableReservationStatus;
  const returnTo = getString(formData, 'returnTo') || `/tenants/${tenantId}/reservas`;

  if (!isUuid(tenantId)) fail('/dashboard', 'Tenant inválido.');
  const path = returnTo.startsWith(`/tenants/${tenantId}/reservas`) ? returnTo : `/tenants/${tenantId}/reservas`;
  if (!isUuid(reservationId)) fail(path, 'Reserva inválida.');
  if (!allowedStatus.includes(nextStatus)) fail(path, 'Status inválido.');

  const membership = await requireActiveTenant(tenantId);
  if (!['owner', 'admin', 'manager'].includes(membership.role)) {
    fail(path, 'Apenas owner/admin/manager podem alterar reservas.');
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('update_table_reservation_status', {
    reservation_tenant_id: tenantId,
    reservation_id: reservationId,
    next_status: nextStatus,
  });

  if (error) fail(path, 'Não foi possível atualizar o status da reserva.');
  redirect(`${path}${path.includes('?') ? '&' : '?'}mensagem=${encodeURIComponent('Reserva atualizada.')}`);
}
