import axios from 'axios';
import zlib from 'zlib';
import { isAllowed } from './robots';
import { USER_AGENT } from './constants';

const POLITE_DELAY_MIN = 2000;
const POLITE_DELAY_MAX = 3000;

// Honest crawler headers — no browser impersonation (no Sec-Fetch-*,
// Upgrade-Insecure-Requests, fake Referer, or no-cache headers).
const REQUEST_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate',
};

const MAX_RETRIES = 3;

let lastRequestTime = 0;

/**
 * Strip tracking/cache-buster params for canonicalization.
 * IMPORTANT: callers must run robots.txt checks against the ORIGINAL URL
 * before invoking this helper. We never "clean" a disallowed URL into an
 * allowed one.
 */
function canonicalize(url: string): string {
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
  // Robots check on the ORIGINAL URL — do not strip params first.
  if (!isAllowed(url)) {
    throw new Error(`robots.txt disallows: ${url}`);
  }
  const requestUrl = canonicalize(url);
  await politeDelay();
  return withRetry(async () => {
    const response = await axios.get<string>(requestUrl, {
      headers: REQUEST_HEADERS,
      responseType: 'text',
      timeout: 15000,
    });
    return response.data;
  });
}

export async function fetchGzip(url: string): Promise<Buffer> {
  // Robots check on the ORIGINAL URL — do not strip params first.
  if (!isAllowed(url)) {
    throw new Error(`robots.txt disallows: ${url}`);
  }
  const requestUrl = canonicalize(url);
  await politeDelay();
  return withRetry(async () => {
    const response = await axios.get<ArrayBuffer>(requestUrl, {
      headers: REQUEST_HEADERS,
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
