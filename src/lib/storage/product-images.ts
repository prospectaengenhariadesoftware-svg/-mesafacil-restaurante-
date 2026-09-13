import type { SupabaseClient } from '@supabase/supabase-js';
import { buildSafeProductImageName } from '../validation/product-image';

export const PRODUCT_IMAGE_BUCKET = 'tenant-product-images';

type BuildProductImagePathInput = {
  tenantId: string;
  productId: string;
  originalName: string;
  mimeType: string;
};

export function buildProductImagePath({ tenantId, productId, originalName, mimeType }: BuildProductImagePathInput): string {
  return `${tenantId}/products/${productId}/${buildSafeProductImageName(originalName, mimeType)}`;
}

export function productImagePathFromPublicUrl(imageUrl: string | null | undefined, tenantId: string): string | null {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;

    const rawPath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    if (!rawPath.startsWith(`${tenantId}/products/`)) return null;
    if (rawPath.includes('..') || rawPath.includes('\\')) return null;
    return rawPath;
  } catch {
    return null;
  }
}

type UploadProductImageInput = {
  supabase: SupabaseClient;
  tenantId: string;
  productId: string;
  file: File;
};

export async function uploadProductImage({ supabase, tenantId, productId, file }: UploadProductImageInput): Promise<
  | { success: true; path: string; publicUrl: string }
  | { success: false; error: string }
> {
  const path = buildProductImagePath({ tenantId, productId, originalName: file.name, mimeType: file.type });
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (error) return { success: false, error: 'Não foi possível enviar a imagem do produto.' };

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return { success: true, path, publicUrl: data.publicUrl };
}

export async function removeProductImageIfOwned(supabase: SupabaseClient, imageUrl: string | null | undefined, tenantId: string): Promise<void> {
  const path = productImagePathFromPublicUrl(imageUrl, tenantId);
  if (!path) return;
  await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
}
