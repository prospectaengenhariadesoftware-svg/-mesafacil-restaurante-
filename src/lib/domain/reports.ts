export type ReportOrderRow = {
  id: string;
  status: 'received' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  total_cents: number;
  created_at: string;
  confirmed_at?: string | null;
  preparing_at?: string | null;
  ready_at?: string | null;
  delivered_at?: string | null;
};

export type ReportPaymentRow = {
  id: string;
  payment_method: 'money' | 'pix' | 'debit' | 'credit' | 'other';
  total_due_cents: number;
  amount_paid_cents: number;
  change_cents: number;
  created_at: string;
  order_ids?: string[];
};

export type ReportItemRow = {
  order_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  line_total_cents: number;
};

export type ReportCatalogCounts = {
  categories: number;
  products: number;
  availableProducts: number;
  tables: number;
  activeTables: number;
};

export type PaymentBreakdownSummary = {
  paymentMethod: ReportPaymentRow['payment_method'];
  count: number;
  totalDueCents: number;
  amountPaidCents: number;
  changeCents: number;
};

export type TopProductSummary = {
  productId: string;
  productName: string;
  quantity: number;
  revenueCents: number;
};

export type TimingSummary = {
  sampleSize: number;
  averageMinutes: number;
};

export type OperationalTimingSummary = {
  toKitchen: TimingSummary;
  preparation: TimingSummary;
  readyToDelivery: TimingSummary;
  totalToDelivery: TimingSummary;
};

export type OperationalReportSummary = ReportCatalogCounts & {
  ordersToday: number;
  grossOrdersTodayCents: number;
  paidRevenueTodayCents: number;
  netReceivedTodayCents: number;
  averageTicketCents: number;
  openOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  cancellationRatePercent: number;
  timing: OperationalTimingSummary;
  paymentBreakdown: PaymentBreakdownSummary[];
  topProducts: TopProductSummary[];
};

export type BuildOperationalReportInput = {
  orders: ReportOrderRow[];
  payments: ReportPaymentRow[];
  items: ReportItemRow[];
  catalog: ReportCatalogCounts;
  openOrdersCount?: number;
};

const openStatuses = new Set<ReportOrderRow['status']>(['received', 'confirmed', 'preparing', 'ready']);

function minutesBetween(start: string | null | undefined, end: string | null | undefined): number | null {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return null;
  return (endTime - startTime) / 60000;
}

function summarizeDurations(values: Array<number | null>): TimingSummary {
  const validValues = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (validValues.length === 0) return { sampleSize: 0, averageMinutes: 0 };
  const total = validValues.reduce((sum, value) => sum + value, 0);
  return { sampleSize: validValues.length, averageMinutes: total / validValues.length };
}

function buildTimingSummary(orders: ReportOrderRow[]): OperationalTimingSummary {
  return {
    toKitchen: summarizeDurations(orders.map((order) => minutesBetween(order.created_at, order.preparing_at))),
    preparation: summarizeDurations(orders.map((order) => minutesBetween(order.preparing_at, order.ready_at))),
    readyToDelivery: summarizeDurations(orders.map((order) => minutesBetween(order.ready_at, order.delivered_at))),
    totalToDelivery: summarizeDurations(orders.map((order) => minutesBetween(order.created_at, order.delivered_at))),
  };
}

export function buildOperationalReport(input: BuildOperationalReportInput): OperationalReportSummary {
  const ordersToday = input.orders.length;
  const grossOrdersTodayCents = input.orders.reduce((sum, order) => sum + order.total_cents, 0);
  const openOrders = input.openOrdersCount ?? input.orders.filter((order) => openStatuses.has(order.status)).length;
  const deliveredOrders = input.orders.filter((order) => order.status === 'delivered').length;
  const cancelledOrders = input.orders.filter((order) => order.status === 'cancelled').length;
  const paidRevenueTodayCents = input.payments.reduce((sum, payment) => sum + payment.total_due_cents, 0);
  const totalChangeCents = input.payments.reduce((sum, payment) => sum + payment.change_cents, 0);
  const totalPaidCents = input.payments.reduce((sum, payment) => sum + payment.amount_paid_cents, 0);

  const paymentBreakdown = Array.from(
    input.payments.reduce((groups, payment) => {
      const current = groups.get(payment.payment_method) ?? {
        paymentMethod: payment.payment_method,
        count: 0,
        totalDueCents: 0,
        amountPaidCents: 0,
        changeCents: 0,
      };
      current.count += 1;
      current.totalDueCents += payment.total_due_cents;
      current.amountPaidCents += payment.amount_paid_cents;
      current.changeCents += payment.change_cents;
      groups.set(payment.payment_method, current);
      return groups;
    }, new Map<ReportPaymentRow['payment_method'], PaymentBreakdownSummary>()),
  ).map(([, value]) => value);

  const paidOrderIds = new Set(input.payments.flatMap((payment) => payment.order_ids ?? []));
  const soldItems = input.items.filter((item) => item.order_id !== undefined && paidOrderIds.has(item.order_id));

  const topProducts = Array.from(
    soldItems.reduce((groups, item) => {
      const current = groups.get(item.product_id) ?? {
        productId: item.product_id,
        productName: item.product_name,
        quantity: 0,
        revenueCents: 0,
      };
      current.quantity += item.quantity;
      current.revenueCents += item.line_total_cents;
      groups.set(item.product_id, current);
      return groups;
    }, new Map<string, TopProductSummary>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.quantity - a.quantity || b.revenueCents - a.revenueCents || a.productName.localeCompare(b.productName))
    .slice(0, 5);

  return {
    ...input.catalog,
    ordersToday,
    grossOrdersTodayCents,
    paidRevenueTodayCents,
    netReceivedTodayCents: Math.max(0, totalPaidCents - totalChangeCents),
    averageTicketCents: input.payments.length > 0 ? paidRevenueTodayCents / input.payments.length : 0,
    openOrders,
    deliveredOrders,
    cancelledOrders,
    cancellationRatePercent: ordersToday > 0 ? (cancelledOrders / ordersToday) * 100 : 0,
    timing: buildTimingSummary(input.orders),
    paymentBreakdown,
    topProducts,
  };
}
