import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { fetchHtml } from '../fetcher';

// We don't need to load robots.txt — `isAllowed` falls back to the bundled
// disallow list which already covers `/*?query=` and `/*?t=`.

type AxiosGet = typeof axios.get;
const realGet: AxiosGet = axios.get.bind(axios);

interface AxiosCall {
  url: string;
  config?: { headers?: Record<string, string> };
}
let calls: AxiosCall[] = [];

beforeEach(() => {
  calls = [];
  // Stub axios.get; tests that need a particular response override per-test.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (axios as unknown as { get: AxiosGet }).get = (async (url: string, config?: unknown) => {
    calls.push({ url, config: config as AxiosCall['config'] });
    return { data: '<html></html>' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
});

test('fetcher: rejects ?query= URLs WITHOUT calling axios (no pre-strip)', async () => {
  await assert.rejects(
    () => fetchHtml('https://www.lush.com/us/en_US/p/foo?query=bar'),
    /robots\.txt disallows/,
  );
  assert.equal(calls.length, 0, 'axios.get must not be called for disallowed URL');
});

test('fetcher: rejects ?t= URLs WITHOUT calling axios (no pre-strip)', async () => {
  await assert.rejects(
    () => fetchHtml('https://www.lush.com/us/en_US/p/foo?t=12345'),
    /robots\.txt disallows/,
  );
  assert.equal(calls.length, 0, 'axios.get must not be called for disallowed URL');
});

test('fetcher: does not impersonate a browser (no Sec-Fetch-* / fake Referer)', async () => {
  // Use an allowed URL. politeDelay may add up to ~3s here.
  await fetchHtml('https://www.lush.com/us/en_US/p/some-product');
  assert.equal(calls.length, 1);
  const headers = calls[0].config?.headers ?? {};
  assert.match(String(headers['User-Agent']), /LushVaultArchive/);
  for (const banned of [
    'Sec-Fetch-Dest', 'Sec-Fetch-Mode', 'Sec-Fetch-Site', 'Sec-Fetch-User',
    'Upgrade-Insecure-Requests', 'Referer',
  ]) {
    assert.equal(headers[banned], undefined, `header ${banned} must not be sent`);
  }
});

// Restore axios.get when this file is done so it doesn't bleed into other suites.
test.after?.(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (axios as unknown as { get: AxiosGet }).get = realGet;
});
