import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { requireActiveTenant } from '@/lib/auth/context';
import { getTenantNavigation } from '@/lib/tenant/navigation';
import { isUuid } from '@/lib/validation/auth';

export default async function TenantHomePage({ params }: Readonly<{ params: Promise<{ tenantId: string }> }>) {
  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  const membership = await requireActiveTenant(tenantId);
  const tenant = membership.tenants;
  const modules = getTenantNavigation(tenantId).filter((item) => item.slug !== 'visao-geral');

  return (
    <AppShell tenantId={tenantId}>
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold text-emerald-300">Página inicial do restaurante</p>
          <h1 className="mt-2 text-3xl font-black">{tenant?.name}</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Estrutura SaaS ativa. As páginas principais do restaurante já estão organizadas e protegidas por tenant_id.
          </p>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-slate-500">Tenant ID</dt><dd className="break-all font-mono text-xs">{tenantId}</dd></div>
            <div><dt className="text-slate-500">Seu papel</dt><dd className="font-semibold">{membership.role}</dd></div>
            <div><dt className="text-slate-500">Status</dt><dd className="font-semibold">{tenant?.status}</dd></div>
          </dl>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((item) => (
            <Link key={item.slug} href={item.href} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-emerald-400 hover:bg-slate-900">
              <h2 className="text-lg font-bold text-slate-100">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
              <span className="mt-4 inline-flex text-sm font-semibold text-emerald-300">Abrir módulo →</span>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
