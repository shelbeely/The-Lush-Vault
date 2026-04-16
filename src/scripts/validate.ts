import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import schema from '../schemas/product.schema.json';

const PRODUCTS_DIR = path.resolve(process.cwd(), 'data/products');

async function main(): Promise<void> {
  const ajv = new Ajv({ strict: false });
  const validate = ajv.compile(schema);

  let slugs: string[] = [];
  try {
    slugs = await fs.promises.readdir(PRODUCTS_DIR);
  } catch {
    console.log('No products directory found.');
    process.exit(0);
  }

  let totalFiles = 0;
  let failedFiles = 0;

  for (const slug of slugs) {
    const filePath = path.join(PRODUCTS_DIR, slug, 'current.json');
    if (!fs.existsSync(filePath)) continue;

    totalFiles++;
    let data: unknown;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`[PARSE ERROR] ${filePath}: ${(err as Error).message}`);
      failedFiles++;
      continue;
    }

    const valid = validate(data);
    if (!valid) {
      failedFiles++;
      console.error(`[INVALID] ${filePath}`);
      for (const error of validate.errors ?? []) {
        console.error(`  - ${error.instancePath || '/'} ${error.message}`);
      }
    } else {
      console.log(`[OK] ${filePath}`);
    }
  }

  console.log(`\nValidated ${totalFiles} files: ${totalFiles - failedFiles} passed, ${failedFiles} failed.`);
  if (failedFiles > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
