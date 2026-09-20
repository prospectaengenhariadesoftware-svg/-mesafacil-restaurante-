import { describe, expect, it, vi } from 'vitest';
import { buildRestaurantLogoPath, isOwnedRestaurantLogoPath, restaurantLogoPublicUrl, TENANT_BRAND_ASSETS_BUCKET } from './tenant-brand-assets';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('tenant brand assets storage helpers', () => {
  it('builds tenant-scoped restaurant logo paths', () => {
    const path = buildRestaurantLogoPath({ tenantId, originalName: 'Logo Principal.png', mimeType: 'image/png' });

    expect(TENANT_BRAND_ASSETS_BUCKET).toBe('tenant-brand-assets');
    expect(path).toMatch(/^11111111-1111-4111-8111-111111111111\/identity\/logo-principal-[a-z0-9]{12}\.png$/);
  });

  it('accepts only owned restaurant logo storage paths', () => {
    expect(isOwnedRestaurantLogoPath(`${tenantId}/identity/logo.png`, tenantId)).toBe(true);
    expect(isOwnedRestaurantLogoPath(`${tenantId}/identity/logo.svg`, tenantId)).toBe(false);
    expect(isOwnedRestaurantLogoPath(`${tenantId}/identity/../logo.png`, tenantId)).toBe(false);
    expect(isOwnedRestaurantLogoPath('22222222-2222-4222-8222-222222222222/identity/logo.png', tenantId)).toBe(false);
    expect(isOwnedRestaurantLogoPath(`${tenantId}/products/logo.png`, tenantId)).toBe(false);
  });

  it('builds public URLs only from owned logo paths', () => {
    const supabase = {
      storage: {
        from: vi.fn(() => ({
          getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/${TENANT_BRAND_ASSETS_BUCKET}/${path}` } })),
        })),
      },
    };

    expect(restaurantLogoPublicUrl(supabase as never, `${tenantId}/identity/logo.webp`, tenantId)).toContain('/tenant-brand-assets/');
    expect(restaurantLogoPublicUrl(supabase as never, 'https://cdn.example.com/logo.webp', tenantId)).toBeNull();
  });
});
