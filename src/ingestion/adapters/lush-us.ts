import { fetchHtml } from '../fetcher';
import { parseProductPage } from '../parser';
import { normalizeProduct } from '../normalizer';
import { Product } from '../../types/product';

const US_PRODUCT_PATTERN = /^https:\/\/www\.lush\.com\/us\/en_US\/p\/([^/?#]+)/;

export async function processUrl(url: string): Promise<Product | null> {
  const match = url.match(US_PRODUCT_PATTERN);
  if (!match) return null;

  const fetchedAt = new Date().toISOString();
  const html = await fetchHtml(url);
  const raw = parseProductPage(html, url);
  return normalizeProduct(raw, fetchedAt);
}
