import fs from 'fs';
import path from 'path';
import { Product, ProductIndex } from '../types/product';

const PRODUCTS_DIR = path.resolve(process.cwd(), 'data/products');
const INDEX_DIR = path.resolve(process.cwd(), 'data/index');

export async function rebuildIndex(): Promise<void> {
  await fs.promises.mkdir(INDEX_DIR, { recursive: true });
  await fs.promises.mkdir(path.join(INDEX_DIR, 'by-category'), { recursive: true });

  let slugs: string[] = [];
  try {
    const entries = await fs.promises.readdir(PRODUCTS_DIR);
    slugs = entries;
  } catch {
    slugs = [];
  }

  const allIndex: ProductIndex[] = [];
  const byCategory: Record<string, ProductIndex[]> = {};

  for (const slug of slugs) {
    const filePath = path.join(PRODUCTS_DIR, slug, 'current.json');
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      const product = JSON.parse(raw) as Product;
      const entry: ProductIndex = {
        slug: product.slug,
        title: product.title,
        category: product.category,
        url: product.url,
        updatedAt: product.updatedAt,
      };
      allIndex.push(entry);
      if (!byCategory[product.category]) byCategory[product.category] = [];
      byCategory[product.category].push(entry);
    } catch {
      continue;
    }
  }

  await fs.promises.writeFile(
    path.join(INDEX_DIR, 'all.json'),
    JSON.stringify(allIndex, null, 2)
  );

  for (const [category, entries] of Object.entries(byCategory)) {
    await fs.promises.writeFile(
      path.join(INDEX_DIR, 'by-category', `${category}.json`),
      JSON.stringify(entries, null, 2)
    );
  }
}
