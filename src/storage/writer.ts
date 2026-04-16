import fs from 'fs';
import path from 'path';
import { Product, ProductDiff } from '../types/product';

export async function writeProduct(product: Product): Promise<void> {
  const dir = path.resolve(process.cwd(), `data/products/${product.slug}`);
  await fs.promises.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, 'current.json');
  await fs.promises.writeFile(filePath, JSON.stringify(product, null, 2));
}

export async function writeDiff(diff: ProductDiff): Promise<void> {
  const dir = path.resolve(process.cwd(), `data/products/${diff.slug}/diffs`);
  await fs.promises.mkdir(dir, { recursive: true });
  const safestamp = diff.timestamp.replace(/[:.]/g, '-');
  const filePath = path.join(dir, `${safestamp}.json`);
  await fs.promises.writeFile(filePath, JSON.stringify(diff, null, 2));
}
