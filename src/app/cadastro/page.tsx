import Link from 'next/link';
import { signUpAction } from '@/app/actions/auth';
import { AuthCard, Feedback, Field, SubmitButton } from '@/components/ui/auth-card';

export default async function CadastroPage({ searchParams }: Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const erro = typeof params.erro === 'string' ? params.erro : undefined;

  return (
    <AuthCard
      title="Criar conta de proprietário"
      description="Crie sua conta e, em seguida, cadastre o primeiro restaurante/tenant."
      footer={<><span>Já tem conta? </span><Link className="text-emerald-300" href="/login">Entrar</Link></>}
    >
      <Feedback message={erro} />
      <form action={signUpAction} className="space-y-4">
        <Field label="Nome" name="name" autoComplete="name" />
        <Field label="E-mail" name="email" type="email" autoComplete="email" />
        <Field label="Senha" name="password" type="password" autoComplete="new-password" />
        <p className="text-xs leading-5 text-slate-400">Use no mínimo 8 caracteres, com letras e números.</p>
        <SubmitButton>Criar conta</SubmitButton>
      </form>
    </AuthCard>
  );
}
