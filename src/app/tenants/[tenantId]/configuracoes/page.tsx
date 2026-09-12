import { redirect } from 'next/navigation';
import { RestaurantSettingsForm } from '@/components/tenant/restaurant-settings-form';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { Tenant, TenantSettings } from '@/lib/types/saas';
import { isUuid } from '@/lib/validation/auth';

type ConfiguracoesSearchParams = {
  mensagem?: string;
  erro?: string;
};

function decodeFeedback(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function ConfiguracoesPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<ConfiguracoesSearchParams>;
}>) {
  const { tenantId } = await params;
  const rawParams = await searchParams;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  const membership = await requireActiveTenant(tenantId);

  const supabase = await createClient();
  const [{ data: tenant, error: tenantError }, { data: settings, error: settingsError }] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, name, legal_name, document, email, phone, status, public_slug, created_at, updated_at')
      .eq('id', tenantId)
      .single(),
    supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
  ]);

  if (!tenant || tenantError) redirect('/dashboard?erro=tenant-nao-encontrado');
  const loadError = settingsError ? 'Não foi possível carregar as configurações operacionais.' : null;
  const feedback = {
    mensagem: decodeFeedback(rawParams.mensagem),
    erro: decodeFeedback(rawParams.erro),
  };

  return (
    <TenantModulePage tenantId={tenantId} module="configuracoes">
      {loadError ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{loadError}</p> : null}
      {feedback.mensagem ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{feedback.mensagem}</p> : null}
      {feedback.erro ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{feedback.erro}</p> : null}
      {loadError ? null : <RestaurantSettingsForm tenant={tenant as Tenant} settings={(settings ?? null) as TenantSettings | null} role={membership.role} />}
    </TenantModulePage>
  );
}
