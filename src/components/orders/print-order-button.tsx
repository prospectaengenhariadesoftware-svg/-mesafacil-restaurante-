'use client';

import { AppIcon } from '@/components/design-system/app-icon';

export function PrintOrderButton({ label }: Readonly<{ label: string }>) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => window.print()}
      className="grid h-9 w-9 place-items-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
    >
      <AppIcon name="printer" size={16} />
    </button>
  );
}
