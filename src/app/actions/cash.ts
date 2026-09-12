'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { validateCashPaymentInput } from '@/lib/validation/cash';

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function fail(path: string, message: string): never {
  redirect(`${path}?erro=${encodeURIComponent(message)}`);
}

export async function closeCashPaymentAction(formData: FormData) {
  const tenantId = getString(formData, 'tenantId');
  const path = `/tenants/${tenantId}/caixa`;
  await requireActiveTenant(tenantId);

  const validation = validateCashPaymentInput({
    tenantId,
    tableId: getString(formData, 'tableId'),
    orderIds: formData.getAll('orderIds').map(String),
    paymentMethod: getString(formData, 'paymentMethod'),
    subtotalCents: Number(getString(formData, 'subtotalCents')),
    serviceFeePercent: getString(formData, 'serviceFeePercent'),
    discount: getString(formData, 'discount'),
    amountPaid: getString(formData, 'amountPaid'),
    notes: getString(formData, 'notes'),
  });

  if (validation.success === false) fail(path, validation.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc('close_tenant_cash_payment', {
    target_tenant_id: validation.data.tenantId,
    target_table_id: validation.data.tableId,
    target_order_ids: validation.data.orderIds,
    requested_payment_method: validation.data.paymentMethod,
    requested_discount_cents: validation.data.discountCents,
    requested_amount_paid_cents: validation.data.amountPaidCents,
    requested_notes: validation.data.notes,
  });

  if (error) fail(path, 'Não foi possível fechar a conta. Confira status, valores e se o pedido já foi pago.');

  revalidatePath(`/tenants/${tenantId}/caixa`);
  revalidatePath(`/tenants/${tenantId}/pedidos`);
  revalidatePath(`/tenants/${tenantId}/relatorios`);
  redirect(`${path}?mensagem=${encodeURIComponent('Conta fechada e pagamento registrado com segurança.')}`);
}
