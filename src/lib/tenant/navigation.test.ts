import { describe, expect, it } from 'vitest';
import { getTenantNavigation, tenantModuleSlugs } from './navigation';

describe('tenant module navigation', () => {
  it('keeps only approved tenant module pages in this structural phase', () => {
    expect(tenantModuleSlugs).toEqual([
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
    ]);
  });

  it('builds tenant-scoped hrefs and never uses a global operational route', () => {
    const nav = getTenantNavigation('11111111-1111-4111-8111-111111111111');

    expect(nav).toHaveLength(10);
    expect(nav.every((item) => item.href.startsWith('/tenants/11111111-1111-4111-8111-111111111111'))).toBe(true);
    expect(nav.some((item) => item.href === '/admin/kitchen')).toBe(false);
  });
});
