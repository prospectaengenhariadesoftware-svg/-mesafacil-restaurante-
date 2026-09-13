'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ORDER_REALTIME_REFRESH_DEBOUNCE_MS,
  ORDER_REALTIME_TABLES,
  buildOrderRealtimeChannelName,
  matchesOrderRealtimeTenant,
  type OrderPanelSource,
} from '@/lib/realtime/order-events';

type RealtimeStatus = 'connecting' | 'active' | 'reconnecting';

export function OrderRealtimeRefresh({ tenantId, source }: Readonly<{ tenantId: string; source: OrderPanelSource }>) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>('connecting');

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(buildOrderRealtimeChannelName(tenantId, source));

    for (const table of ORDER_REALTIME_TABLES) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (!matchesOrderRealtimeTenant(payload.new as Record<string, unknown>, payload.old as Record<string, unknown>, tenantId)) return;
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            router.refresh();
          }, ORDER_REALTIME_REFRESH_DEBOUNCE_MS);
        },
      );
    }

    channel.subscribe((subscriptionStatus) => {
      if (subscriptionStatus === 'SUBSCRIBED') setStatus('active');
      if (subscriptionStatus === 'CHANNEL_ERROR' || subscriptionStatus === 'TIMED_OUT' || subscriptionStatus === 'CLOSED') setStatus('reconnecting');
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      void supabase.removeChannel(channel);
    };
  }, [router, source, tenantId]);

  const isActive = status === 'active';
  const label = isActive ? 'Tempo real ativo' : status === 'connecting' ? 'Conectando atualizações' : 'Reconectando atualizações';

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isActive ? 'bg-sky-400/10 text-sky-200' : 'bg-amber-400/10 text-amber-200'}`}>
      {label}
    </span>
  );
}
