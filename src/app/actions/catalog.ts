'use server';

import { redirect } from 'next/navigation';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { validateCategoryInput, validateProductInput, validateTableInput } from '@/lib/validation/catalog';
import { isUuid } from '@/lib/validation/auth';

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function getBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

function fail(path: string, message: string): never {
  redirect(`${path}?erro=${encodeURIComponent(message)}`);
}

function requireTenantId(formData: FormData): string {
  const tenantId = getString(formData, 'tenantId');
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  return tenantId;
}

export async function createCategoryAction(formData: FormData) {
  const tenantId = requireTenantId(formData);
  const path = `/tenants/${tenantId}/cardapio`;
  const membership = await requireActiveTenant(tenantId);

  const validation = validateCategoryInput({
    name: getString(formData, 'name'),
    description: getString(formData, 'description'),
    isActive: getBoolean(formData, 'isActive'),
    displayOrder: getString(formData, 'displayOrder'),
  });
  if (!validation.success) fail(path, validation.error);

  const supabase = await createClient();
  const { data, error } = await supabase.from('tenant_product_categories').insert({
    tenant_id: tenantId,
    name: validation.data.name,
    description: validation.data.description,
    is_active: validation.data.isActive,
    display_order: validation.data.displayOrder,
  }).select('id').single();

  if (error) fail(path, 'Não foi possível cadastrar a categoria. Verifique se já existe uma categoria com este nome.');

  const { error: auditError } = await supabase.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: membership.user_id,
    action: 'CREATE_CATEGORY',
    entity: 'tenant_product_categories',
    entity_id: data.id,
    metadata: { name: validation.data.name },
  });
  if (auditError) fail(path, 'Categoria cadastrada, mas não foi possível registrar auditoria. Contate o suporte.');

  redirect(`${path}?mensagem=${encodeURIComponent('Categoria cadastrada com sucesso.')}`);
}

export async function updateCategoryAction(formData: FormData) {
  const tenantId = requireTenantId(formData);
  const categoryId = getString(formData, 'categoryId');
  const path = `/tenants/${tenantId}/cardapio`;
  const membership = await requireActiveTenant(tenantId);
  if (!isUuid(categoryId)) fail(path, 'Categoria inválida.');

  const validation = validateCategoryInput({
    name: getString(formData, 'name'),
    description: getString(formData, 'description'),
    isActive: getBoolean(formData, 'isActive'),
    displayOrder: getString(formData, 'displayOrder'),
  });
  if (!validation.success) fail(path, validation.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from('tenant_product_categories')
    .update({
      name: validation.data.name,
      description: validation.data.description,
      is_active: validation.data.isActive,
      display_order: validation.data.displayOrder,
    })
    .eq('tenant_id', tenantId)
    .eq('id', categoryId)
    .select('id')
    .single();

  if (error) fail(path, 'Não foi possível atualizar a categoria. Verifique permissões, vínculo do tenant e nomes duplicados.');

  const { error: auditError } = await supabase.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: membership.user_id,
    action: 'UPDATE_CATEGORY',
    entity: 'tenant_product_categories',
    entity_id: categoryId,
    metadata: { name: validation.data.name, is_active: validation.data.isActive },
  });
  if (auditError) fail(path, 'Categoria atualizada, mas não foi possível registrar auditoria. Contate o suporte.');

  redirect(`${path}?mensagem=${encodeURIComponent('Categoria atualizada com sucesso.')}`);
}

export async function deleteCategoryAction(formData: FormData) {
  const tenantId = requireTenantId(formData);
  const categoryId = getString(formData, 'categoryId');
  const path = `/tenants/${tenantId}/cardapio`;
  const membership = await requireActiveTenant(tenantId);
  if (!isUuid(categoryId)) fail(path, 'Categoria inválida.');
  if (getString(formData, 'confirmDelete') !== 'CONFIRMAR') fail(path, 'Confirme a exclusão/inativação da categoria.');

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from('tenant_products')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('category_id', categoryId);

  if (countError) fail(path, 'Não foi possível verificar produtos vinculados à categoria.');

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from('tenant_product_categories')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('id', categoryId)
      .select('id')
      .single();
    if (error) fail(path, 'Não foi possível inativar a categoria.');

    const { error: auditError } = await supabase.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: membership.user_id,
      action: 'INACTIVATE_CATEGORY',
      entity: 'tenant_product_categories',
      entity_id: categoryId,
      metadata: { reason: 'linked_products', linked_products: count },
    });
    if (auditError) fail(path, 'Categoria inativada, mas não foi possível registrar auditoria. Contate o suporte.');
    redirect(`${path}?mensagem=${encodeURIComponent('Categoria possui produtos vinculados e foi inativada com segurança.')}`);
  }

  const { error } = await supabase
    .from('tenant_product_categories')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', categoryId)
    .select('id')
    .single();
  if (error) fail(path, 'Não foi possível excluir a categoria.');

  const { error: auditError } = await supabase.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: membership.user_id,
    action: 'DELETE_CATEGORY',
    entity: 'tenant_product_categories',
    entity_id: categoryId,
    metadata: {},
  });
  if (auditError) fail(path, 'Categoria excluída, mas não foi possível registrar auditoria. Contate o suporte.');

  redirect(`${path}?mensagem=${encodeURIComponent('Categoria excluída com sucesso.')}`);
}

export async function createProductAction(formData: FormData) {
  const tenantId = requireTenantId(formData);
  const path = `/tenants/${tenantId}/produtos`;
  await requireActiveTenant(tenantId);

  const validation = validateProductInput({
    categoryId: getString(formData, 'categoryId'),
    name: getString(formData, 'name'),
    description: getString(formData, 'description'),
    price: getString(formData, 'price'),
    isAvailable: getBoolean(formData, 'isAvailable'),
  });
  if (!validation.success) fail(path, validation.error);

  const supabase = await createClient();
  const { error } = await supabase.from('tenant_products').insert({
    tenant_id: tenantId,
    category_id: validation.data.categoryId,
    name: validation.data.name,
    description: validation.data.description,
    price_cents: validation.data.priceCents,
    is_available: validation.data.isAvailable,
  });

  if (error) fail(path, error.message);
  redirect(`${path}?mensagem=${encodeURIComponent('Produto cadastrado.')}`);
}

export async function createTableAction(formData: FormData) {
  const tenantId = requireTenantId(formData);
  const path = `/tenants/${tenantId}/mesas`;
  await requireActiveTenant(tenantId);

  const validation = validateTableInput({
    number: getString(formData, 'number'),
    seats: getString(formData, 'seats'),
    sector: getString(formData, 'sector'),
    isActive: getBoolean(formData, 'isActive'),
  });
  if (!validation.success) fail(path, validation.error);

  const supabase = await createClient();
  const { error } = await supabase.from('tenant_tables').insert({
    tenant_id: tenantId,
    number: validation.data.number,
    seats: validation.data.seats,
    sector: validation.data.sector,
    is_active: validation.data.isActive,
  });

  if (error) fail(path, error.message);
  redirect(`${path}?mensagem=${encodeURIComponent('Mesa cadastrada.')}`);
}
