'use client';

import { useLinkStatus } from 'next/link';

export function NavigationPendingIndicator() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={`ml-1 inline-block h-2 w-2 shrink-0 rounded-full bg-current transition-opacity ${pending ? 'animate-pulse opacity-100' : 'opacity-0'}`}
    />
  );
}
