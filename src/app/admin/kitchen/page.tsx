import { AppShell } from '@/components/layout/app-shell';
import { requireUser } from '@/lib/auth/context';

export default async function KitchenPlaceholderPage() {
  await requireUser();
  return (
    <AppShell>
      <section className="rounded-3xl border border-amber-500/30 bg-amber-950/20 p-6">
        <p className="text-sm font-semibold text-amber-300">Módulo não iniciado</p>
        <h1 className="mt-2 text-3xl font-black">Cozinha ainda não faz parte da Etapa 1</h1>
        <p className="mt-3 text-slate-300">Esta rota está protegida por autenticação e permanece apenas como placeholder. Pedidos/cozinha serão implementados somente em etapa futura autorizada.</p>
      </section>
    </AppShell>
  );
}
