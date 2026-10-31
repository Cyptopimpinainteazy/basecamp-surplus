# Basecamp Surplus

Storefront, AI listing intake, multi-marketplace selling, shipping labels and AI customer support for new-with-tags outdoor gear (plus pre-owned Patagonia), built on Next.js 16 for Vercel.

## What's in it

| Area | What it does |
|---|---|
| Storefront | Home, category, brand, product and search pages. Product, Offer, shipping, return-policy, Breadcrumb, FAQ and WebSite schema. Sitemap with images, robots, canonical URLs, noindex on filtered pages. |
| Pole set intake | Admin → Add item → *Pole set*: one photo of a tent's whole pole kit beside a tape measure creates a draft listing for every distinct pole, with lengths read from the tape or labels, stock = sets × poles per tent. |
| Loose poles | Admin → Loose poles: measure a pole (type straight/pre-bent/hub, length, sections, diameter, color), see matching listed poles and add the pile to that listing's stock in one tap, or create a by-size draft when nothing matches. |
| Find by size | `/poles/size`: customers who don't know their tent model search by length, sections, diameter, and straight / pre-bent / hub type. |
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

## Stock workspace and tent/pole cross-selling

- `/admin/stock` is authenticated and paginated (40 SKUs). Filter by brand, category, search, live/low/zero stock or drafts. Low stock means 1–3 live units. Totals follow the filters; list value is active inventory at asking price, not profit.
- Count sale units, not cartons or tent sets unless the listing itself sells a complete set. North Face stakes use **Tent parts** with product type **stakes**; jackets use **Jackets & coats**. Brands include Easton, DAC, The North Face, Patagonia, Fjällräven, Dope and Montec.
- The stock workspace also creates manual draft items without AI: unique SKU, brand, category, condition, quantity, model, size and item type. Upload photos directly in the item editor (uses the configured Vercel Blob store); review pricing and fitment before publishing.
- Manual counts require a reason and record before/after quantities atomically in `stock_adjustments`. A database timestamp and previous count reject stale edits after sales or other changes. Zeroing a live SKU marks it sold out. Receiving stock never auto-publishes a draft, archived or sold-out listing; review it in Listings before publishing.
- Stock edits call the existing marketplace synchronizer. Check Channels for eBay failures and Today for manual delisting tasks; this is not a guarantee of synchronous marketplace inventory.
- Home links shoppers into Easton/DAC pole searches, tents, stakes and clothing brands. Pole search includes material fields. Product pages cross-sell only active stock with exact recorded brand/model fitment. Capacity/year/generation remain part of the key; no title-based compatibility guessing. List a tent model consistently, e.g. brand `The North Face`, model `Wawona 4`, and a part fitment line `The North Face Wawona 4`.
- Apply the additive `0002_stock_adjustments` migration with `npm run db:migrate` before opening Stock. The manual adjustment log covers this workspace only; it is not a full sales or staff audit ledger. Admin authentication remains the existing shared-admin session.

Validation: `npm run typecheck`, `node --import tsx --test src/lib/stock-rules.test.ts`, `npm run build`. A real database and configured marketplace/payment credentials are required for end-to-end stock, checkout and channel verification. Never seed demo listings into real stock.

## Dropshipping and custom orders

- **Suppliers** (Admin → Suppliers): anyone who ships or makes things for you. See `docs/SUPPLIERS.md` for the researched shortlist.
- **Dropship / made-to-order listings**: set an item's *Fulfillment* and *Supplier* in its editor. A paid order emails the
  supplier a purchase order with a private link where they confirm and add tracking; the customer is emailed tracking
  automatically. Open supplier orders show on the admin dashboard.
- **Custom shop** (`/custom`):
  - Logo canopy tents: live preview + estimate → request → you send the printer's proof and price → customer approves and
    pays on their private page → PO to the printer.
  - Poles cut to size: priced instantly from your shop rates and paid at checkout; shows up as a build ticket.
  - Private-label tents: factory-quote requests for brands, quoted the same way as canopies.
- **Prices**: Admin → Custom jobs → Builder pricing. Replace the starting values with real printer quotes and your rates.
- Supplier PO emails need `RESEND_API_KEY` and `OWNER_EMAIL`; payments need Stripe. Without email, POs stay queued and
  retry, and you can send or mark them from the order page.
