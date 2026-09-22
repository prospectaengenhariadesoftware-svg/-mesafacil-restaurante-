import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('tenant desktop shell consistency', () => {
  it('renders generic tenant module pages inside the Design System shell', () => {
    const source = readSource('src/components/tenant/tenant-module-page.tsx');

    expect(source).toContain("import { DesignSystemShell } from '@/components/design-system/ds-shell';");
    expect(source).toContain('<DesignSystemShell tenantId={tenantId} activeModule={module}>');
    expect(source).not.toContain("import { AppShell } from '@/components/layout/app-shell';");
  });

  it('keeps the tenant home in the same desktop sidebar shell as tenant modules', () => {
    const source = readSource('src/app/tenants/[tenantId]/page.tsx');

    expect(source).toContain("import { DesignSystemShell } from '@/components/design-system/ds-shell';");
    expect(source).toContain('<DesignSystemShell tenantId={tenantId} activeModule="visao-geral">');
    expect(source).not.toContain("import { AppShell } from '@/components/layout/app-shell';");
  });
});
