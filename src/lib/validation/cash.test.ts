import { describe, expect, it } from 'vitest';

import { validateCashPaymentInput } from './cash';

const tenantId = '11111111-1111-4111-8111-111111111111';
const tableId = '22222222-2222-4222-8222-222222222222';

describe('cash payment validation', () => {
  it('normalizes a full pix payment with service fee and discount', () => {
    expect(validateCashPaymentInput({
      tenantId,
      tableId,
      paymentMethod: 'pix',
      orderIds: [
        '33333333-3333-4333-8333-333333333333',
        '44444444-4444-4444-8444-444444444444',
      ],
      subtotalCents: 10000,
      serviceFeePercent: '10',
      discount: '5,00',
      amountPaid: '105,00',
      notes: ' pagamento via QR ',
    })).toEqual({
      success: true,
      data: {
        tenantId,
        tableId,
        orderIds: [
          '33333333-3333-4333-8333-333333333333',
          '44444444-4444-4444-8444-444444444444',
        ],
        paymentMethod: 'pix',
        subtotalCents: 10000,
        serviceFeePercent: 10,
        discountCents: 500,
        amountPaidCents: 10500,
        notes: 'pagamento via QR',
      },
    });
  });

  it('rejects empty order selection and invalid payment method', () => {
    expect(validateCashPaymentInput({ tenantId, tableId, orderIds: [], paymentMethod: 'barter', subtotalCents: 1000, amountPaid: '10,00' }).success).toBe(false);
    expect(validateCashPaymentInput({ tenantId, tableId, orderIds: [tenantId], paymentMethod: 'money', subtotalCents: 1000, amountPaid: '0,00' }).success).toBe(false);
  });
});
