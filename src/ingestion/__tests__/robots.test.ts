import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowed } from '../robots';

// `isAllowed` falls back to the bundled disallow list when no robots cache
// has been loaded. That fallback already includes `/*?query=` and `/*?t=`,
// so these tests exercise the production behavior without network access.

test('robots: a US product URL with ?query= is disallowed', () => {
  assert.equal(
    isAllowed('https://www.lush.com/us/en_US/p/foo?query=bar'),
    false,
  );
});

test('robots: a US product URL with ?t= cache-buster is disallowed', () => {
  assert.equal(
    isAllowed('https://www.lush.com/us/en_US/p/foo?t=12345'),
    false,
  );
});

test('robots: a clean US product URL is allowed', () => {
  assert.equal(
    isAllowed('https://www.lush.com/us/en_US/p/foo'),
    true,
  );
});

test('robots: a static asset path is disallowed', () => {
  assert.equal(
    isAllowed('https://www.lush.com/static/anything.js'),
    false,
  );
});
