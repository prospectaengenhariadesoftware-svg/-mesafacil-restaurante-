import { requirePlatformAdmin } from '@/lib/auth/context';
import { AppIcon, type AppIconName } from '@/components/design-system/app-icon';
import { Button, DataTable, EmptyState, FilterBar, ListCard, MetricCard, MobileListCard, PageHeader, SearchBar, StatusBadge } from '@/components/design-system/primitives';

const icons: { name: AppIconName; label: string }[] = [
  { name: 'home', label: 'Início' },
  { name: 'orders', label: 'Pedidos' },
  { name: 'tables', label: 'Mesas' },
  { name: 'kitchen', label: 'Cozinha' },
  { name: 'cash', label: 'Caixa' },
  { name: 'menu', label: 'Cardápio' },
  { name: 'products', label: 'Produtos' },
  { name: 'addons', label: 'Adicionais' },
  { name: 'reports', label: 'Relatórios' },
  { name: 'team', label: 'Equipe' },
  { name: 'settings', label: 'Configurações' },
  { name: 'search', label: 'Busca' },
  { name: 'eye', label: 'Visualizar' },
  { name: 'printer', label: 'Imprimir' },
  { name: 'more', label: 'Mais' },
];

const colors = [
  ['Primária', '#dc2626'],
  ['Sucesso', '#16a34a'],
  ['Atenção', '#f59e0b'],
  ['Info', '#3b82f6'],
  ['Erro', '#ef4444'],
  ['Fundo', '#fbfafc'],
  ['Superfície', '#ffffff'],
  ['Borda', '#e5e7eb'],
  ['Texto', '#111827'],
  ['Texto secundário', '#6b7280'],
];

export default async function DesignSystemPage() {
  await requirePlatformAdmin();

  return (
    <main className="min-h-screen bg-[#fbfafc] px-4 py-8 text-gray-950 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHeader
          eyebrow="MesaFácil Design System v1"
          title="Referência oficial de interface"
          description="Página interna protegida para validar cores, ícones, botões, cards, status, tabelas e padrões mobile antes de propagar para o restante do sistema."
          action={<Button href="/super-admin" variant="secondary">Voltar</Button>}
        />

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {colors.map(([label, value]) => (
            <ListCard key={label}>
              <div className="h-14 rounded-xl border border-gray-200" style={{ background: value }} />
              <p className="mt-3 text-sm font-black">{label}</p>
              <p className="mt-1 text-xs font-semibold text-gray-500">{value}</p>
            </ListCard>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <ListCard>
            <h2 className="text-xl font-black">Ícones outline padronizados</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {icons.map((icon) => (
                <div key={icon.name} className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                  <AppIcon name={icon.name} size={22} className="mx-auto text-gray-800" />
                  <p className="mt-2 text-xs font-bold text-gray-600">{icon.label}</p>
                </div>
              ))}
            </div>
          </ListCard>

          <ListCard>
            <h2 className="text-xl font-black">Botões, inputs e status</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button><AppIcon name="plus" size={16} />Ação principal</Button>
              <Button variant="secondary">Ação secundária</Button>
              <Button variant="ghost"><AppIcon name="more" size={16} />Mais</Button>
            </div>
            <div className="mt-5"><SearchBar placeholder="Buscar pedido, mesa ou cliente..." /></div>
            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge tone="danger">AGUARDANDO</StatusBadge>
              <StatusBadge tone="warning">EM PREPARO</StatusBadge>
              <StatusBadge tone="success">PRONTO</StatusBadge>
              <StatusBadge tone="info">ENTREGUE</StatusBadge>
              <StatusBadge tone="neutral">CANCELADO</StatusBadge>
            </div>
          </ListCard>
        </section>

        <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <MetricCard icon="orders" label="Pedidos hoje" value="12" hint="↑ 20%" tone="brand" />
          <MetricCard icon="clock" label="Aguardando" value="2" tone="danger" />
          <MetricCard icon="kitchen" label="Em preparo" value="4" tone="warning" />
          <MetricCard icon="check" label="Pronto" value="3" tone="success" />
          <MetricCard icon="bag" label="Entregues" value="3" tone="info" />
          <MetricCard icon="x" label="Cancelados" value="0" tone="neutral" />
        </section>

        <ListCard>
          <h2 className="text-xl font-black">Filtros e tabela</h2>
          <div className="mt-4"><FilterBar><Button>Todos</Button><Button variant="secondary">Aguardando</Button><Button variant="secondary">Em preparo</Button><SearchBar placeholder="Buscar..." /></FilterBar></div>
          <div className="mt-4">
            <DataTable>
              <thead className="bg-gray-50 text-xs font-black uppercase tracking-[0.12em] text-gray-500"><tr><th className="px-4 py-3">Pedido</th><th className="px-4 py-3">Mesa</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Ações</th></tr></thead>
              <tbody className="divide-y divide-gray-100"><tr><td className="px-4 py-4 font-black">#1042</td><td className="px-4 py-4">Mesa 5</td><td className="px-4 py-4">Consumo local</td><td className="px-4 py-4 font-black">R$ 48,90</td><td className="px-4 py-4"><StatusBadge tone="warning">EM PREPARO</StatusBadge></td><td className="px-4 py-4"><div className="flex gap-2"><AppIcon name="eye" size={16} /><AppIcon name="printer" size={16} /><AppIcon name="more" size={16} /></div></td></tr></tbody>
            </DataTable>
          </div>
        </ListCard>

        <section className="grid gap-4 md:grid-cols-2">
          <MobileListCard><div className="flex justify-between"><p className="font-black">#1042</p><p className="font-black">R$ 48,90</p></div><p className="mt-2 text-sm font-semibold text-gray-600">Mesa 5</p><p className="mt-1 text-xs text-gray-500">3 itens • 12:15</p><div className="mt-3 flex justify-end"><StatusBadge tone="warning">EM PREPARO</StatusBadge></div></MobileListCard>
          <EmptyState title="Nenhum pedido encontrado" description="Quando houver pedidos no filtro selecionado, eles aparecerão aqui." />
        </section>
      </div>
    </main>
  );
}
