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
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10 text-stone-950">
      <section className="w-full max-w-md rounded-3xl border border-stone-200 bg-white/95 p-8 shadow-2xl shadow-red-100/70">
        <Link href="/" className="mb-8 inline-flex text-sm font-semibold text-red-600">
          MesaFácil
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
        <div className="mt-8">{children}</div>
        {footer ? <div className="mt-6 text-sm text-stone-600">{footer}</div> : null}
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
    <label className="block text-sm font-medium text-stone-800">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-red-500"
      />
    </label>
  );
}

export function SubmitButton({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <button className="w-full rounded-xl bg-red-500 px-4 py-3 font-bold text-white transition hover:bg-red-600" type="submit">
      {children}
    </button>
  );
}

export function Feedback({ message, type = 'error' }: Readonly<{ message?: string; type?: 'error' | 'success' }>) {
  if (!message) return null;
  return (
    <p className={`mb-4 rounded-xl border px-4 py-3 text-sm ${type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
      {message}
    </p>
  );
}
