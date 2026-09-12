export type ReportOrderRow = {
  id: string;
  status: 'received' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  total_cents: number;
  created_at: string;
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
    paymentBreakdown,
    topProducts,
  };
}
