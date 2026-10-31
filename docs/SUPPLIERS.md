# Dropship and custom-order suppliers

Researched October 31, 2026. Terms change, so confirm each one directly
before you add them in **Admin → Suppliers**. Nothing here is a signed
agreement; it's a shortlist with what each source publicly says.

## How the site works with suppliers

None of the suppliers below offer an order API for small resellers. They take
orders by email or through a rep. The site follows that model:

1. A paid order that includes a dropship item, a made-to-order item or an
   approved custom tent creates one **purchase order (PO)** per supplier.
2. The PO is emailed to the supplier's order address with the ship-to
   address, items, your cost, artwork links and a private link.
3. The supplier opens the link to confirm the order and enter tracking. The
   customer gets the tracking email automatically, and the order closes when
   every part has shipped.
4. If the email fails, the PO stays queued and retries. You can resend it
   or mark it sent by hand from the order page.

Mark a supplier **blind ship** only after they confirm that packages go out
with no supplier branding or invoice. The PO email asks for it either way.

## 1. Logo canopy and event tents (made to order, ships from the printer)

Every logo canopy needs artwork and a proof before production. The site
collects the request and artwork, you get the printer's quote and proof,
then the customer approves and pays on their own page. Payment always comes
after the proof, so you never pay a printer for something the customer
hasn't approved.

| Source | What they publicly say | Fit |
|---|---|---|
| [Vistaprint Advantage (reseller program)](https://www.vistaprint.com/reseller/) | $59.99/year. Explicit blind shipping ("unbranded and delivered in unbranded packaging"). Up to 20% off signs, banners and posters. The page doesn't confirm whether canopy tents are in the discount; ask Customer Care. | Easiest start: no application, blind shipping in writing. Retail-level pricing, so margins are thinner. |
| [Impact Canopy, reseller/dealer inquiry](https://impactcanopy.com/pages/reseller-dealer-inquiry/) | Has a dealer inquiry form. No terms, discounts or shipping details are published. | US commercial canopy maker. Ask about dealer pricing, blind shipping and proof turnaround. |
| [KD Kanopy, dealer program](https://kdkanopy.com/support/dealer-program/) | Wholesale pricing with graphics included. Requires a business plan (6 pages max) and an initial investment. Drop shipping isn't mentioned. | Higher commitment. Worth it later if canopy volume grows. |
| [Westshade custom canopies](https://westshade.com/custom-canopy-tent/), [Vispronet](https://www.vispronet.com/custom-canopy-tents), [Extreme Canopy](https://extremecanopy.com/products/8-x-8-custom-canopy-tent) | Sell custom-printed canopies retail. No reseller terms on the pages reviewed. | Ask each for trade pricing and blind shipping. Useful for comparing quotes. |

**Questions to ask every printer:** trade discount; blind shipping and
packing slip; proof turnaround; production time by size; frame options
(steel or aluminum, leg profile); what's included (bag, weights, stakes);
file specs (vector or PDF, bleed); remake policy for print defects.

## 2. Private-label camping tents (your brand, factory-made)

These aren't true dropshipping. A factory won't make one tent at a time.
Published guidance from [Feistel Outdoor](https://www.feisteloutdoor.com/blog/oem-vs-odm-for-camping-gear-which-sourcing-model-is-right-for-your-outdoor-brand_b674):

- **ODM** (a factory's existing design with your logo and packaging): about
  100–500 pieces per design. Samples take 2–4 weeks, and a production order
  about 2 months.
- **OEM** (your own design): 1,000–3,000 pieces, tooling of $2,000–$20,000+,
  and up to about $50,000 before the first unit ships.

How the site handles it:

- **Bulk and team orders** come in through the custom-tent request form. You
  quote them once the factory quotes you.
- **Pre-orders:** list a private-label tent as **Made to order** with a lead
  time. The listing shows "Ships in about N weeks." A paid order sends a PO
  to the factory or your freight forwarder. Only do this once a production
  run is booked.

Sources to vet: factories listed on [Alibaba](https://www.alibaba.com/price-comparison/custom-printed-tents)
and [Made-in-China](https://www.made-in-china.com/products-search/hot-china-products/Custom_Tent.html).
Before ordering, ask for a paid sample, a factory audit or trade assurance,
and the fabric, coating and flammability-test documents (CPAI-84 for
tents sold in some US states).

## 3. Custom-cut tent poles (built by you in Denver)

Your barrels of DAC and Easton poles are the edge here. Customers enter
their measurements and pay at checkout. The job shows up in **Admin →
Custom jobs** as a build ticket. No supplier is involved, so it ships with
your normal label flow.

When you run low on parts:

| Source | What they publicly say |
|---|---|
| [Tent Pole Technologies, parts](https://www.tentpoletech.com/a3/) | Easton 7075-T9 aluminum, fiberglass and carbon sections, shock cord, repair sleeves. DAC, hubs and clips by inquiry. Has a B2B bulk sales page. |
| [Easton tent tubing sets (Wilderness Innovation)](https://wildernessinnovation.com/shelter/poncho-accessories-kits/easton-tent-tubing-sets/) | Easton tubing sets for DIY poles. |
| [DutchWare DIY pole hardware](https://dutchwaregear.com/product-category/myg/diy-hardware/poles/) | DIY pole parts and hardware. |

Set your own build prices in **Admin → Custom jobs → Pricing** before
going live. The defaults are a starting point, not market research.

## 4. Generic dropship catalog (optional)

[CJdropshipping](https://cjdropshipping.com/), [Spocket](https://www.spocket.co/)
and similar catalogs carry camping tents and accessories, mostly made
overseas with longer shipping times. They don't fit a site built on new-with-tags
North Face and factory poles, so they're left out. If you add one, create
it as a supplier and list its items as **Dropship**. The PO flow works the
same way.
