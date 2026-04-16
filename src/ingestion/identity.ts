import { ProductIndex } from '../types/product';

export function resolveIdentity(
  slug: string,
  title: string,
  existingIndex: ProductIndex[]
): { isNew: boolean; existingSlug?: string } {
  // Primary: exact slug match
  const bySlug = existingIndex.find(p => p.slug === slug);
  if (bySlug) return { isNew: false, existingSlug: bySlug.slug };

  // Fallback: normalized title match
  const normalizedTitle = title.toLowerCase().trim();
  const byTitle = existingIndex.find(p => p.title.toLowerCase().trim() === normalizedTitle);
  if (byTitle) return { isNew: false, existingSlug: byTitle.slug };

  return { isNew: true };
}
