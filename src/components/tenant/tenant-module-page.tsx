import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { requireActiveTenant } from '@/lib/auth/context';
import { getTenantModule, type TenantModuleSlug } from '@/lib/tenant/navigation';
import { isUuid } from '@/lib/validation/auth';

const moduleGuidance: Record<TenantModuleSlug, string[]> = {
  'visao-geral': [
    'Conferir dados do restaurante e vínculos do usuário.',
    'Acompanhar se a fundação SaaS está pronta antes dos módulos operacionais.',
  ],
  cardapio: [
    'Categorias do cardápio já podem ser cadastradas por tenant.',
    'Os produtos usam essas categorias como vínculo obrigatório.',
  ],
  produtos: [
    'Produtos já podem ser cadastrados com categoria, descrição, preço e disponibilidade.',
    'O vínculo produto-categoria é validado no app e protegido por RLS no banco.',
  ],
  mesas: [
    'Mesas já podem ser cadastradas com identificação, lugares, setor e token de QR Code.',
    'A geração visual de QR Code fica para etapa posterior.',
  ],
  pedidos: [
    'Página reservada para listagem e status dos pedidos.',
    'Ainda não há criação ou processamento de pedido nesta entrega.',
  ],
  cozinha: [
    'Página reservada para fila da cozinha.',
    'Ainda não há fluxo operacional de preparo nesta entrega.',
  ],
  caixa: [
    'Página reservada para conferência, recebimentos e fechamento.',
    'Nenhuma integração de pagamento foi criada nesta entrega.',
  ],
  equipe: [
    'Página reservada para usuários, papéis e permissões do restaurante.',
    'A base tenant_users já protege vínculos por tenant_id.',
  ],
  relatorios: [
    'Página reservada para indicadores, auditoria e gestão.',
    'Os dados reais virão dos módulos operacionais futuros.',
  ],
  configuracoes: [
    'Página reservada para dados cadastrais e preferências do restaurante.',
    'Alterações avançadas devem ser validadas por role e RLS.',
  ],
};

export async function TenantModulePage({
  tenantId,
  module,
  children,
}: Readonly<{
  tenantId: string;
  module: TenantModuleSlug;
  children?: React.ReactNode;
}>) {
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');

  const membership = await requireActiveTenant(tenantId);
  const tenant = membership.tenants;
  const currentModule = getTenantModule(module, tenantId);

  return (
    <AppShell tenantId={tenantId}>
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold text-emerald-300">{tenant?.name}</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black">{currentModule.label}</h1>
              <p className="mt-2 max-w-3xl text-slate-300">{currentModule.description}</p>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
              Papel: {membership.role}
            </span>
          </div>
        </div>

        {children ? <div className="space-y-5">{children}</div> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-bold text-slate-100">Estado atual</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Página protegida por tenant. Quando houver formulário neste módulo, os cadastros são gravados com tenant_id e respeitam as policies RLS do Supabase.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-bold text-slate-100">Segurança SaaS</h2>
            <p className="mt-2 break-all font-mono text-xs text-slate-400">tenant_id: {tenantId}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">A autorização depende do vínculo em tenant_users e das policies RLS do Supabase.</p>
          </article>
        </div>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-bold text-slate-100">Próximos passos deste módulo</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {moduleGuidance[module].map((item) => (
              <li key={item} className="flex gap-2"><span className="text-emerald-300">•</span><span>{item}</span></li>
            ))}
          </ul>
        </article>

        <Link href={`/tenants/${tenantId}`} className="inline-flex rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-emerald-300 hover:text-emerald-300">
          Voltar para visão geral
        </Link>
      </section>
    </AppShell>
  );
}
