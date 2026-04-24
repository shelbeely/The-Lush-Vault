export interface ProductImage {
  url: string;
  alt: string;
}

export interface ProductPrice {
  amount: number;
  currency: 'USD';
  formatted: string;
}

export interface Product {
  slug: string;
  url: string;
  title: string;
  price: ProductPrice;
  description: string;
  ingredients: string[];
  badges: string[];
  images: ProductImage[];
  category: string;
  collection?: string;
  fetchedAt: string;
  updatedAt: string;
}

export interface RawProduct {
  slug: string;
  url: string;
  title?: string;
  priceRaw?: string;
  description?: string;
  ingredientsRaw?: string;
  badges?: string[];
  images?: ProductImage[];
  category?: string;
  collection?: string;
}

export interface ProductDiff {
  slug: string;
  timestamp: string;
  changes: Array<{
    field: string;
    before: unknown;
    after: unknown;
  }>;
}

export interface ProductIndex {
  slug: string;
  title: string;
  category: string;
  url: string;
  updatedAt: string;
}

/**
 * Narrow factual product metadata record — the canonical archive scope
 * for this project. The Vault deliberately does NOT archive full marketing
 * copy, bulk images, ingredient lists, account/checkout flows, or any other
 * material that would amount to a full mirror of lush.com.
 *
 * The richer `Product` interface above is retained for the existing
 * normalized storage layout and parsing pipeline, but new archive surfaces
 * should prefer `ProductMetadata`.
 */
export interface ProductMetadata {
  slug: string;
  url: string;
  title: string;
  priceRaw?: string;
  category?: string;
  collection?: string;
  availabilityRaw?: string;
  fetchedAt: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
}
