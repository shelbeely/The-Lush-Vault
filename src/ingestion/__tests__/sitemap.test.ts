import { test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { getUsProductUrls } from '../sitemap';

type AxiosGet = typeof axios.get;
const realGet: AxiosGet = axios.get.bind(axios);

const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://www.lush.com/sitemaps/us-en_US-products.xml</loc></sitemap>
  <sitemap><loc>https://www.lush.com/sitemaps/uk-en_GB-products.xml</loc></sitemap>
</sitemapindex>`;

const childXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.lush.com/us/en_US/p/bath-bomb</loc></url>
  <url><loc>https://www.lush.com/us/en_US/p/shampoo-bar</loc></url>
  <url><loc>https://www.lush.com/us/en_US/about-us</loc></url>
  <url><loc>https://www.lush.com/uk/en_GB/p/foreign-product</loc></url>
  <url><loc>https://www.lush.com/us/en/p/legacy-locale-product</loc></url>
</urlset>`;

test('sitemap: only returns US en_US /p/ product URLs', async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (axios as unknown as { get: AxiosGet }).get = (async (url: string) => {
    const xml = url.includes('sitemap-index') ? indexXml : childXml;
    return { data: Buffer.from(xml, 'utf-8') };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  try {
    const urls = await getUsProductUrls();
    assert.deepEqual(urls.sort(), [
      'https://www.lush.com/us/en_US/p/bath-bomb',
      'https://www.lush.com/us/en_US/p/shampoo-bar',
    ].sort());
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (axios as unknown as { get: AxiosGet }).get = realGet;
  }
});
