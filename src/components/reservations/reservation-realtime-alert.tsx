'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  RESERVATION_REALTIME_REFRESH_DEBOUNCE_MS,
  RESERVATION_REALTIME_TABLE,
  buildReservationRealtimeChannelName,
  isNewPublicReservationEvent,
  matchesReservationRealtimeTenant,
} from '@/lib/realtime/reservation-events';

type RealtimeStatus = 'connecting' | 'active' | 'reconnecting';

type ReservationRealtimePayload = {
  eventType: string;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

function formatReservationAlert(record: Record<string, unknown> | null): string {
  const customerName = typeof record?.customer_name === 'string' ? record.customer_name : 'Cliente';
  const partySize = typeof record?.party_size === 'number' ? ` · ${record.party_size} pessoa(s)` : '';
  const scheduledAt = typeof record?.scheduled_at === 'string'
    ? new Date(record.scheduled_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    : '';
  return `${customerName}${scheduledAt ? ` · ${scheduledAt}` : ''}${partySize}`;
}

export function ReservationRealtimeAlert({ tenantId }: Readonly<{ tenantId: string }>) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const [alertText, setAlertText] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(buildReservationRealtimeChannelName(tenantId));

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: RESERVATION_REALTIME_TABLE,
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        const event = payload as ReservationRealtimePayload;
        if (!matchesReservationRealtimeTenant(event.new, event.old, tenantId)) return;
        if (isNewPublicReservationEvent(event.eventType, event.new, tenantId)) {
          setAlertText(formatReservationAlert(event.new));
        }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          router.refresh();
        }, RESERVATION_REALTIME_REFRESH_DEBOUNCE_MS);
      },
    );

    channel.subscribe((subscriptionStatus) => {
      if (subscriptionStatus === 'SUBSCRIBED') setStatus('active');
      if (subscriptionStatus === 'CHANNEL_ERROR' || subscriptionStatus === 'TIMED_OUT' || subscriptionStatus === 'CLOSED') setStatus('reconnecting');
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      void supabase.removeChannel(channel);
    };
  }, [router, tenantId]);

  const isActive = status === 'active';
  const label = isActive ? 'Alertas em tempo real ativos' : status === 'connecting' ? 'Conectando alertas' : 'Reconectando alertas';

  return (
    <>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isActive ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>
        {label}
      </span>
      {alertText ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="new-reservation-alert-title">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-2xl shadow-stone-950/30">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-3xl">🔔</div>
            <h2 id="new-reservation-alert-title" className="mt-4 text-2xl font-black tracking-[-0.04em] text-stone-950">Nova reserva recebida</h2>
            <p className="mt-2 rounded-2xl bg-stone-50 p-4 text-sm font-black text-stone-700">{alertText}</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-stone-500">A lista foi atualizada automaticamente no sistema web e no mobile.</p>
            <button type="button" onClick={() => setAlertText(null)} className="mf-button-primary mt-5 min-h-12 w-full rounded-2xl bg-[var(--brand)] px-5 text-sm font-black text-white shadow-lg shadow-red-600/20">Ver reservas</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
