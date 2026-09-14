import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { requireActiveTenant } from '@/lib/auth/context';
import { getTenantModule, type TenantModuleSlug } from '@/lib/tenant/navigation';
import { isUuid } from '@/lib/validation/auth';

const moduleGuidance: Record<TenantModuleSlug, string[]> = {
  'visao-geral': ['Central operacional do restaurante.', 'Resumo rápido dos principais indicadores.'],
  cardapio: ['Categorias organizam o cardápio público.', 'Use nomes claros para facilitar pedido via QR.'],
  produtos: ['Itens com preço, imagem e disponibilidade.', 'Produtos indisponíveis deixam de aparecer para venda.'],
  adicionais: ['Complementos por produto.', 'Controle acréscimos e disponibilidade sem duplicar produtos.'],
  mesas: ['Mesas e setores com QR Code.', 'Ative apenas mesas liberadas para operação.'],
  pedidos: ['Pedidos recebidos via QR Code.', 'Avance status sem sair da fila operacional.'],
  cozinha: ['Fila de produção.', 'Acompanhe confirmados, preparo e prontos.'],
  caixa: ['Fechamento por mesa/pedido.', 'Registre pagamentos sem perder histórico.'],
  equipe: ['Usuários vinculados ao restaurante.', 'Papéis controlam acesso aos módulos.'],
  relatorios: ['Vendas, pagamentos e produtos do dia.', 'Indicadores usam apenas dados deste tenant.'],
  configuracoes: ['Dados cadastrais e operação.', 'Edições seguem permissões do restaurante.'],
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
    <AppShell tenantId={tenantId} activeModule={module}>
      <section className="space-y-6">
        <header className="mf-surface overflow-hidden">
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                <span className="mf-chip mf-status-red">{tenant?.name}</span>
                <span className="mf-chip">Papel: {membership.role}</span>
              </div>
              <h1 className="mf-page-title mt-4">{currentModule.label}</h1>
              <p className="mf-page-description mt-2">{currentModule.description}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Orientação rápida</p>
              <ul className="mt-3 space-y-2 text-sm font-semibold text-gray-600">
                {moduleGuidance[module].slice(0, 2).map((item) => (
                  <li key={item} className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" /><span>{item}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </header>

        {children ? <div className="space-y-5">{children}</div> : null}

        <footer className="flex flex-col justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 shadow-sm sm:flex-row sm:items-center">
          <span>Ambiente multi-tenant protegido por autenticação, vínculo e RLS.</span>
          <Link href={`/tenants/${tenantId}`} className="mf-btn-secondary w-fit">Voltar ao início</Link>
        </footer>
      </section>
    </AppShell>
  );
}
