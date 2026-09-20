'use server';

import { redirect } from 'next/navigation';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/validation/auth';
import { validatePublicSiteInput } from '@/lib/validation/public-site';

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function getFlag(formData: FormData, key: string): boolean {
  return formData.getAll(key).map(String).includes('true');
}

function sitePath(tenantId: string): string {
  return `/tenants/${tenantId}/site`;
}

function fail(path: string, message: string): never {
  redirect(`${path}?erro=${encodeURIComponent(message)}`);
}

export async function updatePublicSiteAction(formData: FormData) {
  const tenantId = getString(formData, 'tenantId');
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  const path = sitePath(tenantId);

  const membership = await requireActiveTenant(tenantId);
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    fail(path, 'Apenas owner/admin podem editar o site público.');
  }

  const validation = validatePublicSiteInput({
    displayName: getString(formData, 'displayName'),
    publicSlug: getString(formData, 'publicSlug'),
    headline: getString(formData, 'headline'),
    description: getString(formData, 'description'),
    phone: getString(formData, 'phone'),
    whatsapp: getString(formData, 'whatsapp'),
    instagram: getString(formData, 'instagram'),
    addressLine: getString(formData, 'addressLine'),
    isPublished: getFlag(formData, 'isPublished'),
    showMenu: getFlag(formData, 'showMenu'),
    acceptsReservations: getFlag(formData, 'acceptsReservations'),
    acceptsOnlineOrders: getFlag(formData, 'acceptsOnlineOrders'),
  });

  if (!validation.ok) fail(path, validation.message);

  const supabase = await createClient();
  const { error } = await supabase.rpc('update_tenant_public_site', {
    site_tenant_id: tenantId,
    site_display_name: validation.data.displayName,
    site_public_slug: validation.data.publicSlug,
    site_headline: validation.data.headline,
    site_description: validation.data.description,
    site_phone: validation.data.phone,
    site_whatsapp: validation.data.whatsapp,
    site_instagram: validation.data.instagram,
    site_address_line: validation.data.addressLine,
    site_is_published: validation.data.isPublished,
    site_show_menu: validation.data.showMenu,
    site_accepts_reservations: validation.data.acceptsReservations,
    site_accepts_online_orders: validation.data.acceptsOnlineOrders,
  });

  if (error) {
    const message = error.code === '23505'
      ? 'Este slug de site já está em uso por outro restaurante.'
      : 'Não foi possível salvar o site público.';
    fail(path, message);
  }

  redirect(`${path}?mensagem=${encodeURIComponent('Site público atualizado com segurança.')}`);
}
