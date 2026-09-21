import { describe, expect, it } from 'vitest';
import { publicReservationFeedbackPath, validatePublicReservationInput } from './reservation';

describe('validatePublicReservationInput', () => {
  it('normaliza uma reserva pública válida', () => {
    expect(validatePublicReservationInput({
      restaurantSlug: 'Tuus Restaurante',
      tableNumber: ' Mesa 7 ',
      customerName: ' Maria  Silva ',
      customerEmail: ' MARIA@EXEMPLO.COM ',
      customerPhone: ' (13) 97403-8515 ',
    })).toEqual({
      success: true,
      data: {
        restaurantSlug: 'tuus-restaurante',
        tableNumber: 'Mesa 7',
        customerName: 'Maria Silva',
        customerEmail: 'maria@exemplo.com',
        customerPhone: '(13) 97403-8515',
      },
    });
  });

  it('rejeita dados de cliente incompletos', () => {
    expect(validatePublicReservationInput({
      restaurantSlug: 'tuus',
      tableNumber: '',
      customerName: 'A',
      customerEmail: 'email-invalido',
      customerPhone: '123',
    }).success).toBe(false);
  });
});

describe('publicReservationFeedbackPath', () => {
  it('redireciona para a área de reservas sem expor dados pessoais na URL', () => {
    expect(publicReservationFeedbackPath('tuus', { reserva: 'ok', mesa: 'Mesa 7' })).toBe('/r/tuus?reserva=ok&mesa=Mesa+7#reservas');
  });
});
