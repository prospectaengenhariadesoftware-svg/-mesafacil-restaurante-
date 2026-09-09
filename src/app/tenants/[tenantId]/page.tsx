import { AppShell } from '@/components/layout/app-shell';
import { requireActiveTenant } from '@/lib/auth/context';
import { isUuid } from '@/lib/validation/auth';
import { redirect } from 'next/navigation';

export default async function TenantHomePage({ params }: Readonly<{ params: Promise<{ tenantId: string }> }>) {
  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  const membership = await requireActiveTenant(tenantId);
  const tenant = membership.tenants;

  return (
    <AppShell>
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm font-semibold text-emerald-300">Página inicial do restaurante</p>
        <h1 className="mt-2 text-3xl font-black">{tenant?.name}</h1>
        <p className="mt-3 max-w-3xl text-slate-300">Fundação SaaS ativa. Nesta etapa ainda não há cardápio, pedidos, cozinha, mesas ou pagamentos.</p>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-slate-500">Tenant ID</dt><dd className="break-all font-mono text-xs">{tenantId}</dd></div>
          <div><dt className="text-slate-500">Seu papel</dt><dd className="font-semibold">{membership.role}</dd></div>
          <div><dt className="text-slate-500">Status</dt><dd className="font-semibold">{tenant?.status}</dd></div>
        </dl>
      </section>
    </AppShell>
  );
}
