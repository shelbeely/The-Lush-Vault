import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { USER_AGENT } from './constants';

const ROBOTS_URL = 'https://www.lush.com/robots.txt';
const CACHE_PATH = path.resolve(process.cwd(), 'data/meta/robots-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const FALLBACK_DISALLOW: string[] = [
  '/static/',
  '/*?query=',
  '/*?t=',
  '/*/p/customised-gift-box',
  '/*/us/en/',
  '/*/us/en_ae/',
  '/*/us/en_ca/',
  '/*/us/ar/',
  '/*/us/cs/',
  '/*/us/de/',
  '/*/us/de_at/',
  '/*/us/es/',
  '/*/us/fr/',
  '/*/us/fr_ca/',
  '/*/us/hu/',
  '/*/us/it/',
  '/*/us/ja/',
  '/*/us/nl/',
  '/*/us/pl/',
  '/*/us/pt/',
  '/*/us/sv/',
  '/*/us/zh_hk/',
  '/*/us/zh_tw/',
];

let disallowPatterns: string[] = [];

interface RobotsCache {
  fetchedAt: string | null;
  disallowPatterns: string[];
}

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + escaped);
}

export async function loadRobots(): Promise<void> {
  // Try cache first
  if (fs.existsSync(CACHE_PATH)) {
    try {
      const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
      const cache: RobotsCache = JSON.parse(raw);
      if (cache.fetchedAt && cache.disallowPatterns.length > 0) {
        const age = Date.now() - new Date(cache.fetchedAt).getTime();
        if (age < CACHE_TTL_MS) {
          disallowPatterns = cache.disallowPatterns;
          return;
        }
      }
    } catch {
      // fall through to fetch
    }
  }

  try {
    const response = await axios.get<string>(ROBOTS_URL, {
      headers: { 'User-Agent': USER_AGENT },
      responseType: 'text',
      timeout: 10000,
    });

    const patterns = parseRobotsTxt(response.data);
    disallowPatterns = patterns.length > 0 ? patterns : FALLBACK_DISALLOW;

    const cache: RobotsCache = {
      fetchedAt: new Date().toISOString(),
      disallowPatterns,
    };

    await fs.promises.mkdir(path.dirname(CACHE_PATH), { recursive: true });
    await fs.promises.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch {
    disallowPatterns = FALLBACK_DISALLOW;
  }
}

function parseRobotsTxt(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim());
  const patterns: string[] = [];
  let applicable = false;

  for (const line of lines) {
    if (line.toLowerCase().startsWith('user-agent:')) {
      const agent = line.slice('user-agent:'.length).trim().toLowerCase();
      applicable = agent === '*' || agent === 'lushvaultarchive';
    } else if (applicable && line.toLowerCase().startsWith('disallow:')) {
      const pattern = line.slice('disallow:'.length).trim();
      if (pattern) patterns.push(pattern);
    }
  }

  return patterns;
}

export function isAllowed(url: string): boolean {
  const patterns = disallowPatterns.length > 0 ? disallowPatterns : FALLBACK_DISALLOW;
  let urlPath: string;
  try {
    urlPath = new URL(url).pathname + new URL(url).search;
  } catch {
    urlPath = url;
  }

  for (const pattern of patterns) {
    const regex = patternToRegex(pattern);
    if (regex.test(urlPath)) return false;
  }
  return true;
}
