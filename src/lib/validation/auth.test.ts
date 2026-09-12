import { describe, expect, it } from 'vitest';
import { isUuid, validateEmail, validatePassword, validateRestaurantSettingsInput, validateTenantName } from './auth';

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

  it('validates restaurant configuration form input', () => {
    const result = validateRestaurantSettingsInput({
      name: '  Bistrô Avenida  ',
      legalName: 'Bistro Avenida LTDA',
      document: '12.345.678/0001-90',
      email: ' CONTATO@BISTRO.COM.BR ',
      phone: ' (11) 99999-0000 ',
      publicSlug: 'Bistro Avenida Centro',
      publicDescription: 'Cardápio executivo e pratos do dia.',
      addressLine: 'Rua Central, 100',
      city: 'São Paulo',
      state: 'sp',
      acceptsQrOrders: 'true',
      serviceFeePercent: '10,5',
      estimatedPrepMinutes: '25',
      operatingStatus: 'open',
      publicNotice: 'Funcionamento normal.',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Bistrô Avenida');
      expect(result.data.email).toBe('contato@bistro.com.br');
      expect(result.data.publicSlug).toBe('bistro-avenida-centro');
      expect(result.data.state).toBe('SP');
      expect(result.data.serviceFeeBasisPoints).toBe(1050);
      expect(result.data.estimatedPrepMinutes).toBe(25);
    }
  });

  it('rejects unsafe or invalid restaurant configuration values', () => {
    expect(validateRestaurantSettingsInput({ name: 'A' }).ok).toBe(false);
    expect(validateRestaurantSettingsInput({ name: 'Restaurante', email: 'errado' }).ok).toBe(false);
    expect(validateRestaurantSettingsInput({ name: 'Restaurante', publicSlug: 'x' }).ok).toBe(false);
    expect(validateRestaurantSettingsInput({ name: 'Restaurante', serviceFeePercent: '101' }).ok).toBe(false);
    expect(validateRestaurantSettingsInput({ name: 'Restaurante', estimatedPrepMinutes: '0' }).ok).toBe(false);
    expect(validateRestaurantSettingsInput({ name: 'Restaurante', operatingStatus: 'invadido' }).ok).toBe(false);
  });
});
