import { isUuid } from './auth';
import { parseMoneyToCents, type ValidationResult } from './catalog';

export const paymentMethods = ['money', 'pix', 'debit', 'credit', 'other'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export type CashPaymentInput = {
  tenantId: string;
  tableId: string;
  orderIds: string[];
  paymentMethod: PaymentMethod;
  subtotalCents: number;
  serviceFeePercent: number;
  discountCents: number;
  amountPaidCents: number;
  notes: string | null;
};

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function normalizeOrderIds(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return raw.map(String).map((item) => item.trim()).filter((item, index, all) => isUuid(item) && all.indexOf(item) === index);
}

export function validateCashPaymentInput(input: Record<string, unknown>): ValidationResult<CashPaymentInput> {
  const tenantId = cleanText(input.tenantId);
  const tableId = cleanText(input.tableId);
  const orderIds = normalizeOrderIds(input.orderIds);
  const paymentMethod = cleanText(input.paymentMethod) as PaymentMethod;
  const subtotalCents = typeof input.subtotalCents === 'number' ? input.subtotalCents : Number(cleanText(input.subtotalCents));
  const serviceFeePercentRaw = typeof input.serviceFeePercent === 'number' ? input.serviceFeePercent : Number(cleanText(input.serviceFeePercent ?? '0').replace(',', '.'));
  const discountCents = parseMoneyToCents(input.discount ?? '0');
  const amountPaidCents = parseMoneyToCents(input.amountPaid);
  const notes = cleanText(input.notes);

  if (!isUuid(tenantId)) return { success: false, error: 'Tenant inválido.' };
  if (!isUuid(tableId)) return { success: false, error: 'Mesa inválida.' };
  if (orderIds.length === 0) return { success: false, error: 'Selecione pelo menos um pedido para fechar.' };
  if (!paymentMethods.includes(paymentMethod)) return { success: false, error: 'Forma de pagamento inválida.' };
  if (!Number.isInteger(subtotalCents) || subtotalCents <= 0) return { success: false, error: 'Subtotal inválido.' };
  if (!Number.isFinite(serviceFeePercentRaw) || serviceFeePercentRaw < 0 || serviceFeePercentRaw > 100) return { success: false, error: 'Taxa de serviço inválida.' };
  if (discountCents === null || discountCents < 0 || discountCents > subtotalCents) return { success: false, error: 'Desconto inválido.' };
  if (amountPaidCents === null || amountPaidCents <= 0) return { success: false, error: 'Informe um valor pago maior que zero.' };
  if (notes.length > 300) return { success: false, error: 'Observação muito longa.' };

  return {
    success: true,
    data: {
      tenantId,
      tableId,
      orderIds,
      paymentMethod,
      subtotalCents,
      serviceFeePercent: serviceFeePercentRaw,
      discountCents,
      amountPaidCents,
      notes: notes || null,
    },
  };
}
