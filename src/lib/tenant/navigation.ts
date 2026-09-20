export const tenantModuleSlugs = [
  'visao-geral',
  'cardapio',
  'produtos',
  'adicionais',
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

export const tenantMobilePrimaryModuleSlugs = [
  'visao-geral',
  'pedidos',
  'cozinha',
  'caixa',
  'mesas',
  'cardapio',
] as const satisfies readonly TenantModuleSlug[];

export const tenantMobileMoreModuleSlugs = tenantModuleSlugs.filter(
  (slug) => !(tenantMobilePrimaryModuleSlugs as readonly TenantModuleSlug[]).includes(slug),
) as TenantModuleSlug[];

export const tenantMobileModuleSlugs = [
  ...tenantMobilePrimaryModuleSlugs,
  ...tenantMobileMoreModuleSlugs,
] as const satisfies readonly TenantModuleSlug[];

const moduleLabels: Record<TenantModuleSlug, Omit<TenantNavigationItem, 'slug' | 'href'>> = {
  'visao-geral': {
    label: 'Visão geral',
    description: 'Resumo inicial do restaurante e próximos passos.',
  },
  cardapio: {
    label: 'Cardápio',
    description: 'Categorias do cardápio protegidas por tenant.',
  },
  produtos: {
    label: 'Produtos',
    description: 'Cadastro de produtos, preço e disponibilidade.',
  },
  adicionais: {
    label: 'Adicionais',
    description: 'Complementos e acréscimos vinculados aos produtos.',
  },
  mesas: {
    label: 'Mesas',
    description: 'Mesas, setores e QR Codes do cardápio público.',
  },
  pedidos: {
    label: 'Pedidos',
    description: 'Acompanhamento dos pedidos recebidos via QR Code.',
  },
  cozinha: {
    label: 'Cozinha',
    description: 'Fila operacional de preparo e entrega.',
  },
  caixa: {
    label: 'Caixa',
    description: 'Fechamento de contas e registro de pagamentos por mesa.',
  },
  equipe: {
    label: 'Equipe',
    description: 'Usuários, papéis e vínculos do restaurante.',
  },
  relatorios: {
    label: 'Relatórios',
    description: 'Indicadores de pedidos, receita, cardápio e mesas.',
  },
  configuracoes: {
    label: 'Configurações',
    description: 'Dados cadastrais, status e identificação pública do tenant.',
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

function pickTenantNavigation(tenantId: string, slugs: readonly TenantModuleSlug[]): TenantNavigationItem[] {
  const navBySlug = new Map(getTenantNavigation(tenantId).map((item) => [item.slug, item]));
  return slugs.map((slug) => navBySlug.get(slug)).filter((item): item is TenantNavigationItem => Boolean(item));
}

export function getTenantMobilePrimaryNavigation(tenantId: string): TenantNavigationItem[] {
  return pickTenantNavigation(tenantId, tenantMobilePrimaryModuleSlugs);
}

export function getTenantMobileMoreNavigation(tenantId: string): TenantNavigationItem[] {
  return pickTenantNavigation(tenantId, tenantMobileMoreModuleSlugs);
}

export function getTenantMobileNavigation(tenantId: string): TenantNavigationItem[] {
  return pickTenantNavigation(tenantId, tenantMobileModuleSlugs);
}

export function getTenantModule(slug: TenantModuleSlug, tenantId: string): TenantNavigationItem {
  return getTenantNavigation(tenantId).find((item) => item.slug === slug)!;
}
