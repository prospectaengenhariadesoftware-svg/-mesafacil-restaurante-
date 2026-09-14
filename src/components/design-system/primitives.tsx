import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppIcon, type AppIconName } from './app-icon';

export type StatusTone = 'brand' | 'warning' | 'success' | 'info' | 'neutral' | 'danger';

const toneClasses: Record<StatusTone, string> = {
  brand: 'border-red-100 bg-red-50 text-red-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-800',
  success: 'border-green-100 bg-green-50 text-green-700',
  info: 'border-blue-100 bg-blue-50 text-blue-700',
  neutral: 'border-gray-200 bg-gray-50 text-gray-600',
  danger: 'border-rose-100 bg-rose-50 text-rose-700',
};

export function Button({ children, href, variant = 'primary', type = 'button', className = '' }: Readonly<{ children: ReactNode; href?: string; variant?: 'primary' | 'secondary' | 'ghost'; type?: 'button' | 'submit'; className?: string }>) {
  const classes = {
    primary: 'bg-red-600 text-white shadow-sm shadow-red-200 hover:bg-red-700',
    secondary: 'border border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700',
    ghost: 'text-gray-600 hover:bg-gray-50 hover:text-gray-950',
  }[variant];
  const composed = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition ${classes} ${className}`;
  if (href) return <Link href={href} className={composed}>{children}</Link>;
  return <button type={type} className={composed}>{children}</button>;
}

export function PageHeader({ eyebrow, title, description, action, breadcrumb }: Readonly<{ eyebrow?: string; title: string; description?: string; action?: ReactNode; breadcrumb?: ReactNode }>) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {breadcrumb ? <div className="mb-3 text-sm font-semibold text-gray-500">{breadcrumb}</div> : null}
        {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-black tracking-tight text-gray-950 md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 md:text-base">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function MetricCard({ icon, label, value, hint, tone = 'neutral' }: Readonly<{ icon: AppIconName; label: string; value: ReactNode; hint?: ReactNode; tone?: StatusTone }>) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl border ${toneClasses[tone]}`}><AppIcon name={icon} size={20} /></div>
        {hint ? <span className="text-xs font-bold text-gray-500">{hint}</span> : null}
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight text-gray-950">{value}</p>
    </article>
  );
}

export function StatusBadge({ children, tone = 'neutral' }: Readonly<{ children: ReactNode; tone?: StatusTone }>) {
  return <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-black ${toneClasses[tone]}`}>{children}</span>;
}

export function SearchBar({ name = 'q', placeholder = 'Buscar...', defaultValue }: Readonly<{ name?: string; placeholder?: string; defaultValue?: string }>) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">Buscar</span>
      <AppIcon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100" />
    </label>
  );
}

export function FilterBar({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm md:flex-row md:items-center">{children}</div>;
}

export function ListCard({ children, className = '' }: Readonly<{ children: ReactNode; className?: string }>) {
  return <article className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>{children}</article>;
}

export function EmptyState({ icon = 'orders', title, description, action }: Readonly<{ icon?: AppIconName; title: string; description?: string; action?: ReactNode }>) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500"><AppIcon name={icon} size={22} /></div>
      <p className="mt-4 font-black text-gray-950">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function DataTable({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block"><table className="w-full border-collapse text-left text-sm">{children}</table></div>;
}

export function MobileListCard({ children }: Readonly<{ children: ReactNode }>) {
  return <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm active:scale-[0.99] md:hidden">{children}</article>;
}
