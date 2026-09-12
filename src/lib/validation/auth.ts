export type ValidationResult = { ok: true } | { ok: false; message: string };

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateEmail(email: string): ValidationResult {
  const normalized = email.trim().toLowerCase();
  if (!emailRegex.test(normalized)) return { ok: false, message: 'Informe um e-mail válido.' };
  return { ok: true };
}

export function validatePassword(password: string): ValidationResult {
  if (password.length < 8) return { ok: false, message: 'A senha deve ter pelo menos 8 caracteres.' };
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, message: 'A senha deve conter letras e números.' };
  }
  return { ok: true };
}

export function validateTenantName(name: string): ValidationResult {
  const value = name.trim();
  if (value.length < 3) return { ok: false, message: 'O nome do restaurante deve ter pelo menos 3 caracteres.' };
  if (value.length > 120) return { ok: false, message: 'O nome do restaurante deve ter no máximo 120 caracteres.' };
  return { ok: true };
}

export function validatePersonName(name: string): ValidationResult {
  const value = name.trim();
  if (value.length < 2) return { ok: false, message: 'Informe seu nome.' };
  if (value.length > 120) return { ok: false, message: 'O nome deve ter no máximo 120 caracteres.' };
  return { ok: true };
}

export function isUuid(value: string): boolean {
  return uuidRegex.test(value);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}


export type RestaurantOperatingStatus = 'open' | 'closed' | 'paused';

export type RestaurantSettingsInput = {
  name: string;
  legalName: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  publicSlug: string;
  publicDescription: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  acceptsQrOrders: boolean;
  serviceFeeBasisPoints: number;
  estimatedPrepMinutes: number | null;
  operatingStatus: RestaurantOperatingStatus;
  publicNotice: string | null;
};

export type RestaurantSettingsValidationResult =
  | { ok: true; data: RestaurantSettingsInput }
  | { ok: false; message: string };

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function optionalText(value: unknown, maxLength: number, label: string): { ok: true; value: string | null } | { ok: false; message: string } {
  const cleaned = cleanText(value);
  if (!cleaned) return { ok: true, value: null };
  if (cleaned.length > maxLength) return { ok: false, message: `${label} deve ter no máximo ${maxLength} caracteres.` };
  return { ok: true, value: cleaned };
}

export function normalizePublicSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function parseServiceFeeBasisPoints(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100);
  const cleaned = cleanText(value ?? '0').replace(/\./g, '').replace(',', '.');
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

function parseOptionalInteger(value: unknown): number | null | undefined {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isInteger(parsed)) return undefined;
  return parsed;
}

export function validateRestaurantSettingsInput(input: Record<string, unknown>): RestaurantSettingsValidationResult {
  const name = cleanText(input.name);
  const nameValidation = validateTenantName(name);
  if (!nameValidation.ok) return { ok: false, message: nameValidation.message };

  const legalName = optionalText(input.legalName, 160, 'Razão social');
  if (!legalName.ok) return { ok: false, message: legalName.message };
  const document = optionalText(input.document, 32, 'Documento');
  if (!document.ok) return { ok: false, message: document.message };
  const rawEmail = cleanText(input.email).toLowerCase();
  const email = rawEmail || null;
  if (email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.ok) return { ok: false, message: emailValidation.message };
  }
  const phone = optionalText(input.phone, 32, 'Telefone');
  if (!phone.ok) return { ok: false, message: phone.message };

  const publicSlug = normalizePublicSlug(cleanText(input.publicSlug) || name);
  if (publicSlug.length < 3 || publicSlug.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(publicSlug)) {
    return { ok: false, message: 'Informe um slug público válido entre 3 e 80 caracteres.' };
  }

  const publicDescription = optionalText(input.publicDescription, 280, 'Descrição pública');
  if (!publicDescription.ok) return { ok: false, message: publicDescription.message };
  const addressLine = optionalText(input.addressLine, 180, 'Endereço');
  if (!addressLine.ok) return { ok: false, message: addressLine.message };
  const city = optionalText(input.city, 80, 'Cidade');
  if (!city.ok) return { ok: false, message: city.message };
  const stateRaw = cleanText(input.state).toUpperCase();
  const state = stateRaw || null;
  if (state && !/^[A-Z]{2}$/.test(state)) return { ok: false, message: 'Informe a UF com 2 letras.' };

  const serviceFeeBasisPoints = parseServiceFeeBasisPoints(input.serviceFeePercent);
  if (serviceFeeBasisPoints === null || serviceFeeBasisPoints < 0 || serviceFeeBasisPoints > 10000) {
    return { ok: false, message: 'Informe taxa de serviço entre 0% e 100%.' };
  }

  const estimatedPrepMinutes = parseOptionalInteger(input.estimatedPrepMinutes);
  if (estimatedPrepMinutes === undefined || (estimatedPrepMinutes !== null && (estimatedPrepMinutes < 1 || estimatedPrepMinutes > 240))) {
    return { ok: false, message: 'Informe tempo estimado entre 1 e 240 minutos.' };
  }

  const operatingStatus = cleanText(input.operatingStatus) || 'open';
  if (!['open', 'closed', 'paused'].includes(operatingStatus)) {
    return { ok: false, message: 'Status operacional inválido.' };
  }

  const publicNotice = optionalText(input.publicNotice, 220, 'Mensagem pública');
  if (!publicNotice.ok) return { ok: false, message: publicNotice.message };

  return {
    ok: true,
    data: {
      name,
      legalName: legalName.value,
      document: document.value,
      email,
      phone: phone.value,
      publicSlug,
      publicDescription: publicDescription.value,
      addressLine: addressLine.value,
      city: city.value,
      state,
      acceptsQrOrders: input.acceptsQrOrders !== false && input.acceptsQrOrders !== 'false',
      serviceFeeBasisPoints,
      estimatedPrepMinutes,
      operatingStatus: operatingStatus as RestaurantOperatingStatus,
      publicNotice: publicNotice.value,
    },
  };
}
