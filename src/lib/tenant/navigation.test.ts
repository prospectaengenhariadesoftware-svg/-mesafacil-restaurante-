import { describe, expect, it } from 'vitest';
import {
  getTenantMobileMoreNavigation,
  getTenantMobileNavigation,
  getTenantMobilePrimaryNavigation,
  getTenantNavigation,
  tenantMobileModuleSlugs,
  tenantMobileMoreModuleSlugs,
  tenantMobilePrimaryModuleSlugs,
  tenantModuleSlugs,
} from './navigation';

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

  it('keeps the requested mobile bar order and moves remaining modules into Mais', () => {
    const tenantId = '11111111-1111-4111-8111-111111111111';
    const primaryNav = getTenantMobilePrimaryNavigation(tenantId);
    const moreNav = getTenantMobileMoreNavigation(tenantId);
    const allMobileNav = getTenantMobileNavigation(tenantId);

    expect(tenantMobilePrimaryModuleSlugs).toEqual([
      'visao-geral',
      'pedidos',
      'cozinha',
      'caixa',
      'mesas',
      'cardapio',
    ]);
    expect(primaryNav.map((item) => item.slug)).toEqual(tenantMobilePrimaryModuleSlugs);
    expect(moreNav.map((item) => item.slug)).toEqual([
      'produtos',
      'adicionais',
      'equipe',
      'relatorios',
      'configuracoes',
    ]);
    expect(tenantMobileMoreModuleSlugs).toEqual(moreNav.map((item) => item.slug));
    expect(allMobileNav.map((item) => item.slug)).toEqual(tenantMobileModuleSlugs);
    expect(new Set(allMobileNav.map((item) => item.slug))).toEqual(new Set(tenantModuleSlugs));
    expect(allMobileNav.every((item) => item.href.startsWith(`/tenants/${tenantId}`))).toBe(true);
  });
});
