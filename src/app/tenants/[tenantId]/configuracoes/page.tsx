import { redirect } from 'next/navigation';
import { SettingsPanel } from '@/components/tenant/operational-panels';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { Tenant } from '@/lib/types/saas';
import { isUuid } from '@/lib/validation/auth';

export default async function ConfiguracoesPage({ params }: Readonly<{ params: Promise<{ tenantId: string }> }>) {
  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  await requireActiveTenant(tenantId);

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, legal_name, document, email, phone, status, public_slug, created_at, updated_at')
    .eq('id', tenantId)
    .single();

  if (!tenant) redirect('/dashboard?erro=tenant-nao-encontrado');

  return (
    <TenantModulePage tenantId={tenantId} module="configuracoes">
      <SettingsPanel tenant={tenant as Tenant & { public_slug?: string | null }} />
    </TenantModulePage>
  );
}
