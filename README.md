# Basecamp Surplus

Storefront, AI listing intake, multi-marketplace selling, shipping labels and AI customer support for new-with-tags outdoor gear (plus pre-owned Patagonia), built on Next.js 16 for Vercel.

## What's in it

| Area | What it does |
|---|---|
| Storefront | Home, category, brand, product and search pages. Product, Offer, shipping, return-policy, Breadcrumb, FAQ and WebSite schema. Sitemap with images, robots, canonical URLs, noindex on filtered pages. |
| Pole set intake | Admin → Add item → *Pole set*: one photo of a tent's whole pole kit beside a tape measure creates a draft listing for every distinct pole, with lengths read from the tape or labels, stock = sets × poles per tent. |
| Pole finder | `/poles` searches poles by the tent models they fit. `replacementtentpole.com` serves it as its own landing page; `highcountrysurplus.com` 301s to the main store. |
| AI intake | `/admin/intake` on your phone: take photos → Claude reads tags/labels → draft with title, description, specs, condition notes, SEO title/description, keywords, hashtags, eBay item specifics, pole fitment, and a price. Patagonia defaults to "used, good". |
| Pricing | NWT: MSRP × 0.62, checked against live eBay new-condition asks. Used: eBay pre-owned median minus 7%, MSRP fallback. Prices end in 9. |
| Checkout | Cart + Stripe Checkout (cards, Apple/Google Pay), flat-rate shipping with a free threshold, stock checked at checkout and decremented atomically in the webhook. Oversells are flagged. |
| eBay | OAuth connect, one-click list/update (fee markup applied), quantity sync and auto-withdraw on sell-out, eBay orders pulled into your queue whenever you open the admin (plus a daily cron), tracking pushed back to eBay. |
| Google / Meta / Pinterest | `/feeds/products.xml` (Google Merchant RSS). One feed URL powers Google Shopping free listings, Facebook & Instagram Shops (and Marketplace where Meta approves), and Pinterest catalogs. |
| Poshmark, Mercari, Depop, Geartrade | No public listing APIs (Poshmark bans automation), so each product gets a copy pack with fee-adjusted pricing, plus a crosslister CSV for Vendoo/List Perfectly. Sold-out items show on the Today screen to remove there. |
| Shipping | Per order: pick a box preset, get Shippo rates, buy a 4×6 label, tracking emailed automatically (or uploaded to eBay). |
| Reviews | `/reviews` long-form gear reviews with a verdict box, pros/cons, specs and sources, Article schema, and an in-stock box that links each review to matching products (and products back to their review). Admin → Reviews → *Write a review* has Claude research a model on the web and draft one for you to edit and publish. Starter reviews live in `content/reviews/*.json` and load on deploy. |
| Support | Help chat on every page answers from live inventory and policies, looks up orders (order number + email), and opens tickets for returns/damage. Tickets land in `/admin/support`; you reply by email from there. |

## Setup

1. **Database**: in Vercel, add Neon from the Marketplace. Then `npx drizzle-kit migrate` with `DATABASE_URL` set.
2. **Blob**: create a Vercel Blob store on the project (sets `BLOB_READ_WRITE_TOKEN`).
3. **Env vars**: copy `.env.example` and fill it in on Vercel.
4. **Stripe**: add the webhook endpoint `/api/stripe/webhook`.
5. **Domains**: add `basecampsurplus.com`, `highcountrysurplus.com` and the pole domain to the project.
6. **eBay**: production keyset + RuName at developer.ebay.com, business policies in Seller Hub, then Admin → Channels → Connect eBay.
7. **Google Merchant Center / Meta Commerce Manager / Pinterest**: add the feed URL as a scheduled data source.

Local preview: `cp .env.example .env.local`, point at a local Postgres, `npx drizzle-kit migrate`, `npm run db:seed` (demo items, DEMO- SKUs; `npm run db:seed -- --clear` removes them), `npm run dev`.

## Daily workflow

1. **Add item** (phone) → photos → *Write the listing* → review → **Publish**. It's live on the site and in the feeds.
2. **List on eBay** from the product page; copy packs for Poshmark/Mercari/Depop.
3. **Today** shows orders to ship, tickets, and marketplaces to delist.
4. Open an order → *Get rates* → *Buy label* → print → done; the customer gets tracking.
