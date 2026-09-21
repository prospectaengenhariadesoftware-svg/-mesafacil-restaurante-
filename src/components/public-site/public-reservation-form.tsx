'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPublicReservationAction } from '@/app/actions/public-reservation';
import { buildPublicReservationWhatsappHref } from '@/lib/public-site/reservation';
import type { PublicSiteTable } from '@/lib/types/public-site';

type PublicReservationFeedback = {
  reserva?: string;
  mesa?: string;
  data?: string;
  pessoas?: string;
  erroReserva?: string;
};

export function PublicReservationForm({
  restaurantSlug,
  tables,
  feedback,
  whatsappHref,
}: Readonly<{
  restaurantSlug: string;
  tables: PublicSiteTable[];
  feedback: PublicReservationFeedback;
  whatsappHref: string | null;
}>) {
  const [dismissed, setDismissed] = useState(false);
  const availableTables = tables.filter((table) => table.reservation_status !== 'reserved');
  const successMessage = feedback.reserva === 'ok'
    ? `Reserva feita com sucesso para a mesa ${feedback.mesa ?? ''}${feedback.data ? ` em ${feedback.data}` : ''}. O restaurante já consegue acompanhar na Central de Reservas.`
    : null;
  const errorMessage = feedback.erroReserva ?? null;
  const dialogMessage = successMessage ?? errorMessage;
  const dialogType = successMessage ? 'success' : 'error';
  const dialogOpen = Boolean(dialogMessage) && !dismissed;

  useEffect(() => {
    if (feedback.reserva !== 'ok' && !feedback.erroReserva) return;
    window.history.replaceState(null, '', `${window.location.pathname}#reservas`);
  }, [feedback.erroReserva, feedback.reserva]);

  const reservationWhatsappHref = useMemo(
    () => buildPublicReservationWhatsappHref(whatsappHref, null, { mesa: feedback.mesa, data: feedback.data, pessoas: feedback.pessoas }),
    [feedback, whatsappHref],
  );

  return (
    <div className="rounded-[1.75rem] bg-stone-50 p-4 ring-1 ring-stone-200 sm:p-5">
      <form
        key={feedback.reserva === 'ok' ? 'reservation-success-clean-form' : feedback.erroReserva ? 'reservation-error-clean-form' : 'reservation-form'}
        action={createPublicReservationAction}
        autoComplete="off"
        className="space-y-4"
      >
        <input type="hidden" name="restaurantSlug" value={restaurantSlug} />
        <label className="block text-sm font-black text-stone-700">
          Mesa
          <select name="tableNumber" required disabled={availableTables.length === 0} className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 outline-none focus:border-red-500 disabled:opacity-60">
            <option value="">Escolha uma mesa livre</option>
            {availableTables.map((table) => <option key={table.number} value={table.number}>Mesa {table.number} · {table.seats} lugares{table.sector ? ` · ${table.sector}` : ''}</option>)}
          </select>
        </label>
        <label className="block text-sm font-black text-stone-700">
          Data
          <input name="reservationDate" required type="date" className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-black text-stone-700">
            Horário
            <input name="reservationTime" required type="time" step={1800} className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
          </label>
          <label className="block text-sm font-black text-stone-700">
            Pessoas
            <input name="partySize" required type="number" min={1} max={99} defaultValue={2} className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
          </label>
        </div>
        <label className="block text-sm font-black text-stone-700">
          Nome
          <input name="customerName" required minLength={2} maxLength={120} autoComplete="off" placeholder="Seu nome" className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
        </label>
        <label className="block text-sm font-black text-stone-700">
          E-mail
          <input name="customerEmail" required type="email" maxLength={160} autoComplete="off" placeholder="voce@email.com" className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
        </label>
        <label className="block text-sm font-black text-stone-700">
          Telefone
          <input name="customerPhone" required inputMode="tel" maxLength={32} autoComplete="off" placeholder="(00) 00000-0000" className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
        </label>
        <button type="submit" disabled={availableTables.length === 0} className="mf-button-primary min-h-12 w-full rounded-2xl bg-[var(--brand)] px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20 transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60">Reservar mesa</button>
      </form>

      {dialogOpen && dialogMessage ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reservation-alert-title">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-2xl shadow-stone-950/30">
            <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-3xl ${dialogType === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>{dialogType === 'success' ? '✅' : '⚠️'}</div>
            <h2 id="reservation-alert-title" className="mt-4 text-2xl font-black tracking-[-0.04em] text-stone-950">{dialogType === 'success' ? 'Reserva feita com sucesso!' : 'Atenção na reserva'}</h2>
            <p className="mt-2 rounded-2xl bg-stone-50 p-4 text-sm font-black leading-6 text-stone-700">{dialogMessage}</p>
            {dialogType === 'success' ? (
              reservationWhatsappHref ? (
                <a href={reservationWhatsappHref} target="_blank" rel="noopener noreferrer" className="mf-button-primary mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--brand)] px-5 text-sm font-black text-white shadow-lg shadow-red-600/20">
                  Enviar dados para o WhatsApp do restaurante
                </a>
              ) : (
                <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-black text-amber-700">O restaurante ainda não cadastrou WhatsApp público.</p>
              )
            ) : null}
            <button type="button" onClick={() => setDismissed(true)} className="mt-3 min-h-11 w-full rounded-2xl border border-stone-200 bg-white px-5 text-sm font-black text-stone-700 hover:bg-stone-50">Fechar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
