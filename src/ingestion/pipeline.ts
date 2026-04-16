import { Command } from 'commander';
import { loadRobots } from './robots';
import { getUsProductUrls } from './sitemap';
import { processUrl } from './adapters/lush-us';
import { resolveIdentity } from './identity';
import { computeDiff } from './diff';
import { readProduct, readIndex } from '../storage/reader';
import { writeProduct, writeDiff } from '../storage/writer';
import { rebuildIndex } from '../storage/index-builder';

const program = new Command();
program
  .option('--dry-run', 'Do not write any files', false)
  .option('--since <date>', 'Only sync products updated since this date (YYYY-MM-DD)');

export async function main(): Promise<void> {
  program.parse(process.argv);
  const opts = program.opts<{ dryRun: boolean; since?: string }>();
  const dryRun: boolean = opts.dryRun;
  const since: string | undefined = opts.since;

  console.log('Loading robots.txt...');
  await loadRobots();

  console.log(`Fetching US product URLs${since ? ` since ${since}` : ''}...`);
  const urls = await getUsProductUrls(since);
  console.log(`Found ${urls.length} product URLs`);

  const existingIndex = await readIndex();
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const url of urls) {
    try {
      const product = await processUrl(url);
      if (!product) { skipped++; continue; }

      const { isNew, existingSlug } = resolveIdentity(product.slug, product.title, existingIndex);
      const slugToUse = isNew ? product.slug : (existingSlug ?? product.slug);

      const existing = await readProduct(slugToUse);
      const diff = existing ? computeDiff(product, existing) : null;

      if (existing && !diff) {
        console.log(`  [skip] ${product.slug} — no changes`);
        skipped++;
      } else {
        console.log(`  [${isNew ? 'new' : 'update'}] ${product.slug}`);
        if (!dryRun) {
          // Preserve updatedAt if no changes (shouldn't reach here, but guard)
          if (existing && diff) {
            product.updatedAt = product.fetchedAt;
          } else if (!existing) {
            product.updatedAt = product.fetchedAt;
          }
          await writeProduct(product);
          if (diff) await writeDiff(diff);
        }
        updated++;
      }
      processed++;
    } catch (err) {
      console.error(`  [error] ${url}: ${(err as Error).message}`);
      errors++;
    }
  }

  console.log(`\nProcessed: ${processed}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);

  if (!dryRun) {
    console.log('Rebuilding index...');
    await rebuildIndex();
    console.log('Done.');
  } else {
    console.log('[dry-run] Skipped writes and index rebuild.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
