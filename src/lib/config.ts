// Central site configuration. Business identity, categories, conditions,
// shipping presets and policies all live here so the storefront, AI prompts,
// marketplace adapters and support assistant stay consistent.

export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Basecamp Surplus",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://basecampsurplus.com").replace(/\/$/, ""),
  polesDomain: process.env.POLES_DOMAIN ?? "replacementtentpole.com",
  polesName: process.env.NEXT_PUBLIC_POLES_NAME ?? "Replacement Tent Pole",
  tagline: "New-with-tags outdoor gear, below retail. Shipped from Denver.",
  description:
    "Shop new-with-tags tents, jackets and replacement tent poles from The North Face, Montec, Dope, Fjällräven and more, plus quality pre-owned Patagonia. Below retail, shipped fast from Denver, Colorado.",
  city: "Denver",
  region: "CO",
  country: "US",
  supportEmail: process.env.SUPPORT_EMAIL ?? "support@basecampsurplus.com",
  ownerEmail: process.env.OWNER_EMAIL ?? "",
  shipFrom: {
    name: process.env.SHIP_FROM_NAME ?? "Basecamp Surplus",
    street1: process.env.SHIP_FROM_STREET1 ?? "",
    street2: process.env.SHIP_FROM_STREET2 ?? "",
    city: process.env.SHIP_FROM_CITY ?? "Denver",
    state: process.env.SHIP_FROM_STATE ?? "CO",
    zip: process.env.SHIP_FROM_ZIP ?? "",
    country: "US",
    phone: process.env.SHIP_FROM_PHONE ?? "",
    email: process.env.SHIP_FROM_EMAIL ?? "",
  },
} as const;

export const categories = [
  {
    slug: "tents",
    name: "Tents",
    heading: "Backpacking & camping tents",
    blurb:
      "Two-person backpacking shelters to four-season basecamp domes. Every tent is new with tags unless the listing says otherwise.",
    googleCategory: "Sporting Goods > Outdoor Recreation > Camping & Hiking > Tents",
    googleCategoryId: "1013",
    packagePreset: "tent-box",
  },
  {
    slug: "jackets",
    name: "Jackets & coats",
    heading: "Insulated jackets, shells & snow coats",
    blurb:
      "Down parkas, rain shells and snowboard jackets from The North Face, Montec, Dope and Fjällräven, plus inspected pre-owned Patagonia.",
    googleCategory: "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets",
    googleCategoryId: "5598",
    packagePreset: "coat-mailer",
  },
  {
    slug: "poles",
    name: "Tent poles",
    heading: "Replacement tent poles",
    blurb:
      "Factory replacement poles matched to the tents they fit. Search your tent model to find the right one.",
    googleCategory: "Sporting Goods > Outdoor Recreation > Camping & Hiking > Tent Accessories",
    googleCategoryId: "499680",
    packagePreset: "pole-tube",
  },
  {
    slug: "parts",
    name: "Tent parts",
    heading: "Replacement rainflies, footprints & stakes",
    blurb:
      "Factory rainflies, footprints, stakes and other spare parts, matched to the tents they fit. Search your tent model to find them.",
    googleCategory: "Sporting Goods > Outdoor Recreation > Camping & Hiking > Tent Accessories",
    googleCategoryId: "499680",
    packagePreset: "medium-box",
  },
  {
    slug: "pants",
    name: "Snow pants & bibs",
    heading: "Snow pants & bibs",
    blurb: "Waterproof snow pants and bibs for riding and backcountry days.",
    googleCategory: "Apparel & Accessories > Clothing > Outerwear > Snow Pants & Suits",
    googleCategoryId: "5909",
    packagePreset: "coat-mailer",
  },
  {
    slug: "packs",
    name: "Packs & bags",
    heading: "Backpacks, duffels & bags",
    blurb: "Daypacks, duffels and travel bags.",
    googleCategory: "Luggage & Bags > Backpacks",
    googleCategoryId: "100",
    packagePreset: "medium-box",
  },
  {
    slug: "gear",
    name: "Camp gear",
    heading: "Camp gear & accessories",
    blurb: "Sleeping gear, cook kit and the rest of the camp setup.",
    googleCategory: "Sporting Goods > Outdoor Recreation > Camping & Hiking",
    googleCategoryId: "1011",
    packagePreset: "medium-box",
  },
] as const;

export type CategorySlug = (typeof categories)[number]["slug"];
export const categorySlugs = categories.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];
export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);

/** Categories whose items fit specific tents (shown in the finder by tent model). */
export const fitmentCategories = ["poles", "parts"];

export const brands = [
  { slug: "the-north-face", name: "The North Face" },
  { slug: "easton", name: "Easton" },
  { slug: "dac", name: "DAC" },
  { slug: "patagonia", name: "Patagonia" },
  { slug: "montec", name: "Montec" },
  { slug: "dope", name: "Dope" },
  { slug: "fjallraven", name: "Fjällräven" },
] as const;

export const brandSlug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Condition grades. Each maps to marketplace-specific values in the adapters.
export const conditions = [
  {
    value: "new_with_tags",
    label: "New with tags",
    short: "NWT",
    google: "new",
    detail: "Unworn, unused, original tags attached.",
  },
  {
    value: "new_without_tags",
    label: "New without tags",
    short: "NWOT",
    google: "new",
    detail: "Unworn and unused. Tags removed or missing.",
  },
  {
    value: "used_excellent",
    label: "Used, excellent",
    short: "Used, excellent",
    google: "used",
    detail: "Lightly used with no visible flaws.",
  },
  {
    value: "used_good",
    label: "Used, good",
    short: "Used, good",
    google: "used",
    detail: "Used with minor signs of wear, fully functional. Any flaws are photographed.",
  },
  {
    value: "used_fair",
    label: "Used, fair",
    short: "Used, fair",
    google: "used",
    detail: "Noticeable wear or flaws, described and photographed. Fully functional.",
  },
] as const;

export type ConditionValue = (typeof conditions)[number]["value"];
export const conditionValues = conditions.map((c) => c.value) as [ConditionValue, ...ConditionValue[]];
export const getCondition = (v: string) => conditions.find((c) => c.value === v) ?? conditions[0];
export const isNewCondition = (v: string) => v === "new_with_tags" || v === "new_without_tags";

// Default condition per brand for the AI intake. Patagonia stock is pre-owned.
export const brandDefaultCondition: Record<string, ConditionValue> = {
  patagonia: "used_good",
};

// Package presets used for label rates. Dimensions in inches, weights in ounces (packaging only).
export const packagePresets = [
  { id: "coat-mailer", name: "Coat poly mailer", length: 16, width: 12, height: 4, packagingOz: 2 },
  { id: "tent-box", name: "Tent box", length: 24, width: 10, height: 10, packagingOz: 18 },
  { id: "pole-tube", name: "Pole tube", length: 26, width: 4, height: 4, packagingOz: 8 },
  { id: "medium-box", name: "Medium box", length: 18, width: 14, height: 8, packagingOz: 14 },
  { id: "large-box", name: "Large box", length: 24, width: 18, height: 12, packagingOz: 26 },
] as const;
export type PackagePresetId = (typeof packagePresets)[number]["id"];
export const getPackagePreset = (id: string) => packagePresets.find((p) => p.id === id) ?? packagePresets[3];

// Checkout shipping charged to the customer (cents). Labels are bought at cost via Shippo.
export const shippingPolicy = {
  freeThresholdCents: Number(process.env.FREE_SHIPPING_THRESHOLD_CENTS ?? 15000),
  standardCents: { light: 899, bulky: 1499 },
  expeditedCents: { light: 2499, bulky: 3999 },
  handlingDays: "1–2 business days",
  standardTransit: "3–6 business days",
  expeditedTransit: "1–3 business days",
  bulkyCategories: ["tents", "packs", "gear"] as string[],
};

export const policies = {
  shipping: `Orders ship from Denver, Colorado within ${shippingPolicy.handlingDays}. Standard shipping takes ${shippingPolicy.standardTransit}; expedited takes ${shippingPolicy.expeditedTransit}. Orders over $${(shippingPolicy.freeThresholdCents / 100).toFixed(0)} ship free (standard). Every order gets a tracking number by email when the label is created. We ship to US addresses only.`,
  returns:
    "Returns are accepted within 30 days of delivery for a refund to the original payment method. New-with-tags items must be unworn with all tags attached. Pre-owned items can be returned if they don't match the listing description or photos. Return shipping is free if we made a mistake (wrong item, undisclosed flaw); otherwise the return label cost is deducted from the refund. Start a return through the support chat or by email.",
  authenticity:
    "Everything we sell is authentic, sourced from retail surplus and overstock. New items arrive with original tags. Pre-owned items are inspected and any flaws are described and photographed.",
  sizing:
    "Each listing shows the size printed on the garment's tag. Brand sizing varies: Montec and Dope snow jackets run roomy for layering; The North Face and Patagonia fit true to their size charts.",
  payment:
    "Checkout is handled by Stripe and accepts all major cards, Apple Pay and Google Pay. We never see or store your card number.",
};
