import { TenantModulePage } from '@/components/tenant/tenant-module-page';

export default async function Page({ params }: Readonly<{ params: Promise<{ tenantId: string }> }>) {
  const { tenantId } = await params;
  return <TenantModulePage tenantId={tenantId} module="configuracoes" />;
}
