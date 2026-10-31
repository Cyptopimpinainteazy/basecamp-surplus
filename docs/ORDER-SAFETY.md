# Paid-order safety

This change is stacked on `feat/pole-sale-units`. Apply migration `0003_order_tasks` before running the new order handler (the existing Vercel build runs migrations).

## Behavior

- A unique Stripe session/eBay order is claimed before stock allocation. The claim, sorted row locks, full-cart allocation and durable follow-up jobs share one PostgreSQL transaction. A duplicate delivery reads the saved order without touching stock.
- Different paid orders competing for the last item cannot make inventory negative. If any line cannot be allocated, the entire order is held with `needs_attention`, with no stock allocated. Reconcile **all** its inventory through Stock before choosing **Stock reconciled, ready to ship**. Buying a shipping label is blocked until the order is ready.
- Stripe's paginated paid line items supply original titles, quantities, unit prices, sale units, discounts and tax. Current catalog prices are never used to price a paid order. New checkouts store unit identity on each Stripe product rather than putting an oversized cart JSON value in session metadata. Legacy sessions retain their original `u_<id>` unit labels and cart checks.
- Stock sync, customer confirmation and owner notification are durable tasks. Duplicate webhook delivery, the authenticated daily eBay cron (even without eBay connected), and **Retry follow-ups** in the admin order page can retry them without allocating stock again. Failed tasks and attempts are visible there.
- Follow-up workers use expiring database leases. Email requests use a stable Resend idempotency key and a 20-second timeout. Resend's deduplication window is finite: delivery after a long failure can still duplicate an email, but cannot duplicate an order or stock deduction.
- External marketplace quantity updates are eventual, not a reservation system. Buyers can pay concurrently through different channels; such shortages need manual resolution/refund. Checkout itself does not reserve inventory.

## Verification

`npm run test:unit` covers checkout/unit rules, SEO and paid Stripe-shaped fixtures; these fixtures make no Stripe calls.

`npm run test:orders` requires `ORDER_TEST_DATABASE_URL` for an isolated **local** disposable PostgreSQL database; the suite truncates its commerce tables. Never point it at live data. GitHub Actions provides PostgreSQL 18 and runs all migrations, concurrent deliveries (24 connections/tasks), competing last-unit orders, cart aggregation, full-cart holds, transactional rollback after an injected database failure, eBay idempotency, lease recovery, complete-set units and actual unconfigured-email task retries.

The production build and generated SEO checks run in the same CI job. Live Stripe signature delivery, payment capture, email delivery and eBay calls still require configured service credentials and a test deployment. Do not call this production-verified on the strength of fixture/database tests alone.
