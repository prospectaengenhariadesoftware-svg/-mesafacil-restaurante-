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
  await requireActiveTenant(tenantId);

  const validation = validateCategoryInput({
    name: getString(formData, 'name'),
    description: getString(formData, 'description'),
  });
  if (!validation.success) fail(path, validation.error);

  const supabase = await createClient();
  const { error } = await supabase.from('tenant_product_categories').insert({
    tenant_id: tenantId,
    name: validation.data.name,
    description: validation.data.description,
  });

  if (error) fail(path, error.message);
  redirect(`${path}?mensagem=${encodeURIComponent('Categoria cadastrada.')}`);
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
