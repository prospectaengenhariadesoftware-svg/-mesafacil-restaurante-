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
    imageUrl: getString(formData, 'imageUrl'),
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
    image_url: validation.data.imageUrl,
    is_available: validation.data.isAvailable,
  });

  if (error) fail(path, 'Não foi possível cadastrar o produto. Verifique categoria, permissões, auditoria e nome duplicado.');

  redirect(`${path}?mensagem=${encodeURIComponent('Produto cadastrado com sucesso.')}`);
}

export async function updateProductAction(formData: FormData) {
  const tenantId = requireTenantId(formData);
  const productId = getString(formData, 'productId');
  const path = `/tenants/${tenantId}/produtos`;
  await requireActiveTenant(tenantId);
  if (!isUuid(productId)) fail(path, 'Produto inválido.');

  const validation = validateProductInput({
    categoryId: getString(formData, 'categoryId'),
    name: getString(formData, 'name'),
    description: getString(formData, 'description'),
    price: getString(formData, 'price'),
    imageUrl: getString(formData, 'imageUrl'),
    isAvailable: getBoolean(formData, 'isAvailable'),
  });
  if (!validation.success) fail(path, validation.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from('tenant_products')
    .update({
      category_id: validation.data.categoryId,
      name: validation.data.name,
      description: validation.data.description,
      price_cents: validation.data.priceCents,
      image_url: validation.data.imageUrl,
      is_available: validation.data.isAvailable,
    })
    .eq('tenant_id', tenantId)
    .eq('id', productId)
    .select('id')
    .single();

  if (error) fail(path, 'Não foi possível atualizar o produto. Verifique categoria, vínculo do tenant, permissões, auditoria e nome duplicado.');

  redirect(`${path}?mensagem=${encodeURIComponent('Produto atualizado com sucesso.')}`);
}

export async function duplicateProductAction(formData: FormData) {
  const tenantId = requireTenantId(formData);
  const productId = getString(formData, 'productId');
  const path = `/tenants/${tenantId}/produtos`;
  await requireActiveTenant(tenantId);
  if (!isUuid(productId)) fail(path, 'Produto inválido.');

  const supabase = await createClient();
  const { data: product, error: loadError } = await supabase
    .from('tenant_products')
    .select('category_id, name, description, price_cents, image_url, is_available')
    .eq('tenant_id', tenantId)
    .eq('id', productId)
    .single();

  if (loadError || !product) fail(path, 'Produto não encontrado para duplicação.');

  const copyName = `${product.name} (cópia ${new Date().toISOString().slice(11, 19)})`.slice(0, 120);
  const { error } = await supabase.from('tenant_products').insert({
    tenant_id: tenantId,
    category_id: product.category_id,
    name: copyName,
    description: product.description,
    price_cents: product.price_cents,
    image_url: product.image_url,
    is_available: false,
  });

  if (error) fail(path, 'Não foi possível duplicar o produto com auditoria transacional.');

  redirect(`${path}?mensagem=${encodeURIComponent('Produto duplicado como indisponível para revisão.')}`);
}

export async function deleteProductAction(formData: FormData) {
  const tenantId = requireTenantId(formData);
  const productId = getString(formData, 'productId');
  const path = `/tenants/${tenantId}/produtos`;
  await requireActiveTenant(tenantId);
  if (!isUuid(productId)) fail(path, 'Produto inválido.');
  if (getString(formData, 'confirmDelete') !== 'CONFIRMAR') fail(path, 'Confirme a exclusão/inativação do produto.');

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from('tenant_customer_order_items')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('product_id', productId);

  if (countError) fail(path, 'Não foi possível verificar pedidos vinculados ao produto.');

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from('tenant_products')
      .update({ is_available: false })
      .eq('tenant_id', tenantId)
      .eq('id', productId)
      .select('id')
      .single();
    if (error) fail(path, 'Não foi possível inativar o produto com auditoria transacional.');

    redirect(`${path}?mensagem=${encodeURIComponent('Produto possui histórico de pedidos e foi inativado com segurança.')}`);
  }

  const { error } = await supabase
    .from('tenant_products')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', productId)
    .select('id')
    .single();
  if (error) fail(path, 'Não foi possível excluir o produto com auditoria transacional.');

  redirect(`${path}?mensagem=${encodeURIComponent('Produto excluído com sucesso.')}`);
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

  if (error) fail(path, 'Não foi possível cadastrar a mesa. Verifique permissões, auditoria e identificação duplicada.');
  redirect(`${path}?mensagem=${encodeURIComponent('Mesa cadastrada com sucesso.')}`);
}

export async function updateTableAction(formData: FormData) {
  const tenantId = requireTenantId(formData);
  const tableId = getString(formData, 'tableId');
  const path = `/tenants/${tenantId}/mesas`;
  await requireActiveTenant(tenantId);
  if (!isUuid(tableId)) fail(path, 'Mesa inválida.');

  const validation = validateTableInput({
    number: getString(formData, 'number'),
    seats: getString(formData, 'seats'),
    sector: getString(formData, 'sector'),
    isActive: getBoolean(formData, 'isActive'),
  });
  if (!validation.success) fail(path, validation.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from('tenant_tables')
    .update({
      number: validation.data.number,
      seats: validation.data.seats,
      sector: validation.data.sector,
      is_active: validation.data.isActive,
    })
    .eq('tenant_id', tenantId)
    .eq('id', tableId)
    .select('id')
    .single();

  if (error) fail(path, 'Não foi possível atualizar a mesa. Verifique permissões, auditoria e identificação duplicada.');
  redirect(`${path}?mensagem=${encodeURIComponent('Mesa atualizada com sucesso.')}`);
}

export async function deleteTableAction(formData: FormData) {
  const tenantId = requireTenantId(formData);
  const tableId = getString(formData, 'tableId');
  const path = `/tenants/${tenantId}/mesas`;
  await requireActiveTenant(tenantId);
  if (!isUuid(tableId)) fail(path, 'Mesa inválida.');
  if (getString(formData, 'confirmDelete') !== 'CONFIRMAR') fail(path, 'Confirme a exclusão/inativação da mesa.');

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from('tenant_customer_orders')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('table_id', tableId);

  if (countError) fail(path, 'Não foi possível verificar pedidos vinculados à mesa.');

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from('tenant_tables')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('id', tableId)
      .select('id')
      .single();
    if (error) fail(path, 'Não foi possível inativar a mesa com auditoria transacional.');
    redirect(`${path}?mensagem=${encodeURIComponent('Mesa possui histórico de pedidos e foi inativada com segurança.')}`);
  }

  const { error } = await supabase
    .from('tenant_tables')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', tableId)
    .select('id')
    .single();
  if (error) fail(path, 'Não foi possível excluir a mesa com auditoria transacional.');

  redirect(`${path}?mensagem=${encodeURIComponent('Mesa excluída com sucesso.')}`);
}
