import { describe, expect, it } from 'vitest';
import { PRODUCT_IMAGE_BUCKET, buildProductImagePath, productImagePathFromPublicUrl } from './product-images';

const tenantId = 'abababab-1111-4aba-8aba-abababababab';
const productId = 'abababab-2222-4aba-8aba-abababababab';

describe('product image storage helpers', () => {
  it('builds tenant-scoped product image paths with safe names', () => {
    const path = buildProductImagePath({ tenantId, productId, originalName: '../Café.png', mimeType: 'image/png' });

    expect(PRODUCT_IMAGE_BUCKET).toBe('tenant-product-images');
    expect(path).toMatch(new RegExp(`^${tenantId}/products/${productId}/cafe-[a-z0-9]{12}\\.png$`));
    expect(path).not.toContain('..');
    expect(path).not.toContain('\\\\');
  });

  it('extracts a removable storage path only from the product image bucket URL and tenant prefix', () => {
    const url = `https://example.supabase.co/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${tenantId}/products/${productId}/suco.png`;

    expect(productImagePathFromPublicUrl(url, tenantId)).toBe(`${tenantId}/products/${productId}/suco.png`);
    expect(productImagePathFromPublicUrl(url.replace(tenantId, 'bcbcbcbc-1111-4bcb-8bcb-bcbcbcbcbcbc'), tenantId)).toBeNull();
    expect(productImagePathFromPublicUrl('https://cdn.example.com/image.png', tenantId)).toBeNull();
    expect(productImagePathFromPublicUrl('not-a-url', tenantId)).toBeNull();
  });
});
