# Basecamp Surplus: search launch and catalog expansion

## Delivered in code

- Evergreen reference URLs `/poles/tents/<model>` for the 19 source-backed models in `content/tent-reference.json`. These distinguish historical specifications from measured inventory and keep capacity and generation distinct.
- Four focused collection pages: `/collections/easton-tent-poles`, `/collections/dac-tent-poles`, `/collections/north-face-replacement-poles`, `/collections/north-face-tent-stakes`. Mandatory collection searches remain in force when shoppers add their own filters.
- Navigation and model suggestions link directly to guides. Known model search URLs permanently redirect to the guide. Other searches are noindex. Legacy `/c/poles` redirects preserve parameters.
- Pagination has its own canonical, with search/sort/condition/size variants noindex. Brand and ordinary category pages with zero stock are noindex. Empty ordinary categories and search parameters are omitted from the sitemap. Evergreen guides remain useful when inventory is empty.
- Feed prices equal the actual listing price; MSRP is not presented as a prior selling price. Internal SKUs are not manufacturer part numbers. Enter verified `MPN: ...` and/or `GTIN: ...` in the existing Specs editor to supply identifiers. GTIN length and checksum are validated, with leading zeros retained. Missing identifiers are omitted, not asserted nonexistent; inspect Merchant Center diagnostics for products requiring identifiers.
- Optional `GOOGLE_SITE_VERIFICATION` emits the Search Console HTML verification token. This does not register, verify or submit a property on its own.

## Before indexing the actual store

1. Deploy the application and stock migration to its configured host. The owner-private Sites design preview is not an indexable sales site and is not this Next.js backend.
2. Set `NEXT_PUBLIC_SITE_URL` to the real canonical HTTPS origin, connect the domain and verify normal public access. Keep admin authentication in place.
3. Photograph real stock and publish individual sale units with accurate quantities, model/generation, condition, measurements, included contents, price and images. Do not seed demonstration listings.
4. Add manufacturer MPN/barcode values from labels where available. Do not invent them, use store SKUs as MPNs, or blanket-claim that branded goods have no identifiers.
5. Verify the domain in Search Console and submit `/sitemap.xml`. Inspect a collection, a model guide and a real product URL for canonical choice and indexing eligibility.
6. Validate actual Product markup with Google's Rich Results Test and register the existing `/feeds/products.xml` source in Merchant Center. Resolve price, availability, identifier, shipping and return-policy diagnostics against actual business policies.
7. Check mobile page performance on the deployed site with real product images. Build-time HTML checks do not measure live Core Web Vitals.
8. Measure indexed pages, query impressions, clicks and product conversions. Prioritize model pages that receive searches and have stock or a useful replacement path. No keyword volumes or ranking improvements have been measured here.

## Content and links worth earning

Publish original measurements and clear photographs of actual pole sets, tips, hubs and tent labels. Keep source confidence on historical specifications. Add per-generation fitment only with evidence. Help tent owners identify a part, then link to the actual listing. Share genuinely useful guides with repair communities under their rules; do not buy links, manufacture reviews or create near-duplicate location pages.

## Next: supplier-fulfilled styles

The owner requested dropshipping to fill styles missing from owned stock. No supplier has been selected or connected, and no supplier stock is live. Before implementing order routing, obtain authorized supplier terms and an actual catalog/API or feed.

Required data and behavior:

- Separate owned stock from supplier availability; show “Ships from supplier,” ship-from region, handling/transit estimates, shipping price and return terms on the product page and checkout.
- Keep supplier SKU, source, landed cost, fee/shipping allowance, minimum margin and supplier inventory timestamp. Pause stale feeds and unavailable SKUs; never treat unknown stock as available.
- Confirm distribution authorization for brands and permission to use catalog photos/descriptions. Do not assume major outdoor brands allow dropshipping.
- Route orders only through a supported supplier workflow. Test stock changes, split shipments, tracking, cancellations and returns before enabling customer checkout.
- Keep variant identifiers and canonical URLs accurate. Add unique merchandising and sizing information instead of flooding search with copied supplier pages.
- Do not enable supplier items under the current Denver-stock shipping promises. Supplier-specific fulfillment and policy support must ship before those products are published.

## Verification

```
npm run build
node --conditions=react-server --import tsx --test src/lib/seo.test.ts
node --import tsx --test src/lib/stock-rules.test.ts
python scripts/check-seo-build.py
```

The HTML check covers prerendered guide pages and sitemap. Live database-driven collections, redirects, checkout, Search Console and Merchant Center require configured deployment verification.
