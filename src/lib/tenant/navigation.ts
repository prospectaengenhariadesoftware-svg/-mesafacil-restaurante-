export const tenantModuleSlugs = [
  'visao-geral',
  'cardapio',
  'produtos',
  'mesas',
  'pedidos',
  'cozinha',
  'caixa',
  'equipe',
  'relatorios',
  'configuracoes',
] as const;

export type TenantModuleSlug = (typeof tenantModuleSlugs)[number];

export type TenantNavigationItem = {
  slug: TenantModuleSlug;
  label: string;
  description: string;
  href: string;
};

const moduleLabels: Record<TenantModuleSlug, Omit<TenantNavigationItem, 'slug' | 'href'>> = {
  'visao-geral': {
    label: 'Visão geral',
    description: 'Resumo inicial do restaurante e próximos passos.',
  },
  cardapio: {
    label: 'Cardápio',
    description: 'Estrutura inicial para categorias e itens do cardápio.',
  },
  produtos: {
    label: 'Produtos',
    description: 'Base futura para cadastro de produtos e disponibilidade.',
  },
  mesas: {
    label: 'Mesas',
    description: 'Base futura para mesas, QR Codes e setores.',
  },
  pedidos: {
    label: 'Pedidos',
    description: 'Base futura para acompanhamento de pedidos.',
  },
  cozinha: {
    label: 'Cozinha',
    description: 'Base futura para fila operacional da cozinha.',
  },
  caixa: {
    label: 'Caixa',
    description: 'Base futura para fechamento e conferência de consumo.',
  },
  equipe: {
    label: 'Equipe',
    description: 'Usuários, papéis e vínculos do restaurante.',
  },
  relatorios: {
    label: 'Relatórios',
    description: 'Base futura para indicadores e auditoria gerencial.',
  },
  configuracoes: {
    label: 'Configurações',
    description: 'Dados cadastrais e preferências iniciais do tenant.',
  },
};

export function getTenantNavigation(tenantId: string): TenantNavigationItem[] {
  const base = `/tenants/${tenantId}`;
  return tenantModuleSlugs.map((slug) => ({
    slug,
    href: slug === 'visao-geral' ? base : `${base}/${slug}`,
    ...moduleLabels[slug],
  }));
}

export function getTenantModule(slug: TenantModuleSlug, tenantId: string): TenantNavigationItem {
  return getTenantNavigation(tenantId).find((item) => item.slug === slug)!;
}
