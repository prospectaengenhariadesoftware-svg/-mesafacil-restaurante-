import { describe, expect, it } from 'vitest';
import { decideNextProductImageUrl } from './product-image-decision';

describe('decideNextProductImageUrl', () => {
  it('keeps the current product image when no upload or removal is requested', () => {
    expect(decideNextProductImageUrl({
      currentImageUrl: 'https://cdn.example.test/old.png',
      uploadedImageUrl: null,
      removeImage: false,
    })).toBe('https://cdn.example.test/old.png');
  });

  it('uses the uploaded image URL when a new product image was uploaded', () => {
    expect(decideNextProductImageUrl({
      currentImageUrl: 'https://cdn.example.test/old.png',
      uploadedImageUrl: 'https://cdn.example.test/new.webp',
      removeImage: false,
    })).toBe('https://cdn.example.test/new.webp');
  });

  it('removes the current product image when removal is requested and no upload exists', () => {
    expect(decideNextProductImageUrl({
      currentImageUrl: 'https://cdn.example.test/old.png',
      uploadedImageUrl: null,
      removeImage: true,
    })).toBeNull();
  });

  it('prefers uploaded image URL if called with both upload and removal flags', () => {
    expect(decideNextProductImageUrl({
      currentImageUrl: 'https://cdn.example.test/old.png',
      uploadedImageUrl: 'https://cdn.example.test/new.webp',
      removeImage: true,
    })).toBe('https://cdn.example.test/new.webp');
  });
});
