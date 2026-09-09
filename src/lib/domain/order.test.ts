import { describe, expect, it } from 'vitest';

import {
  calculateCartTotalCents,
  createOrderNumber,
  formatCurrencyBRL,
  getNextOrderStatus,
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
});
