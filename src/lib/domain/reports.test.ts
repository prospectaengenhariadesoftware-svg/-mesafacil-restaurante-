import { describe, expect, it } from 'vitest';

import { buildOperationalReport } from './reports';

describe('buildOperationalReport', () => {
  it('summarizes daily orders, paid cash revenue, average ticket and payment methods', () => {
    const report = buildOperationalReport({
      orders: [
        { id: 'order-1', status: 'delivered', total_cents: 5000, created_at: '2026-09-12T10:00:00.000Z' },
        { id: 'order-2', status: 'cancelled', total_cents: 3000, created_at: '2026-09-12T11:00:00.000Z' },
        { id: 'order-3', status: 'ready', total_cents: 2000, created_at: '2026-09-12T12:00:00.000Z' },
      ],
      payments: [
        { id: 'pay-1', payment_method: 'pix', total_due_cents: 5500, amount_paid_cents: 6000, change_cents: 500, created_at: '2026-09-12T13:00:00.000Z', order_ids: ['order-1'] },
        { id: 'pay-2', payment_method: 'money', total_due_cents: 2200, amount_paid_cents: 2200, change_cents: 0, created_at: '2026-09-12T14:00:00.000Z', order_ids: ['order-3'] },
      ],
      items: [
        { order_id: 'order-1', product_id: 'p1', product_name: 'Pizza', quantity: 2, line_total_cents: 7000 },
        { order_id: 'order-3', product_id: 'p2', product_name: 'Suco', quantity: 3, line_total_cents: 3000 },
        { order_id: 'order-1', product_id: 'p1', product_name: 'Pizza', quantity: 1, line_total_cents: 3500 },
      ],
      catalog: { categories: 4, products: 10, availableProducts: 8, tables: 6, activeTables: 5 },
    });

    expect(report.ordersToday).toBe(3);
    expect(report.cancelledOrders).toBe(1);
    expect(report.openOrders).toBe(1);
    expect(report.deliveredOrders).toBe(1);
    expect(report.grossOrdersTodayCents).toBe(10000);
    expect(report.paidRevenueTodayCents).toBe(7700);
    expect(report.netReceivedTodayCents).toBe(7700);
    expect(report.averageTicketCents).toBe(7700 / 2);
    expect(report.cancellationRatePercent).toBeCloseTo(33.33, 2);
    expect(report.paymentBreakdown).toEqual([
      { paymentMethod: 'pix', count: 1, totalDueCents: 5500, amountPaidCents: 6000, changeCents: 500 },
      { paymentMethod: 'money', count: 1, totalDueCents: 2200, amountPaidCents: 2200, changeCents: 0 },
    ]);
    expect(report.topProducts).toEqual([
      { productId: 'p1', productName: 'Pizza', quantity: 3, revenueCents: 10500 },
      { productId: 'p2', productName: 'Suco', quantity: 3, revenueCents: 3000 },
    ]);
  });

  it('keeps zero metrics safe when there are no orders or payments', () => {
    expect(buildOperationalReport({
      orders: [],
      payments: [],
      items: [],
      catalog: { categories: 0, products: 0, availableProducts: 0, tables: 0, activeTables: 0 },
    })).toMatchObject({
      ordersToday: 0,
      paidRevenueTodayCents: 0,
      averageTicketCents: 0,
      cancellationRatePercent: 0,
      paymentBreakdown: [],
      topProducts: [],
    });
  });

  it('uses current open orders count independently from daily orders', () => {
    const report = buildOperationalReport({
      orders: [
        { id: 'today-delivered', status: 'delivered', total_cents: 5000, created_at: '2026-09-12T10:00:00.000Z' },
      ],
      payments: [],
      items: [],
      catalog: { categories: 0, products: 0, availableProducts: 0, tables: 0, activeTables: 0 },
      openOrdersCount: 2,
    });

    expect(report.ordersToday).toBe(1);
    expect(report.openOrders).toBe(2);
  });

  it('does not report sold products when no paid order is linked', () => {
    const report = buildOperationalReport({
      orders: [
        { id: 'open-order', status: 'ready', total_cents: 9000, created_at: '2026-09-12T11:00:00.000Z' },
        { id: 'cancelled-order', status: 'cancelled', total_cents: 8000, created_at: '2026-09-12T12:00:00.000Z' },
      ],
      payments: [],
      items: [
        { order_id: 'open-order', product_id: 'p2', product_name: 'Hambúrguer aberto', quantity: 10, line_total_cents: 9000 },
        { order_id: 'cancelled-order', product_id: 'p3', product_name: 'Cancelado', quantity: 10, line_total_cents: 8000 },
      ],
      catalog: { categories: 0, products: 0, availableProducts: 0, tables: 0, activeTables: 0 },
    });

    expect(report.topProducts).toEqual([]);
  });

  it('counts items from orders opened before today when they were paid today', () => {
    const report = buildOperationalReport({
      orders: [],
      payments: [
        { id: 'pay-previous', payment_method: 'credit', total_due_cents: 4200, amount_paid_cents: 4200, change_cents: 0, created_at: '2026-09-12T09:00:00.000Z', order_ids: ['previous-day-order'] },
      ],
      items: [
        { order_id: 'previous-day-order', product_id: 'p4', product_name: 'Café especial', quantity: 2, line_total_cents: 4200 },
      ],
      catalog: { categories: 0, products: 0, availableProducts: 0, tables: 0, activeTables: 0 },
    });

    expect(report.ordersToday).toBe(0);
    expect(report.topProducts).toEqual([
      { productId: 'p4', productName: 'Café especial', quantity: 2, revenueCents: 4200 },
    ]);
  });

  it('counts top products only from items linked to paid orders', () => {
    const report = buildOperationalReport({
      orders: [
        { id: 'paid-order', status: 'delivered', total_cents: 5000, created_at: '2026-09-12T10:00:00.000Z' },
        { id: 'open-order', status: 'ready', total_cents: 9000, created_at: '2026-09-12T11:00:00.000Z' },
        { id: 'cancelled-order', status: 'cancelled', total_cents: 8000, created_at: '2026-09-12T12:00:00.000Z' },
      ],
      payments: [
        { id: 'pay-1', payment_method: 'pix', total_due_cents: 5500, amount_paid_cents: 5500, change_cents: 0, created_at: '2026-09-12T13:00:00.000Z', order_ids: ['paid-order'] },
      ],
      items: [
        { order_id: 'paid-order', product_id: 'p1', product_name: 'Pizza', quantity: 1, line_total_cents: 5000 },
        { order_id: 'open-order', product_id: 'p2', product_name: 'Hambúrguer aberto', quantity: 10, line_total_cents: 9000 },
        { order_id: 'cancelled-order', product_id: 'p3', product_name: 'Cancelado', quantity: 10, line_total_cents: 8000 },
      ],
      catalog: { categories: 0, products: 0, availableProducts: 0, tables: 0, activeTables: 0 },
    });

    expect(report.topProducts).toEqual([
      { productId: 'p1', productName: 'Pizza', quantity: 1, revenueCents: 5000 },
    ]);
  });
});
