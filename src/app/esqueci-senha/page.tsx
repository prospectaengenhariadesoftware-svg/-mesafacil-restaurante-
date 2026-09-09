import Link from 'next/link';
import { resetPasswordRequestAction } from '@/app/actions/auth';
import { AuthCard, Feedback, Field, SubmitButton } from '@/components/ui/auth-card';

export default async function EsqueciSenhaPage({ searchParams }: Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const erro = typeof params.erro === 'string' ? params.erro : undefined;
  const mensagem = typeof params.mensagem === 'string' ? params.mensagem : undefined;

  return (
    <AuthCard
      title="Recuperar senha"
      description="Informe o e-mail cadastrado para receber o link seguro de redefinição."
      footer={<Link className="text-emerald-300" href="/login">Voltar ao login</Link>}
    >
      <Feedback message={erro} />
      <Feedback message={mensagem} type="success" />
      <form action={resetPasswordRequestAction} className="space-y-4">
        <Field label="E-mail" name="email" type="email" autoComplete="email" />
        <SubmitButton>Enviar link</SubmitButton>
      </form>
    </AuthCard>
  );
}
