import fs from 'fs';
import path from 'path';
import { Product, ProductIndex } from '../types/product';

function productPath(slug: string): string {
  return path.resolve(process.cwd(), `data/products/${slug}/current.json`);
}

function indexPath(): string {
  return path.resolve(process.cwd(), 'data/index/all.json');
}

function categoryIndexPath(category: string): string {
  return path.resolve(process.cwd(), `data/index/by-category/${category}.json`);
}

export async function readProduct(slug: string): Promise<Product | null> {
  const filePath = productPath(slug);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Product;
  } catch {
    return null;
  }
}

export async function readIndex(): Promise<ProductIndex[]> {
  const filePath = indexPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as ProductIndex[];
  } catch {
    return [];
  }
}

export async function readCategoryIndex(category: string): Promise<ProductIndex[]> {
  const filePath = categoryIndexPath(category);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as ProductIndex[];
  } catch {
    return [];
  }
}
