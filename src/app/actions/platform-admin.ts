'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePlatformAdmin } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { getTenantStatusActionMetadata, validateTenantStatusActionInput } from '@/lib/validation/platform-admin';

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function fail(message: string): never {
  redirect(`/super-admin?erro=${encodeURIComponent(message)}`);
}

export async function updateTenantPlatformStatusAction(formData: FormData) {
  const { user, platformAdmin } = await requirePlatformAdmin();
  const validation = validateTenantStatusActionInput({
    tenantId: getString(formData, 'tenantId'),
    action: getString(formData, 'action'),
    confirmation: getString(formData, 'confirmation'),
    notes: getString(formData, 'notes'),
  });

  if (!validation.success) fail(validation.error);

  const metadata = getTenantStatusActionMetadata(validation.data.action);
  const supabase = await createClient();

  const { data: currentTenant, error: currentError } = await supabase
    .from('tenants')
    .select('id, name, status')
    .eq('id', validation.data.tenantId)
    .single();

  if (currentError || !currentTenant) fail('Tenant não encontrado ou sem permissão de plataforma.');

  if (currentTenant.status === 'cancelled') {
    fail('Tenant cancelado não pode ser reativado por esta ação.');
  }

  if (validation.data.action === 'block' && currentTenant.status === 'blocked') {
    fail('Este tenant já está bloqueado.');
  }

  if (validation.data.action === 'unblock' && currentTenant.status !== 'blocked') {
    fail('Somente tenants bloqueados podem ser desbloqueados por esta ação.');
  }

  const auditMetadata = {
    actor_platform_admin_id: platformAdmin.id,
    actor_platform_role: platformAdmin.role,
    previous_status: currentTenant.status,
    next_status: validation.data.nextStatus,
    notes: validation.data.notes,
  };

  const { error: auditRequestError } = await supabase.from('audit_logs').insert({
    tenant_id: validation.data.tenantId,
    user_id: user.id,
    action: `${metadata.auditAction}.requested`,
    entity: 'tenant',
    entity_id: validation.data.tenantId,
    metadata: auditMetadata,
  });

  if (auditRequestError) fail('Não foi possível iniciar auditoria da ação administrativa. Nenhuma alteração foi feita.');

  const { data: updatedTenant, error: updateError } = await supabase
    .from('tenants')
    .update({ status: validation.data.nextStatus })
    .eq('id', validation.data.tenantId)
    .eq('status', currentTenant.status)
    .select('id')
    .maybeSingle();

  if (updateError || !updatedTenant) {
    fail('Status do tenant mudou durante a operação. Recarregue a tela e tente novamente.');
  }

  const { error: auditError } = await supabase.from('audit_logs').insert({
    tenant_id: validation.data.tenantId,
    user_id: user.id,
    action: metadata.auditAction,
    entity: 'tenant',
    entity_id: validation.data.tenantId,
    metadata: auditMetadata,
  });

  if (auditError) fail('Status alterado e auditoria inicial registrada, mas a auditoria final falhou. Verifique manualmente antes de novas ações.');

  revalidatePath('/super-admin');
  revalidatePath('/dashboard');
  redirect(`/super-admin?mensagem=${encodeURIComponent(metadata.successMessage)}`);
}
