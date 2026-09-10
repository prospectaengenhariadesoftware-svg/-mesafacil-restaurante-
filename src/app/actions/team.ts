'use server';

import { redirect } from 'next/navigation';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { TenantRole } from '@/lib/types/saas';
import { isUuid } from '@/lib/validation/auth';
import { isProtectedOwnerDemotion, validateTeamInviteInput, validateTeamMemberInput } from '@/lib/validation/team';

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function fail(path: string, message: string): never {
  redirect(`${path}?erro=${encodeURIComponent(message)}`);
}

function requireTenantId(formData: FormData): string {
  const tenantId = getString(formData, 'tenantId');
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  return tenantId;
}

async function requireTenantAdmin(tenantId: string, path: string) {
  const membership = await requireActiveTenant(tenantId);
  if (!['owner', 'admin'].includes(membership.role)) {
    fail(path, 'Apenas owner/admin pode gerenciar equipe.');
  }
  return membership;
}

async function getActiveOwnerCount(tenantId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('tenant_users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('role', 'owner')
    .eq('status', 'active');
  if (error) return { count: null, error };
  return { count: count ?? 0, error: null };
}

export async function createTeamMemberAction(formData: FormData) {
  const tenantId = requireTenantId(formData);
  const path = `/tenants/${tenantId}/equipe`;
  await requireTenantAdmin(tenantId, path);

  const validation = validateTeamInviteInput({
    email: getString(formData, 'email'),
    role: getString(formData, 'role'),
    status: getString(formData, 'status'),
  });
  if (!validation.success) fail(path, validation.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc('add_tenant_user_by_email', {
    target_tenant_id: tenantId,
    target_email: validation.data.email,
    target_role: validation.data.role,
    target_status: validation.data.status,
  });
  if (error) {
    fail(path, 'Não foi possível adicionar o membro. Confirme se o usuário já possui cadastro no MesaFácil e se você tem permissão.');
  }

  redirect(`${path}?mensagem=${encodeURIComponent('Membro adicionado ou reativado com sucesso.')}`);
}

export async function updateTeamMemberAction(formData: FormData) {
  const tenantId = requireTenantId(formData);
  const memberId = getString(formData, 'memberId');
  const path = `/tenants/${tenantId}/equipe`;
  const actorMembership = await requireTenantAdmin(tenantId, path);
  if (!isUuid(memberId)) fail(path, 'Membro inválido.');

  const validation = validateTeamMemberInput({
    role: getString(formData, 'role'),
    status: getString(formData, 'status'),
  });
  if (!validation.success) fail(path, validation.error);

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from('tenant_users')
    .select('id, role, status')
    .eq('tenant_id', tenantId)
    .eq('id', memberId)
    .single();
  if (currentError || !current) fail(path, 'Membro não encontrado ou sem permissão.');
  if ((current.role === 'owner' || validation.data.role === 'owner') && actorMembership.role !== 'owner') {
    fail(path, 'Apenas owner pode conceder, alterar ou remover papel owner.');
  }

  const { count: activeOwnerCount, error: ownerCountError } = await getActiveOwnerCount(tenantId);
  if (ownerCountError || activeOwnerCount === null) fail(path, 'Não foi possível validar owners ativos.');
  if (isProtectedOwnerDemotion({
    currentRole: current.role as TenantRole,
    nextRole: validation.data.role,
    nextStatus: validation.data.status,
    activeOwnerCount,
  })) {
    fail(path, 'Não é permitido remover ou rebaixar o último owner ativo do restaurante.');
  }

  const { error } = await supabase
    .from('tenant_users')
    .update({ role: validation.data.role, status: validation.data.status })
    .eq('tenant_id', tenantId)
    .eq('id', memberId)
    .select('id')
    .single();
  if (error) fail(path, 'Não foi possível atualizar o membro com auditoria transacional.');

  redirect(`${path}?mensagem=${encodeURIComponent('Membro atualizado com sucesso.')}`);
}

export async function removeTeamMemberAction(formData: FormData) {
  const tenantId = requireTenantId(formData);
  const memberId = getString(formData, 'memberId');
  const path = `/tenants/${tenantId}/equipe`;
  const actorMembership = await requireTenantAdmin(tenantId, path);
  if (!isUuid(memberId)) fail(path, 'Membro inválido.');
  if (getString(formData, 'confirmDelete') !== 'CONFIRMAR') fail(path, 'Confirme a remoção do membro.');

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from('tenant_users')
    .select('id, role, status')
    .eq('tenant_id', tenantId)
    .eq('id', memberId)
    .single();
  if (currentError || !current) fail(path, 'Membro não encontrado ou sem permissão.');
  if (current.role === 'owner' && actorMembership.role !== 'owner') {
    fail(path, 'Apenas owner pode remover outro owner.');
  }

  const { count: activeOwnerCount, error: ownerCountError } = await getActiveOwnerCount(tenantId);
  if (ownerCountError || activeOwnerCount === null) fail(path, 'Não foi possível validar owners ativos.');
  if (isProtectedOwnerDemotion({
    currentRole: current.role as TenantRole,
    nextRole: current.role as TenantRole,
    nextStatus: 'removed',
    activeOwnerCount,
  })) {
    fail(path, 'Não é permitido remover o último owner ativo do restaurante.');
  }

  const { error } = await supabase
    .from('tenant_users')
    .update({ status: 'removed' })
    .eq('tenant_id', tenantId)
    .eq('id', memberId)
    .select('id')
    .single();
  if (error) fail(path, 'Não foi possível remover o membro com auditoria transacional.');

  redirect(`${path}?mensagem=${encodeURIComponent('Membro removido da equipe com segurança.')}`);
}
