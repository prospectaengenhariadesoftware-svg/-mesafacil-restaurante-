export function decideNextProductImageUrl({
  currentImageUrl,
  uploadedImageUrl,
  removeImage,
}: Readonly<{
  currentImageUrl: string | null;
  uploadedImageUrl: string | null;
  removeImage: boolean;
}>): string | null {
  if (uploadedImageUrl) return uploadedImageUrl;
  if (removeImage) return null;
  return currentImageUrl;
}
