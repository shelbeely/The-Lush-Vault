import { XMLParser } from 'fast-xml-parser';
import { isAllowed } from './robots';
import { fetchGzip } from './fetcher';

const SITEMAP_INDEX_URL = 'https://www.lush.com/sitemap-index.xml.gz';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

interface SitemapIndex {
  sitemapindex?: {
    sitemap?: SitemapEntry | SitemapEntry[];
  };
}

interface UrlSet {
  urlset?: {
    url?: SitemapEntry | SitemapEntry[];
  };
}

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

async function parseSitemapXml(buf: Buffer): Promise<SitemapEntry[]> {
  const parser = new XMLParser({ ignoreAttributes: false });
  const xml = parser.parse(buf.toString('utf-8')) as SitemapIndex & UrlSet;

  const sitemapEntries = toArray(xml.sitemapindex?.sitemap);
  if (sitemapEntries.length > 0) return sitemapEntries;

  return toArray(xml.urlset?.url);
}

export async function getUsProductUrls(since?: string): Promise<string[]> {
  const sinceDate = since ? new Date(since) : null;

  const indexBuf = await fetchGzip(SITEMAP_INDEX_URL);
  const childSitemaps = await parseSitemapXml(indexBuf);

  const usProductSitemaps = childSitemaps.filter(entry => {
    const loc = entry.loc || '';
    return loc.includes('/us/en_US/') || loc.toLowerCase().includes('product');
  });

  const results: string[] = [];
  const seen = new Set<string>();

  for (const sitemap of usProductSitemaps) {
    if (!sitemap.loc || !isAllowed(sitemap.loc)) continue;
    let childBuf: Buffer;
    try {
      childBuf = await fetchGzip(sitemap.loc);
    } catch {
      continue;
    }
    const entries = await parseSitemapXml(childBuf);

    for (const entry of entries) {
      const loc = entry.loc;
      if (!loc) continue;
      if (!loc.includes('/us/en_US/p/')) continue;
      if (!isAllowed(loc)) continue;
      if (seen.has(loc)) continue;

      if (sinceDate && entry.lastmod) {
        const lastmod = new Date(entry.lastmod);
        if (lastmod <= sinceDate) continue;
      }

      seen.add(loc);
      results.push(loc);
    }
  }

  return results;
}
