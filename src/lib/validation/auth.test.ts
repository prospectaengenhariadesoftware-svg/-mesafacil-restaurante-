import { describe, expect, it } from 'vitest';
import { isUuid, validateEmail, validatePassword, validateTenantName } from './auth';

describe('auth and tenant validation', () => {
  it('validates email shape', () => {
    expect(validateEmail('dono@restaurante.com')).toEqual({ ok: true });
    expect(validateEmail('email-invalido').ok).toBe(false);
  });

  it('requires a strong enough password for account creation', () => {
    expect(validatePassword('SenhaForte123!')).toEqual({ ok: true });
    expect(validatePassword('123').ok).toBe(false);
    expect(validatePassword('somenteletras').ok).toBe(false);
  });

  it('validates tenant names and UUIDs', () => {
    expect(validateTenantName('Restaurante A')).toEqual({ ok: true });
    expect(validateTenantName('A').ok).toBe(false);
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isUuid('tenant-b-manipulado')).toBe(false);
  });
});
