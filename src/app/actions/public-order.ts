'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parsePublicOrderItems } from '@/lib/domain/order';
import { validatePublicMenuParams } from '@/lib/public-menu/qr';

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?erro=${encodeURIComponent(message)}`);
}

export async function createPublicOrderAction(formData: FormData) {
  const restaurantSlug = String(formData.get('restaurantSlug') ?? '').trim();
  const qrToken = String(formData.get('qrToken') ?? '').trim();
  const validation = validatePublicMenuParams({ restaurantSlug, qrToken });
  if (!validation.success) redirect('/');

  const menuPath = `/r/${validation.data.restaurantSlug}/m/${validation.data.qrToken}`;
  const fields = Object.fromEntries([...formData.entries()].map(([key, value]) => [key, String(value)]));

  let items;
  try {
    items = parsePublicOrderItems(fields).map((item) => ({
      product_code: item.productId,
      quantity: item.quantity,
      ...(item.notes ? { notes: item.notes } : {}),
    }));
  } catch (error) {
    redirectWithError(menuPath, error instanceof Error ? error.message : 'Pedido inválido.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_public_order_by_qr', {
    menu_slug: validation.data.restaurantSlug,
    menu_qr_token: validation.data.qrToken,
    customer_name_input: String(formData.get('customerName') ?? '').trim(),
    customer_note_input: String(formData.get('customerNote') ?? '').trim(),
    order_items: items,
  });

  if (error || !data) {
    redirectWithError(menuPath, 'Não foi possível enviar o pedido. Confira os itens e tente novamente.');
  }

  const payload = data as { public_order_code?: string; table_number?: string; total_cents?: number };
  const query = new URLSearchParams({
    codigo: payload.public_order_code ?? '',
    mesa: payload.table_number ?? '',
    total: String(payload.total_cents ?? 0),
  });
  redirect(`/pedido-confirmado?${query.toString()}`);
}
