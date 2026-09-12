export type OrderStatus =
  | 'received'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type CartItemAddon = {
  publicCode: string;
  name: string;
  priceDeltaCents: number;
};

export type CartItem = {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  notes?: string;
  selectedAddons?: CartItemAddon[];
};

export type PublicOrderItemInput = {
  productId: string;
  quantity: number;
  notes?: string;
  addonCodes?: string[];
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
    const addonCodes = Object.entries(fields)
      .filter(([addonKey, value]) => addonKey.startsWith(`addon:${productId}:`) && ['on', 'true', '1'].includes(value))
      .map(([addonKey]) => addonKey.replace(`addon:${productId}:`, ''))
      .filter((code, index, allCodes) => code.length > 0 && allCodes.indexOf(code) === index)
      .slice(0, 20);
    items.push({
      productId,
      quantity,
      ...(rawNotes ? { notes: rawNotes.slice(0, 200) } : {}),
      ...(addonCodes.length > 0 ? { addonCodes } : {}),
    });
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

    const addonsTotalCents = (item.selectedAddons ?? []).reduce((addonTotal, addon) => {
      if (addon.priceDeltaCents < 0) {
        throw new Error('add-on price cannot be negative');
      }
      return addonTotal + addon.priceDeltaCents;
    }, 0);

    return total + (item.unitPriceCents + addonsTotalCents) * item.quantity;
  }, 0);
}

export type CashSettlementInput = {
  subtotalCents: number;
  serviceFeePercent: number;
  discountCents: number;
  amountPaidCents: number;
};

export type CashSettlement = {
  subtotalCents: number;
  serviceFeeCents: number;
  discountCents: number;
  totalDueCents: number;
  amountPaidCents: number;
  changeCents: number;
  remainingCents: number;
  isFullyPaid: boolean;
};

export function calculateCashSettlement(input: CashSettlementInput): CashSettlement {
  if (input.subtotalCents <= 0) throw new Error('subtotal must be greater than zero');
  if (input.serviceFeePercent < 0 || input.serviceFeePercent > 100) throw new Error('service fee percent must be between 0 and 100');
  if (input.discountCents < 0) throw new Error('discount cannot be negative');
  if (input.amountPaidCents <= 0) throw new Error('amount paid must be greater than zero');

  const serviceFeeCents = Math.round(input.subtotalCents * (input.serviceFeePercent / 100));
  const totalDueCents = Math.max(0, input.subtotalCents + serviceFeeCents - input.discountCents);
  const changeCents = Math.max(0, input.amountPaidCents - totalDueCents);
  const remainingCents = Math.max(0, totalDueCents - input.amountPaidCents);

  return {
    subtotalCents: input.subtotalCents,
    serviceFeeCents,
    discountCents: input.discountCents,
    totalDueCents,
    amountPaidCents: input.amountPaidCents,
    changeCents,
    remainingCents,
    isFullyPaid: remainingCents === 0,
  };
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
