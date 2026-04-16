import { Product, ProductDiff } from '../types/product';

type ProductKey = keyof Product;

export function computeDiff(incoming: Product, existing: Product): ProductDiff | null {
  const changes: ProductDiff['changes'] = [];
  const fields = Object.keys(incoming) as ProductKey[];

  for (const field of fields) {
    if (field === 'fetchedAt' || field === 'updatedAt') continue;
    const inVal = incoming[field];
    const exVal = existing[field];

    const inSer = JSON.stringify(inVal);
    const exSer = JSON.stringify(exVal);

    if (inSer !== exSer) {
      changes.push({ field, before: exVal, after: inVal });
    }
  }

  if (changes.length === 0) return null;

  return {
    slug: incoming.slug,
    timestamp: incoming.fetchedAt,
    changes,
  };
}
