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
