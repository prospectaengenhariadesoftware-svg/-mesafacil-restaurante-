'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveTenant } from '@/lib/auth/context';
import { getNextOrderStatus, type OrderStatus } from '@/lib/domain/order';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/validation/auth';

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function fail(path: string, message: string): never {
  redirect(`${path}?erro=${encodeURIComponent(message)}`);
}

function requireOrderActionFields(formData: FormData) {
  const tenantId = getString(formData, 'tenantId');
  const orderId = getString(formData, 'orderId');
  const source = getString(formData, 'source') === 'cozinha' ? 'cozinha' : 'pedidos';
  const currentStatus = getString(formData, 'currentStatus') as OrderStatus;
  const mode = getString(formData, 'mode');
  const path = `/tenants/${tenantId}/${source}`;

  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  if (!isUuid(orderId)) fail(path, 'Pedido inválido.');
  return { tenantId, orderId, currentStatus, mode, path };
}

export async function advanceOrderStatusAction(formData: FormData) {
  const { tenantId, orderId, currentStatus, mode, path } = requireOrderActionFields(formData);
  await requireActiveTenant(tenantId);

  if (mode !== 'cancel' && getNextOrderStatus(currentStatus) === currentStatus) {
    fail(path, 'Pedido já está em status final.');
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('advance_tenant_customer_order_status', {
    target_tenant_id: tenantId,
    target_order_id: orderId,
    requested_status: mode === 'cancel' ? 'cancelled' : null,
  });

  if (error) fail(path, 'Não foi possível atualizar o pedido.');
  revalidatePath(`/tenants/${tenantId}/pedidos`);
  revalidatePath(`/tenants/${tenantId}/cozinha`);
  redirect(`${path}?mensagem=${encodeURIComponent('Status do pedido atualizado.')}`);
}
