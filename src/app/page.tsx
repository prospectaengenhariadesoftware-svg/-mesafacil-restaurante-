import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 py-16 lg:flex-row lg:items-center">
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">MesaFácil SaaS</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">Fundação segura para restaurantes independentes.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Plataforma multi-tenant com autenticação, vínculo de usuários por tenant, RLS no Supabase e base preparada para evolução comercial.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/cadastro" className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-300">Criar conta</Link>
            <Link href="/login" className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-100 hover:border-emerald-300 hover:text-emerald-300">Entrar</Link>
          </div>
        </div>
        <div className="flex-1 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Etapa 1 ativa</h2>
          <ul className="mt-5 space-y-3 text-slate-300">
            <li>✅ Cadastro, login, logout e recuperação de senha</li>
            <li>✅ Criação do primeiro tenant/restaurante</li>
            <li>✅ Vínculo owner em tenant_users</li>
            <li>✅ Rotas autenticadas protegidas</li>
            <li>✅ RLS e audit_logs preparados no banco</li>
            <li>⚪ Cardápio, pedidos, cozinha e pagamentos ficam para próximas etapas</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
