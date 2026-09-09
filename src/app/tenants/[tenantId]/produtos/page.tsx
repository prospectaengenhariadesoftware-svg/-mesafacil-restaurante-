import { ProductForm, ProductList } from '@/components/catalog/product-manager';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { Product, ProductCategory } from '@/lib/types/catalog';
import { isUuid } from '@/lib/validation/auth';
import { redirect } from 'next/navigation';

export default async function ProdutosPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ mensagem?: string; erro?: string }>;
}>) {
  const { tenantId } = await params;
  const feedback = await searchParams;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  await requireActiveTenant(tenantId);

  const supabase = await createClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from('tenant_product_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('tenant_products')
      .select('*, tenant_product_categories(*)')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true }),
  ]);

  return (
    <TenantModulePage tenantId={tenantId} module="produtos">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <ProductForm tenantId={tenantId} categories={(categories ?? []) as ProductCategory[]} />
        <ProductList products={(products ?? []) as Product[]} />
      </div>
      {feedback.mensagem ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{feedback.mensagem}</p> : null}
      {feedback.erro ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{feedback.erro}</p> : null}
    </TenantModulePage>
  );
}
