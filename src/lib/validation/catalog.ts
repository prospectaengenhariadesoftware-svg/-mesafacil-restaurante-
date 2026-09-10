import { isUuid } from './auth';

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type CategoryInput = {
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
};

export type ProductInput = {
  categoryId: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  isAvailable: boolean;
};

export type TableInput = {
  number: string;
  seats: number;
  sector: string | null;
  isActive: boolean;
};

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function optionalText(value: unknown): string | null {
  const cleaned = cleanText(value);
  return cleaned.length > 0 ? cleaned : null;
}

export function parseMoneyToCents(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100);
  if (typeof value !== 'string') return null;

  const cleaned = value.trim().replace(/\s/g, '');
  if (!cleaned) return null;

  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

export function formatMoneyFromCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function validateCategoryInput(input: Record<string, unknown>): ValidationResult<CategoryInput> {
  const name = cleanText(input.name);
  const displayOrderRaw = typeof input.displayOrder === 'number' ? input.displayOrder : Number(cleanText(input.displayOrder ?? '0'));
  const displayOrder = Number.isInteger(displayOrderRaw) ? displayOrderRaw : NaN;

  if (name.length < 2) return { success: false, error: 'Informe uma categoria com pelo menos 2 caracteres.' };
  if (name.length > 80) return { success: false, error: 'Categoria muito longa.' };
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 999) {
    return { success: false, error: 'Informe uma ordem de exibição entre 0 e 999.' };
  }

  return {
    success: true,
    data: {
      name,
      description: optionalText(input.description),
      isActive: input.isActive !== false && input.isActive !== 'false',
      displayOrder,
    },
  };
}

function optionalUrl(value: unknown): ValidationResult<string | null> {
  const cleaned = cleanText(value);
  if (!cleaned) return { success: true, data: null };
  if (cleaned.length > 500) return { success: false, error: 'URL da imagem muito longa.' };

  try {
    const url = new URL(cleaned);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { success: false, error: 'Informe uma URL de imagem válida iniciando com http ou https.' };
    }
    return { success: true, data: url.toString() };
  } catch {
    return { success: false, error: 'Informe uma URL de imagem válida.' };
  }
}

export function validateProductInput(input: Record<string, unknown>): ValidationResult<ProductInput> {
  const categoryId = cleanText(input.categoryId);
  const name = cleanText(input.name);
  const priceCents = parseMoneyToCents(input.price);
  const imageUrl = optionalUrl(input.imageUrl);

  if (!isUuid(categoryId)) return { success: false, error: 'Selecione uma categoria válida para o produto.' };
  if (name.length < 2) return { success: false, error: 'Informe um produto com pelo menos 2 caracteres.' };
  if (name.length > 120) return { success: false, error: 'Nome do produto muito longo.' };
  if (priceCents === null || priceCents <= 0) return { success: false, error: 'Informe um preço maior que zero.' };
  if (imageUrl.success === false) return { success: false, error: imageUrl.error };

  return {
    success: true,
    data: {
      categoryId,
      name,
      description: optionalText(input.description),
      priceCents,
      imageUrl: imageUrl.data,
      isAvailable: input.isAvailable !== false && input.isAvailable !== 'false',
    },
  };
}

export function validateTableInput(input: Record<string, unknown>): ValidationResult<TableInput> {
  const number = cleanText(input.number);
  const seatsRaw = typeof input.seats === 'number' ? input.seats : Number(cleanText(input.seats));
  const seats = Number.isInteger(seatsRaw) ? seatsRaw : NaN;

  if (number.length < 1) return { success: false, error: 'Informe o número ou identificação da mesa.' };
  if (number.length > 20) return { success: false, error: 'Identificação da mesa muito longa.' };
  if (!Number.isInteger(seats) || seats < 1 || seats > 99) return { success: false, error: 'Informe a quantidade de lugares entre 1 e 99.' };

  return {
    success: true,
    data: {
      number,
      seats,
      sector: optionalText(input.sector),
      isActive: input.isActive !== false && input.isActive !== 'false',
    },
  };
}
