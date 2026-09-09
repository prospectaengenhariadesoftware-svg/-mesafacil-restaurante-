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
