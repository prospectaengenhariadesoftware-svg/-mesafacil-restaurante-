import { describe, expect, it } from 'vitest';
import { buildPublicReservationScheduledAt, publicReservationFeedbackPath, validatePublicReservationInput } from './reservation';

const NOW = new Date('2026-09-21T12:00:00.000Z');

describe('validatePublicReservationInput', () => {
  it('normaliza uma reserva pública válida com data, horário e pessoas', () => {
    expect(validatePublicReservationInput({
      restaurantSlug: 'Tuus Restaurante',
      tableNumber: ' Mesa 7 ',
      customerName: ' Maria  Silva ',
      customerEmail: ' MARIA@EXEMPLO.COM ',
      customerPhone: ' (13) 97403-8515 ',
      reservationDate: '2026-09-22',
      reservationTime: '19:30',
      partySize: '4',
    }, NOW)).toEqual({
      success: true,
      data: {
        restaurantSlug: 'tuus-restaurante',
        tableNumber: 'Mesa 7',
        customerName: 'Maria Silva',
        customerEmail: 'maria@exemplo.com',
        customerPhone: '(13) 97403-8515',
        scheduledAt: '2026-09-22T22:30:00.000Z',
        reservationDate: '2026-09-22',
        reservationTime: '19:30',
        partySize: 4,
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
      reservationDate: '2026-09-22',
      reservationTime: '19:30',
      partySize: '2',
    }, NOW).success).toBe(false);
  });

  it('rejeita agendamento com menos de 30 minutos de antecedência', () => {
    const result = validatePublicReservationInput({
      restaurantSlug: 'tuus',
      tableNumber: '1',
      customerName: 'Maria Silva',
      customerEmail: 'maria@exemplo.com',
      customerPhone: '(13) 97403-8515',
      reservationDate: '2026-09-21',
      reservationTime: '09:00',
      partySize: '2',
    }, NOW);

    expect(result).toEqual({ success: false, error: 'Escolha um horário com pelo menos 30 minutos de antecedência.' });
  });

  it('rejeita agendamento fora de slots de 30 minutos', () => {
    const result = validatePublicReservationInput({
      restaurantSlug: 'tuus',
      tableNumber: '1',
      customerName: 'Maria Silva',
      customerEmail: 'maria@exemplo.com',
      customerPhone: '(13) 97403-8515',
      reservationDate: '2026-09-22',
      reservationTime: '19:15',
      partySize: '2',
    }, NOW);

    expect(result).toEqual({ success: false, error: 'Escolha um horário em intervalo de 30 minutos.' });
  });
});

describe('buildPublicReservationScheduledAt', () => {
  it('converte data/hora local do Brasil para ISO UTC', () => {
    expect(buildPublicReservationScheduledAt('2026-10-03', '20:15')).toBe('2026-10-03T23:15:00.000Z');
  });
});

describe('publicReservationFeedbackPath', () => {
  it('redireciona para a área de reservas sem expor dados pessoais na URL', () => {
    expect(publicReservationFeedbackPath('tuus', { reserva: 'ok', mesa: 'Mesa 7', data: '22/09/2026, 19:30' })).toBe('/r/tuus?reserva=ok&mesa=Mesa+7&data=22%2F09%2F2026%2C+19%3A30#reservas');
  });
});
