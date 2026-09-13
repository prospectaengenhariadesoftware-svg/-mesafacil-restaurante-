import { createTenantAction } from '@/app/actions/auth';
import { AppShell } from '@/components/layout/app-shell';
import { Feedback, Field, SubmitButton } from '@/components/ui/auth-card';
import { requireUser } from '@/lib/auth/context';

export default async function NovoRestaurantePage({ searchParams }: Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }>) {
  await requireUser();
  const params = (await searchParams) ?? {};
  const erro = typeof params.erro === 'string' ? params.erro : undefined;

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl rounded-3xl border border-stone-200 bg-white p-6">
        <p className="text-sm font-semibold text-red-600">Onboarding SaaS</p>
        <h1 className="mt-2 text-3xl font-black">Criar primeiro restaurante</h1>
        <p className="mt-3 text-stone-600">Este fluxo cria o tenant e vincula o usuário autenticado como owner em `tenant_users`.</p>
        <div className="mt-8">
          <Feedback message={erro} />
          <form action={createTenantAction} className="space-y-4">
            <Field label="Nome do restaurante" name="name" />
            <Field label="Razão social" name="legal_name" required={false} />
            <Field label="Documento" name="document" required={false} />
            <Field label="E-mail do restaurante" name="email" type="email" required={false} />
            <Field label="Telefone" name="phone" required={false} />
            <SubmitButton>Criar tenant/restaurante</SubmitButton>
          </form>
        </div>
      </section>
    </AppShell>
  );
}
