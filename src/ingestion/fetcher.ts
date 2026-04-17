import axios from 'axios';
import zlib from 'zlib';
import { isAllowed } from './robots';
import { USER_AGENT } from './constants';
const POLITE_DELAY_MIN = 2000;
const POLITE_DELAY_MAX = 3000;

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};
const MAX_RETRIES = 3;

let lastRequestTime = 0;

function stripDisallowedParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('query');
    parsed.searchParams.delete('t');
    return parsed.toString();
  } catch {
    return url;
  }
}

async function politeDelay(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const delay = POLITE_DELAY_MIN + Math.random() * (POLITE_DELAY_MAX - POLITE_DELAY_MIN);
  if (elapsed < delay) {
    await new Promise(resolve => setTimeout(resolve, delay - elapsed));
  }
  lastRequestTime = Date.now();
}

async function withRetry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const retryable = status === 403 || status === 429 || (status !== undefined && status >= 500);
    if (retryable && attempt < MAX_RETRIES) {
      const backoff = Math.pow(2, attempt + 1) * 2000;
      await new Promise(resolve => setTimeout(resolve, backoff));
      return withRetry(fn, attempt + 1);
    }
    throw err;
  }
}

export async function fetchHtml(url: string): Promise<string> {
  const cleanUrl = stripDisallowedParams(url);
  if (!isAllowed(cleanUrl)) {
    throw new Error(`robots.txt disallows: ${cleanUrl}`);
  }
  await politeDelay();
  return withRetry(async () => {
    const response = await axios.get<string>(cleanUrl, {
      headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.lush.com/' },
      responseType: 'text',
      timeout: 15000,
    });
    return response.data;
  });
}

export async function fetchGzip(url: string): Promise<Buffer> {
  const cleanUrl = stripDisallowedParams(url);
  if (!isAllowed(cleanUrl)) {
    throw new Error(`robots.txt disallows: ${cleanUrl}`);
  }
  await politeDelay();
  return withRetry(async () => {
    const response = await axios.get<ArrayBuffer>(cleanUrl, {
      headers: BROWSER_HEADERS,
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    const buffer = Buffer.from(response.data);
    // Decompress if gzip
    try {
      return zlib.gunzipSync(buffer);
    } catch {
      return buffer;
    }
  });
}
