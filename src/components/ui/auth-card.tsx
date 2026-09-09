import Link from 'next/link';

export function AuthCard({
  title,
  description,
  children,
  footer,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-emerald-950/30">
        <Link href="/" className="mb-8 inline-flex text-sm font-semibold text-emerald-300">
          MesaFácil
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
        <div className="mt-8">{children}</div>
        {footer ? <div className="mt-6 text-sm text-slate-300">{footer}</div> : null}
      </section>
    </main>
  );
}

export function Field({ label, name, type = 'text', required = true, autoComplete }: Readonly<{
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}>) {
  return (
    <label className="block text-sm font-medium text-slate-200">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
      />
    </label>
  );
}

export function SubmitButton({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <button className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-300" type="submit">
      {children}
    </button>
  );
}

export function Feedback({ message, type = 'error' }: Readonly<{ message?: string; type?: 'error' | 'success' }>) {
  if (!message) return null;
  return (
    <p className={`mb-4 rounded-xl border px-4 py-3 text-sm ${type === 'error' ? 'border-red-500/40 bg-red-950/40 text-red-200' : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'}`}>
      {message}
    </p>
  );
}
