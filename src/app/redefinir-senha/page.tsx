import { updatePasswordAction } from '@/app/actions/auth';
import { AuthCard, Feedback, Field, SubmitButton } from '@/components/ui/auth-card';

export default async function RedefinirSenhaPage({ searchParams }: Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const erro = typeof params.erro === 'string' ? params.erro : undefined;

  return (
    <AuthCard title="Redefinir senha" description="Defina uma nova senha para sua conta MesaFácil.">
      <Feedback message={erro} />
      <form action={updatePasswordAction} className="space-y-4">
        <Field label="Nova senha" name="password" type="password" autoComplete="new-password" />
        <SubmitButton>Atualizar senha</SubmitButton>
      </form>
    </AuthCard>
  );
}
