import { describe, expect, it } from 'vitest';

import {
  calculateCartTotalCents,
  createOrderNumber,
  formatCurrencyBRL,
  getKitchenVisibleStatuses,
  getNextOrderStatus,
  getOrderStatusActionLabel,
  isFinalOrderStatus,
  parsePublicOrderItems,
} from './order';

describe('order domain rules', () => {
  it('calculates cart total in cents using quantity and unit price snapshots', () => {
    const total = calculateCartTotalCents([
      { productId: 'burger', productName: 'Burger', unitPriceCents: 2990, quantity: 2 },
      { productId: 'juice', productName: 'Suco', unitPriceCents: 900, quantity: 1 },
    ]);

    expect(total).toBe(6880);
  });

  it('rejects zero or negative item quantity', () => {
    expect(() =>
      calculateCartTotalCents([
        { productId: 'burger', productName: 'Burger', unitPriceCents: 2990, quantity: 0 },
      ]),
    ).toThrow('quantity must be greater than zero');
  });

  it('formats cents as Brazilian currency', () => {
    expect(formatCurrencyBRL(6880)).toBe('R$ 68,80');
  });

  it('creates human friendly order numbers padded to four digits', () => {
    expect(createOrderNumber(7)).toBe('0007');
    expect(createOrderNumber(128)).toBe('0128');
  });

  it('moves orders through the MVP operational flow', () => {
    expect(getNextOrderStatus('received')).toBe('confirmed');
    expect(getNextOrderStatus('confirmed')).toBe('preparing');
    expect(getNextOrderStatus('preparing')).toBe('ready');
    expect(getNextOrderStatus('ready')).toBe('delivered');
    expect(getNextOrderStatus('delivered')).toBe('delivered');
  });

  it('labels the next operational action for active statuses', () => {
    expect(getOrderStatusActionLabel('received')).toBe('Confirmar pedido');
    expect(getOrderStatusActionLabel('confirmed')).toBe('Enviar para cozinha');
    expect(getOrderStatusActionLabel('preparing')).toBe('Marcar como pronto');
    expect(getOrderStatusActionLabel('ready')).toBe('Marcar como entregue');
    expect(getOrderStatusActionLabel('delivered')).toBeNull();
    expect(getOrderStatusActionLabel('cancelled')).toBeNull();
  });

  it('knows which order statuses are final and which belong to the kitchen queue', () => {
    expect(isFinalOrderStatus('delivered')).toBe(true);
    expect(isFinalOrderStatus('cancelled')).toBe(true);
    expect(isFinalOrderStatus('preparing')).toBe(false);
    expect(getKitchenVisibleStatuses()).toEqual(['confirmed', 'preparing', 'ready']);
  });

  it('does not advance cancelled orders', () => {
    expect(getNextOrderStatus('cancelled')).toBe('cancelled');
    expect(getOrderStatusActionLabel('cancelled')).toBeNull();
  });

  it('parses public order item quantities from form fields', () => {
    const items = parsePublicOrderItems({
      'quantity:11111111-1111-4111-8111-111111111111': '2',
      'quantity:22222222-2222-4222-8222-222222222222': '0',
      'notes:11111111-1111-4111-8111-111111111111': 'Sem cebola',
    });

    expect(items).toEqual([
      { productId: '11111111-1111-4111-8111-111111111111', quantity: 2, notes: 'Sem cebola' },
    ]);
  });

  it('rejects public orders without selected products', () => {
    expect(() => parsePublicOrderItems({
      'quantity:11111111-1111-4111-8111-111111111111': '0',
    })).toThrow('Selecione pelo menos um produto.');
  });
});
