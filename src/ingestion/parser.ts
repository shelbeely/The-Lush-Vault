import * as cheerio from 'cheerio';
import { RawProduct, ProductImage } from '../types/product';

function extractSlug(url: string): string {
  const match = url.match(/\/us\/en_US\/p\/([^/?#]+)/);
  return match ? match[1] : url;
}

export function parseProductPage(html: string, url: string): RawProduct {
  const $ = cheerio.load(html);
  const slug = extractSlug(url);

  // Title
  let title: string | undefined;
  const titleEl =
    $('h1.product-details__title').first() ||
    $('h1[class*="title"]').first() ||
    $('h1').first();
  const titleText = titleEl.text().trim();
  if (titleText) title = titleText;

  // Price
  let priceRaw: string | undefined;
  const priceEl = $('.product-details__price, [class*="price"]').first();
  const priceText = priceEl.text().trim();
  if (priceText) priceRaw = priceText;

  // Description
  let description: string | undefined;
  const descEl = $(
    '.product-details__description, [class*="description"], .product-header__description'
  ).first();
  const descText = descEl.text().trim();
  if (descText) description = descText;

  // Ingredients
  let ingredientsRaw: string | undefined;
  const ingredientEl = $('[class*="ingredient"]').first();
  if (ingredientEl.length) {
    ingredientsRaw = ingredientEl.text().trim();
  } else {
    $('section, div').each((_i, el) => {
      const text = $(el).text();
      if (text.includes('Ingredients') && !ingredientsRaw) {
        ingredientsRaw = text.replace(/^.*Ingredients[:\s]*/i, '').trim();
      }
    });
  }

  // Badges
  const badgeSet = new Set<string>();
  $('[class*="badge"], [class*="certification"]').each((_i, el) => {
    const alt = $(el).attr('alt');
    const text = $(el).text().trim();
    if (alt) badgeSet.add(alt);
    else if (text) badgeSet.add(text);
  });
  const badges = Array.from(badgeSet);

  // Images
  const images: ProductImage[] = [];
  $('[class*="product"] img').each((_i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    const alt = $(el).attr('alt') || '';
    if (src) images.push({ url: src, alt });
  });

  // Category
  let category: string | undefined;
  const breadcrumbs = $('[class*="breadcrumb"] a, nav[aria-label*="breadcrumb"] a');
  if (breadcrumbs.length >= 2) {
    category = $(breadcrumbs[breadcrumbs.length - 2]).text().trim() || undefined;
  }
  if (!category) {
    const catEl = $('[class*="category"]').first();
    const catText = catEl.text().trim();
    if (catText) category = catText;
  }

  // Collection
  let collection: string | undefined;
  const collEl = $('[class*="collection"]').first();
  const collText = collEl.text().trim();
  if (collText) collection = collText;

  return {
    slug,
    url,
    title,
    priceRaw,
    description,
    ingredientsRaw,
    badges,
    images,
    category,
    collection,
  };
}
