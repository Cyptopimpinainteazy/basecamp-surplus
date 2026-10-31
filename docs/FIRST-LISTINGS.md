# First real listings and launch blockers

## Pole units of sale

Pole listings must now explicitly declare one of:

- **Section:** one loose tube segment.
- **Assembly:** one complete connected pole.
- **Set:** all assemblies needed for the identified tent, with an explicit assembly count (1–100; one hub assembly can be a complete frame).

These fields are stored in existing `poleSpec` JSONB; there is no new database migration for this change. The prior stock-adjustment migration from PR #1 is still required.

In `/admin/products/<id>`, choose the sale unit under Pole sale unit & measurements. Full sets need the assembly count. Quantity counts this chosen sale unit, not the number of sections inside it. Recount stock when changing how a SKU is sold. Do not count a complete set and the same component poles as separate sellable stock. This change does not implement shared component inventory or automatic disassembly.

Existing poles without a confirmed unit are blocked at checkout, omitted from the product feed, and cannot be newly pushed to eBay until reviewed. Affected product pages remain visible with a confirmation message. Drafts can be saved before the unit is known. Existing external listings are not automatically rewritten or withdrawn by this change; review them manually.

The public card, product page, cart and Stripe checkout show the unit. New checkout sessions snapshot its label into Stripe metadata, and the webhook preserves that label in order JSON for the packing page and confirmation email. Legacy sessions without a label remain unlabeled; no unit is guessed retrospectively. Manual crosslisting copy includes the unit or an unconfirmed warning.

Duplicate product IDs in a checkout payload, including case variants, are rejected before stock checks so splitting one SKU into multiple lines cannot evade its quantity limit. Prices must be positive integers in cents.

## First batch

Start with about 30–50 real listings rather than importing unverifiable inventory.

For each SKU record: brand, exact model/capacity/generation, condition, sale unit, included assembly count, actual counted quantity and selling price. Photograph the full included item(s), manufacturer markings, both end tips, connector interfaces and any wear. Measure relevant lengths/diameters and identify hubs or bends. Keep original fitment evidence and physical bin labels with the SKU. Acquisition cost is $0 per the owner; inbound handling, labor, storage and shipping costs still need recording.

Use the existing manual draft form in `/admin/stock`; upload real photos in the product editor; save measurements and the unit; review before publishing. Generated category images are not item-condition evidence. List a duplicate batch under one counted SKU only when the items truly share the recorded identity, unit, dimensions and condition.

## Deployment evidence this session

A read-only search of the connected Vercel account for project name `basecamp` returned no projects. This does not establish that no project exists in another team/account or under another name. No project, database, credentials or paid service was created, and no live inventory was changed. The existing Sites page remains a private design preview, not the commerce backend.

Needed to activate commerce: the actual hosting project/account, Postgres and pending migration, admin session configuration, Blob uploads, Stripe and a verified webhook, shipping/email services, domain and actual stock. Verify these in a test environment before enabling live sales. Never paste API keys into chat.

## Remaining code-level release concerns found during inspection

- `createOrderFromCheckout` currently calls `applyStock` before the unique order insert. Concurrent webhook deliveries can both pass the initial existing-order read and decrement stock before one insert loses the uniqueness race. Payment handling must claim/process the order and stock atomically, with a retry-safe workflow, before real-money launch. This PR does not fix or test that existing transaction problem.
- Current checkout stores the whole cart JSON in one Stripe metadata value. A large cart can exceed Stripe's metadata value limit. Address payload sizing/line-item snapshots before broad checkout testing; this PR adds only bounded per-product sale-unit labels.
- Order item prices are currently read from mutable inventory at webhook time. Payment line-item snapshots and discount handling need review before treating stored line amounts as the original charged amounts.

These are release blockers to investigate and verify, not evidence that live customer orders have already failed.

## Verification

```
npm run build
node --import tsx --test src/lib/pole-sale.test.ts src/lib/stock-rules.test.ts
node --conditions=react-server --import tsx --test src/lib/seo.test.ts
python scripts/check-seo-build.py
```

Tests cover unit distinction/count boundaries, unknown-unit checkout blocking, price validation and duplicate cart rejection. Live database, Stripe payment/webhook, eBay and packing/email end-to-end checks still require configured services.


The stacked `fix/atomic-paid-orders` change addresses the webhook claim/stock race, original paid-price snapshots and cart metadata size. See [ORDER-SAFETY.md](ORDER-SAFETY.md) for migration, verification and remaining live-service checks.
