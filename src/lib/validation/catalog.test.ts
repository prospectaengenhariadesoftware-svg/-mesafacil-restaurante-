import { describe, expect, it } from 'vitest';
import {
  formatMoneyFromCents,
  parseMoneyToCents,
  validateCategoryInput,
  validateProductInput,
  validateProductAddonInput,
  validateTableInput,
} from './catalog';

describe('catalog validation', () => {
  it('validates product categories before products', () => {
    expect(validateCategoryInput({ name: 'Bebidas' })).toEqual({
      success: true,
      data: { name: 'Bebidas', description: null, isActive: true, displayOrder: 0 },
    });
    expect(validateCategoryInput({ name: 'A' }).success).toBe(false);
  });

  it('normalizes editable category status and display order', () => {
    expect(validateCategoryInput({ name: ' Pratos   Executivos ', description: ' Almoço ', isActive: 'false', displayOrder: '7' })).toEqual({
      success: true,
      data: { name: 'Pratos Executivos', description: 'Almoço', isActive: false, displayOrder: 7 },
    });
    expect(validateCategoryInput({ name: 'Pratos', displayOrder: '-1' }).success).toBe(false);
  });

  it('validates products with required category and positive price', () => {
    const result = validateProductInput({
      categoryId: '11111111-1111-4111-8111-111111111111',
      name: 'Suco natural',
      description: 'Laranja 500ml',
      price: '12,50',
      imageUrl: 'https://cdn.mesafacil.test/suco.png',
      isAvailable: true,
    });

    expect(result).toEqual({
      success: true,
      data: {
        categoryId: '11111111-1111-4111-8111-111111111111',
        name: 'Suco natural',
        description: 'Laranja 500ml',
        priceCents: 1250,
        imageUrl: 'https://cdn.mesafacil.test/suco.png',
        isAvailable: true,
      },
    });
    expect(validateProductInput({ categoryId: '', name: 'Suco', price: '0' }).success).toBe(false);
  });

  it('rejects invalid product image URLs and normalizes unavailable products', () => {
    expect(validateProductInput({
      categoryId: '11111111-1111-4111-8111-111111111111',
      name: ' X-Burger ',
      price: '29,90',
      imageUrl: '',
      isAvailable: 'false',
    })).toEqual({
      success: true,
      data: {
        categoryId: '11111111-1111-4111-8111-111111111111',
        name: 'X-Burger',
        description: null,
        priceCents: 2990,
        imageUrl: null,
        isAvailable: false,
      },
    });
    expect(validateProductInput({
      categoryId: '11111111-1111-4111-8111-111111111111',
      name: 'Burger',
      price: '29,90',
      imageUrl: 'javascript:alert(1)',
    }).success).toBe(false);
  });

  it('validates product add-ons with product, positive price delta and display order', () => {
    expect(validateProductAddonInput({
      productId: '11111111-1111-4111-8111-111111111111',
      name: ' Bacon   extra ',
      description: 'Fatia crocante',
      priceDelta: '4,50',
      isAvailable: 'false',
      displayOrder: '2',
    })).toEqual({
      success: true,
      data: {
        productId: '11111111-1111-4111-8111-111111111111',
        name: 'Bacon extra',
        description: 'Fatia crocante',
        priceDeltaCents: 450,
        isAvailable: false,
        displayOrder: 2,
      },
    });

    expect(validateProductAddonInput({ productId: '', name: 'Bacon', priceDelta: '1,00' }).success).toBe(false);
    expect(validateProductAddonInput({ productId: '11111111-1111-4111-8111-111111111111', name: 'B', priceDelta: '-1,00' }).success).toBe(false);
    expect(validateProductAddonInput({ productId: '11111111-1111-4111-8111-111111111111', name: 'Bacon', priceDelta: '1001,00' }).success).toBe(false);
  });

  it('parses and formats Brazilian money values safely', () => {
    expect(parseMoneyToCents('1.234,56')).toBe(123456);
    expect(parseMoneyToCents('12.50')).toBe(1250);
    expect(formatMoneyFromCents(1250)).toBe('R$ 12,50');
  });

  it('validates restaurant tables with number and seats', () => {
    expect(validateTableInput({ number: '12', seats: '4', sector: 'Salão' })).toEqual({
      success: true,
      data: { number: '12', seats: 4, sector: 'Salão', isActive: true },
    });
    expect(validateTableInput({ number: '', seats: '0' }).success).toBe(false);
  });

  it('normalizes editable restaurant table status and rejects unsafe sectors', () => {
    expect(validateTableInput({ number: ' Varanda   03 ', seats: 6, sector: ' Área externa ', isActive: 'false' })).toEqual({
      success: true,
      data: { number: 'Varanda 03', seats: 6, sector: 'Área externa', isActive: false },
    });
    expect(validateTableInput({ number: 'A1', seats: '4', sector: 'x'.repeat(61) }).success).toBe(false);
  });
});
