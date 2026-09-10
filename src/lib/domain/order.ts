export type OrderStatus =
  | 'received'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type CartItem = {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  notes?: string;
};

export type PublicOrderItemInput = {
  productId: string;
  quantity: number;
  notes?: string;
};

export function parsePublicOrderItems(fields: Record<string, string>): PublicOrderItemInput[] {
  const items: PublicOrderItemInput[] = [];

  for (const [key, rawQuantity] of Object.entries(fields)) {
    if (!key.startsWith('quantity:')) continue;
    const productId = key.replace('quantity:', '');
    const quantity = Number.parseInt(rawQuantity, 10);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    if (quantity > 99) throw new Error('Quantidade máxima por item é 99.');
    const rawNotes = fields[`notes:${productId}`]?.trim();
    items.push({ productId, quantity, ...(rawNotes ? { notes: rawNotes.slice(0, 200) } : {}) });
  }

  if (items.length === 0) throw new Error('Selecione pelo menos um produto.');
  return items;
}

export function calculateCartTotalCents(items: CartItem[]): number {
  return items.reduce((total, item) => {
    if (item.quantity <= 0) {
      throw new Error('quantity must be greater than zero');
    }

    if (item.unitPriceCents < 0) {
      throw new Error('unit price cannot be negative');
    }

    return total + item.unitPriceCents * item.quantity;
  }, 0);
}

export function formatCurrencyBRL(valueCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valueCents / 100);
}

export function createOrderNumber(sequence: number): string {
  return String(sequence).padStart(4, '0');
}

export function getNextOrderStatus(status: OrderStatus): OrderStatus {
  const transitions: Record<OrderStatus, OrderStatus> = {
    received: 'confirmed',
    confirmed: 'preparing',
    preparing: 'ready',
    ready: 'delivered',
    delivered: 'delivered',
    cancelled: 'cancelled',
  };

  return transitions[status];
}

export function getOrderStatusActionLabel(status: OrderStatus): string | null {
  const labels: Partial<Record<OrderStatus, string>> = {
    received: 'Confirmar pedido',
    confirmed: 'Enviar para cozinha',
    preparing: 'Marcar como pronto',
    ready: 'Marcar como entregue',
  };

  return labels[status] ?? null;
}

export function isFinalOrderStatus(status: OrderStatus): boolean {
  return status === 'delivered' || status === 'cancelled';
}

export function getKitchenVisibleStatuses(): OrderStatus[] {
  return ['confirmed', 'preparing', 'ready'];
}
