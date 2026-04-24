# Manual Sync Instructions for AI Agent

You are an AI agent helping to populate **The Lush Vault** — a product metadata archive for the US Lush website. The automated GitHub Actions sync cannot reach lush.com's CDN, so your job is to scrape product pages manually and write the data into this repository.

---

## What you need to do

1. Fetch product pages from `https://www.lush.com/us/en_US/p/<slug>`
2. Extract key metadata from the HTML
3. Write a `data/products/<slug>/current.json` file for each product
4. Rebuild the index files
5. Commit and push everything

---

## Step 1 — Find product URLs

Try fetching the sitemap to get a list of product slugs:

```bash
curl -s \
  -A "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0" \
  -H "Accept-Language: en-US,en;q=0.9" \
  "https://www.lush.com/sitemap.xml" \
  | grep -oP 'https://www\.lush\.com/us/en_US/p/[^<]+' \
  | sort -u
```

If that returns nothing, scrape product links from category pages instead:

```bash
for cat in face body hair bath skin gifts; do
  curl -s \
    -A "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0" \
    -H "Accept-Language: en-US,en;q=0.9" \
    "https://www.lush.com/us/en_US/c/$cat" \
    | grep -oP '(?<=href=")[^"]*?/us/en_US/p/[^"]+' \
    | sed 's|^|https://www.lush.com|' \
    | sort -u
  sleep 3
done
```

Collect all unique URLs that match `https://www.lush.com/us/en_US/p/<slug>`.

---

## Step 2 — Scrape each product page

For every URL discovered above, fetch the HTML and save it:

```bash
slug="<slug>"
curl -s \
  -A "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0" \
  -H "Accept-Language: en-US,en;q=0.9" \
  "https://www.lush.com/us/en_US/p/$slug" > /tmp/lush_$slug.html
sleep 3
```

Wait **at least 3 seconds** between every request.

---

## Step 3 — Extract data from the HTML

Use this Python snippet to parse a saved HTML file:

```bash
python3 - /tmp/lush_<slug>.html <<'EOF'
import sys, re, json
from html.parser import HTMLParser

html = open(sys.argv[1], encoding='utf-8', errors='replace').read()

def text_of(pattern):
    m = re.search(pattern, html, re.S | re.I)
    return re.sub(r'<[^>]+>', '', m.group(1)).strip() if m else ''

title       = text_of(r'<h1[^>]*product[^>]*>(.*?)</h1>')
price_raw   = text_of(r'<[^>]*class="[^"]*price[^"]*"[^>]*>(.*?)</')
description = text_of(r'<[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)</(?:p|div|section)>')
category    = ''
ingredients = []

# breadcrumb — second-to-last link
bc = re.findall(r'<a[^>]*breadcrumb[^>]*>(.*?)</a>', html, re.I | re.S)
if len(bc) >= 2:
    category = re.sub(r'<[^>]+>', '', bc[-2]).strip()

# ingredients block
ing_m = re.search(r'class="[^"]*ingredient[^"]*"[^>]*>(.*?)</(?:div|section|ul)', html, re.S | re.I)
if ing_m:
    raw_ing = re.sub(r'<[^>]+>', '', ing_m.group(1)).strip()
    ingredients = [i.strip() for i in re.split(r',|\n', raw_ing) if i.strip()]

print(json.dumps({
    'title': title,
    'price_raw': price_raw,
    'description': description,
    'category': category or 'uncategorized',
    'ingredients': ingredients
}, indent=2))
EOF
```

---

## Step 4 — Write the product JSON file

For each product, create `data/products/<slug>/current.json` using this exact schema:

```json
{
  "slug": "sleepy",
  "url": "https://www.lush.com/us/en_US/p/sleepy",
  "title": "Sleepy",
  "price": {
    "amount": 14.95,
    "currency": "USD",
    "formatted": "$14.95"
  },
  "description": "A dreamy lavender body lotion.",
  "ingredients": ["Water", "Organic Shea Butter", "Lavender Oil"],
  "badges": [],
  "images": [],
  "category": "Body",
  "fetchedAt": "2026-04-24T17:00:00.000Z",
  "updatedAt": "2026-04-24T17:00:00.000Z"
}
```

**Rules:**
- `price.amount` — number, not a string (e.g. `14.95`)
- `price.currency` — always `"USD"`
- `ingredients` — array of strings; `[]` if none found
- `badges` — `[]`
- `images` — `[]`
- `category` — `"uncategorized"` if not found
- Omit the `"collection"` key entirely if no collection is found
- `fetchedAt` and `updatedAt` — current UTC time in ISO-8601 format

```bash
mkdir -p data/products/<slug>
# then write the JSON using your editor or a heredoc
```

---

## Step 5 — Rebuild the index

After writing all product files, run this to regenerate `data/index/all.json` and `data/index/by-category/*.json`:

```bash
node -e "
const fs = require('fs'), path = require('path');
const dir = 'data/products';
const all = [];
for (const slug of fs.readdirSync(dir)) {
  const f = path.join(dir, slug, 'current.json');
  if (!fs.existsSync(f)) continue;
  try {
    const p = JSON.parse(fs.readFileSync(f, 'utf-8'));
    all.push({ slug: p.slug, title: p.title, category: p.category, url: p.url, updatedAt: p.updatedAt });
  } catch(e) { console.error('skip:', f, e.message); }
}
fs.mkdirSync('data/index/by-category', { recursive: true });
fs.writeFileSync('data/index/all.json', JSON.stringify(all, null, 2));
console.log('Indexed', all.length, 'products');
const byCat = {};
for (const p of all) {
  (byCat[p.category] = byCat[p.category] || []).push(p);
}
for (const [cat, entries] of Object.entries(byCat)) {
  fs.writeFileSync('data/index/by-category/' + cat + '.json', JSON.stringify(entries, null, 2));
}
console.log('Categories:', Object.keys(byCat).join(', '));
"
```

---

## Step 6 — Commit and push

```bash
git add data/
git commit -m "chore: manual product sync $(date -u +%Y-%m-%d)"
git push origin main
```

The GitHub Pages deploy workflow runs automatically on every push to `main` and publishes the updated data to the live site.
