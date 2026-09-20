import { redirect } from 'next/navigation';
import { PublicSiteForm } from '@/components/tenant/public-site-form';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { TenantPublicProfile } from '@/lib/types/public-site';
import { isUuid } from '@/lib/validation/auth';

type SiteSearchParams = {
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

export default async function TenantSitePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<SiteSearchParams>;
}>) {
  const { tenantId } = await params;
  const rawParams = await searchParams;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  const membership = await requireActiveTenant(tenantId);

  const supabase = await createClient();
  const [{ data: tenant, error: tenantError }, { data: profile, error: profileError }] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, name, public_slug')
      .eq('id', tenantId)
      .single(),
    supabase
      .from('tenant_public_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
  ]);

  if (!tenant || tenantError) redirect('/dashboard?erro=tenant-nao-encontrado');
  const feedback = {
    mensagem: decodeFeedback(rawParams.mensagem),
    erro: decodeFeedback(rawParams.erro),
  };
  const loadError = profileError ? 'Não foi possível carregar o site público.' : null;

  return (
    <TenantModulePage tenantId={tenantId} module="site">
      {loadError ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p> : null}
      {feedback.mensagem ? <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{feedback.mensagem}</p> : null}
      {feedback.erro ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{feedback.erro}</p> : null}
      {loadError ? null : (
        <PublicSiteForm
          tenantId={tenantId}
          tenantName={tenant.name}
          tenantSlug={tenant.public_slug}
          profile={(profile ?? null) as TenantPublicProfile | null}
          role={membership.role}
        />
      )}
    </TenantModulePage>
  );
}
