# The Lush Vault

An archival research tool for Lush US products. Crawls, parses, normalizes, and stores product data from [lush.com](https://www.lush.com) for the US (`en_US`) locale only.

> **Not commercial. For archival/research purposes only.**

---

## Archive Policy

The Lush Vault stores limited factual product metadata for archival and research purposes: product names, canonical URLs, slugs, categories/collections, visible price text, observed availability markers, and timestamps.

This project does not attempt to bypass access controls, authentication, paywalls, Cloudflare challenges, or `robots.txt` exclusions. It does not impersonate a browser.

The crawler prefers Lush's public sitemap for discovery and only fetches public US `en_US` product pages (`https://www.lush.com/us/en_US/p/{slug}`) that are not disallowed by `robots.txt`.

The Lush Vault is not a full mirror of lush.com. It does not intentionally archive full marketing copy, bulk images, checkout flows, account pages, or private/customer-specific content. The narrow archive shape is described by `ProductMetadata` in `src/types/product.ts`.

---

## Scope

- **US-only**: only `/us/en_US/` locale is fetched
- Canonical product URL: `https://www.lush.com/us/en_US/p/{slug}`
- All requests respect `robots.txt` (fetched and cached)

## robots.txt Compliance

The fetcher checks the **original** request URL against `robots.txt` *before* any tracking/canonical cleanup. URLs disallowed by `robots.txt` are skipped — never "cleaned" into an allowed form.

Disallowed patterns enforced at runtime:

| Pattern | Reason |
|---|---|
| `/static/` | Static assets |
| `*?query=*` | Search queries |
| `*?t=*` | Tracking parameters |
| `*/p/customised-gift-box` | Custom product |
| `*/us/en/*` | Non-en_US locales |

Only `/us/en_US/` paths are allowed.

## Setup

```bash
npm install
```

## Usage

```bash
# Full product sync (respects robots.txt, polite 2-3s delay)
npm run sync

# Incremental sync since a date
npm run sync -- --since 2024-01-01

# Dry run (no writes)
npm run dev:sync

# Validate all data files against JSON schema
npm run validate

# TypeScript build
npm run build
```

## Project Structure

```
src/
  ingestion/
    robots.ts        # robots.txt fetcher/cache/checker
    fetcher.ts       # HTTP fetcher with rate limiting & backoff
    sitemap.ts       # Sitemap parser → US product URLs
    parser.ts        # HTML → RawProduct (cheerio)
    normalizer.ts    # RawProduct → Product
    identity.ts      # Slug/title deduplication
    diff.ts          # Change detection
    pipeline.ts      # CLI entry point
    adapters/
      lush-us.ts     # Lush US adapter
  storage/
    reader.ts        # Read products/index from disk
    writer.ts        # Write products/diffs to disk
    index-builder.ts # Rebuild flat + per-category indexes
  scripts/
    validate.ts      # AJV schema validation CLI
  types/
    product.ts       # TypeScript interfaces
  schemas/
    product.schema.json
data/
  products/{slug}/current.json   # Normalized product
  products/{slug}/diffs/         # Change history
  index/all.json                 # Flat product index
  index/by-category/{cat}.json   # Per-category index
  meta/robots-cache.json         # Cached robots.txt rules
site/
  index.html                     # Static product browser (GitHub Pages)
.github/workflows/
  sync.yml     # Daily sync
  validate.yml # CI validation on push/PR
  pages.yml    # Deploy site/ to GitHub Pages
```

## GitHub Actions

- **sync.yml** – runs daily at 06:00 UTC, commits updated `data/`
- **validate.yml** – validates all product JSON on every push/PR
- **pages.yml** – deploys `site/` to GitHub Pages on push to `main`

## Contributing

This project is for archival and research purposes. Contributions that improve data quality, parsing accuracy, or schema coverage are welcome. Please ensure all changes pass `npm run validate`.

## License

MIT

