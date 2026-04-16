import axios from 'axios';
import zlib from 'zlib';
import { isAllowed } from './robots';

const USER_AGENT = 'LushVaultArchive/1.0 (https://github.com/shelbeely/The-Lush-Vault; archival research; not commercial)';
const POLITE_DELAY_MIN = 2000;
const POLITE_DELAY_MAX = 3000;
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
    if ((status === 429 || (status !== undefined && status >= 500)) && attempt < MAX_RETRIES) {
      const backoff = Math.pow(2, attempt) * 1000;
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
      headers: { 'User-Agent': USER_AGENT },
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
      headers: { 'User-Agent': USER_AGENT },
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
