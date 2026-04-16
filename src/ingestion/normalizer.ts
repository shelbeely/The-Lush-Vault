import { RawProduct, Product, ProductPrice } from '../types/product';

function parsePrice(raw: string | undefined): ProductPrice {
  if (!raw) return { amount: 0, currency: 'USD', formatted: '$0.00' };
  const match = raw.match(/\$?([\d,]+\.?\d*)/);
  if (!match) return { amount: 0, currency: 'USD', formatted: raw };
  const amount = parseFloat(match[1].replace(/,/g, ''));
  const formatted = raw.includes('$') ? raw.trim() : `$${match[1]}`;
  return { amount, currency: 'USD', formatted };
}

function splitIngredients(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/,|\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export function normalizeProduct(
  raw: RawProduct,
  fetchedAt: string,
  existingUpdatedAt?: string
): Product {
  const price = parsePrice(raw.priceRaw);
  const ingredients = splitIngredients(raw.ingredientsRaw);
  const title = raw.title?.trim() || raw.slug;
  const description = raw.description?.trim() ?? '';
  const category = raw.category?.trim() || 'uncategorized';
  const badges = raw.badges ?? [];
  const images = raw.images ?? [];
  const collection = raw.collection?.trim();

  const product: Product = {
    slug: raw.slug,
    url: raw.url,
    title,
    price,
    description,
    ingredients,
    badges,
    images,
    category,
    fetchedAt,
    updatedAt: fetchedAt,
  };
  if (collection !== undefined) product.collection = collection;

  if (existingUpdatedAt) {
    product.updatedAt = existingUpdatedAt;
  }

  return product;
}
