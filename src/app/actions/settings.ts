'use server';

import { redirect } from 'next/navigation';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { isUuid, validateRestaurantSettingsInput } from '@/lib/validation/auth';

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function settingsPath(tenantId: string): string {
  return `/tenants/${tenantId}/configuracoes`;
}

function fail(path: string, message: string): never {
  redirect(`${path}?erro=${encodeURIComponent(message)}`);
}

export async function updateRestaurantSettingsAction(formData: FormData) {
  const tenantId = getString(formData, 'tenantId');
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  const path = settingsPath(tenantId);

  const membership = await requireActiveTenant(tenantId);
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    fail(path, 'Apenas owner/admin podem editar configurações do restaurante.');
  }

  const validation = validateRestaurantSettingsInput({
    name: getString(formData, 'name'),
    legalName: getString(formData, 'legalName'),
    document: getString(formData, 'document'),
    email: getString(formData, 'email'),
    phone: getString(formData, 'phone'),
    publicSlug: getString(formData, 'publicSlug'),
    publicDescription: getString(formData, 'publicDescription'),
    addressLine: getString(formData, 'addressLine'),
    city: getString(formData, 'city'),
    state: getString(formData, 'state'),
    acceptsQrOrders: formData.getAll('acceptsQrOrders').map(String).includes('true'),
    serviceFeePercent: getString(formData, 'serviceFeePercent'),
    estimatedPrepMinutes: getString(formData, 'estimatedPrepMinutes'),
    operatingStatus: getString(formData, 'operatingStatus'),
    publicNotice: getString(formData, 'publicNotice'),
  });

  if (!validation.ok) fail(path, validation.message);

  const supabase = await createClient();
  const { error } = await supabase.rpc('update_tenant_configuration', {
    config_tenant_id: tenantId,
    config_name: validation.data.name,
    config_legal_name: validation.data.legalName,
    config_document: validation.data.document,
    config_email: validation.data.email,
    config_phone: validation.data.phone,
    config_public_slug: validation.data.publicSlug,
    config_public_description: validation.data.publicDescription,
    config_address_line: validation.data.addressLine,
    config_city: validation.data.city,
    config_state: validation.data.state,
    config_accepts_qr_orders: validation.data.acceptsQrOrders,
    config_service_fee_basis_points: validation.data.serviceFeeBasisPoints,
    config_estimated_prep_minutes: validation.data.estimatedPrepMinutes,
    config_operating_status: validation.data.operatingStatus,
    config_public_notice: validation.data.publicNotice,
  });

  if (error) {
    const message = error.code === '23505'
      ? 'Este slug público já está em uso por outro restaurante.'
      : 'Não foi possível salvar as configurações.';
    fail(path, message);
  }

  redirect(`${path}?mensagem=${encodeURIComponent('Configurações atualizadas com segurança.')}`);
}
