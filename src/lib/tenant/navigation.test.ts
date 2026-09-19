import { describe, expect, it } from 'vitest';
import { getTenantMobileNavigation, getTenantNavigation, tenantMobileModuleSlugs, tenantModuleSlugs } from './navigation';

describe('tenant module navigation', () => {
  it('keeps only approved tenant module pages in this structural phase', () => {
    expect(tenantModuleSlugs).toEqual([
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
    ]);
  });

  it('builds tenant-scoped hrefs and never uses a global operational route', () => {
    const nav = getTenantNavigation('11111111-1111-4111-8111-111111111111');

    expect(nav).toHaveLength(11);
    expect(nav.every((item) => item.href.startsWith('/tenants/11111111-1111-4111-8111-111111111111'))).toBe(true);
    expect(nav.some((item) => item.href === '/admin/kitchen')).toBe(false);
  });

  it('keeps every tenant module reachable from the horizontally scrollable mobile navigation', () => {
    const nav = getTenantMobileNavigation('11111111-1111-4111-8111-111111111111');

    expect(tenantMobileModuleSlugs).toEqual(tenantModuleSlugs);
    expect(nav.map((item) => item.slug)).toEqual(tenantModuleSlugs);
    expect(nav).toHaveLength(11);
    expect(nav.map((item) => item.label)).not.toContain('Mais');
    expect(nav.every((item) => item.href.startsWith('/tenants/11111111-1111-4111-8111-111111111111'))).toBe(true);
  });
});
