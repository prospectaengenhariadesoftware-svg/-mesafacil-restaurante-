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
