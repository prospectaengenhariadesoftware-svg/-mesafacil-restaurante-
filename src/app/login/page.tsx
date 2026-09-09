import Link from 'next/link';
import { signInAction } from '@/app/actions/auth';
import { AuthCard, Feedback, Field, SubmitButton } from '@/components/ui/auth-card';

export default async function LoginPage({ searchParams }: Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const erro = typeof params.erro === 'string' ? params.erro : undefined;
  const mensagem = typeof params.mensagem === 'string' ? params.mensagem : undefined;
  const next = typeof params.next === 'string' ? params.next : '/dashboard';

  return (
    <AuthCard
      title="Entrar"
      description="Acesse a área segura do MesaFácil. Rotas internas exigem autenticação e vínculo com tenant."
      footer={<><span>Não tem conta? </span><Link className="text-emerald-300" href="/cadastro">Criar cadastro</Link></>}
    >
      <Feedback message={erro} />
      <Feedback message={mensagem} type="success" />
      <form action={signInAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label="E-mail" name="email" type="email" autoComplete="email" />
        <Field label="Senha" name="password" type="password" autoComplete="current-password" />
        <div className="text-right text-sm"><Link className="text-emerald-300" href="/esqueci-senha">Esqueci minha senha</Link></div>
        <SubmitButton>Entrar com segurança</SubmitButton>
      </form>
    </AuthCard>
  );
}
