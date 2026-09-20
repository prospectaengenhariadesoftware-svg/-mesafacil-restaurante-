import type { SupabaseClient } from '@supabase/supabase-js';
import { buildSafeRestaurantLogoName } from '../validation/restaurant-logo';

export const TENANT_BRAND_ASSETS_BUCKET = 'tenant-brand-assets';

type BuildRestaurantLogoPathInput = {
  tenantId: string;
  originalName: string;
  mimeType: string;
};

export function buildRestaurantLogoPath({ tenantId, originalName, mimeType }: BuildRestaurantLogoPathInput): string {
  return `${tenantId}/identity/${buildSafeRestaurantLogoName(originalName, mimeType)}`;
}

export function isOwnedRestaurantLogoPath(path: string | null | undefined, tenantId: string): path is string {
  if (!path) return false;
  if (!path.startsWith(`${tenantId}/identity/`)) return false;
  if (path.includes('..') || path.includes('\\')) return false;
  return /\.(png|jpe?g|webp)$/i.test(path);
}

export function restaurantLogoPublicUrl(supabase: SupabaseClient, logoPath: string | null | undefined, tenantId: string): string | null {
  if (!isOwnedRestaurantLogoPath(logoPath, tenantId)) return null;
  const { data } = supabase.storage.from(TENANT_BRAND_ASSETS_BUCKET).getPublicUrl(logoPath);
  return data.publicUrl;
}

type UploadRestaurantLogoInput = {
  supabase: SupabaseClient;
  tenantId: string;
  file: File;
};

export async function uploadRestaurantLogo({ supabase, tenantId, file }: UploadRestaurantLogoInput): Promise<
  | { success: true; path: string; publicUrl: string }
  | { success: false; error: string }
> {
  const path = buildRestaurantLogoPath({ tenantId, originalName: file.name, mimeType: file.type });
  const { error } = await supabase.storage.from(TENANT_BRAND_ASSETS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (error) return { success: false, error: 'Não foi possível enviar a logo do restaurante.' };

  const { data } = supabase.storage.from(TENANT_BRAND_ASSETS_BUCKET).getPublicUrl(path);
  return { success: true, path, publicUrl: data.publicUrl };
}

export async function removeRestaurantLogoIfOwned(supabase: SupabaseClient, logoPath: string | null | undefined, tenantId: string): Promise<void> {
  if (!isOwnedRestaurantLogoPath(logoPath, tenantId)) return;
  await supabase.storage.from(TENANT_BRAND_ASSETS_BUCKET).remove([logoPath]);
}
