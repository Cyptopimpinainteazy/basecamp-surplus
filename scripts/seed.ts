// Development preview data: lets you see the storefront before real photos are
// listed. Every seeded item uses a DEMO- SKU. Run: npm run db:seed
// Remove with: npm run db:seed -- --clear
import { like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { products, type NewProduct } from "../src/lib/db/schema";

if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
  console.error("Refusing to seed demo data into production.");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client);

const img = (name: string, alt: string) => [{ url: `/seed/${name}.svg`, alt }];
const now = Date.now();
let n = 0;
const item = (p: Omit<NewProduct, "sku" | "slug" | "status" | "publishedAt"> & { key: string }): NewProduct => {
  const { key, ...rest } = p;
  n++;
  return {
    ...rest,
    sku: `DEMO-${key.toUpperCase()}`,
    slug: `demo-${key}`,
    status: "active",
    publishedAt: new Date(now - n * 3600_000),
  };
};

const rows: NewProduct[] = [
  item({
    key: "nuptse-96-black-m",
    title: "The North Face 1996 Retro Nuptse Jacket Men's M TNF Black NWT",
    brand: "The North Face", brandSlug: "the-north-face", model: "1996 Retro Nuptse", category: "jackets",
    productType: "Down jacket", gender: "mens", size: "M", color: "TNF Black", material: "Recycled nylon ripstop, 700-fill down",
    condition: "new_with_tags", description: "The boxy, oversized 1996 Retro Nuptse in TNF Black, new with original tags.\n\nBaffled 700-fill goose down keeps it warm for Colorado winters without bulk, and the hood stows in the collar. Ripstop shell sheds light snow and wind.",
    highlights: ["700-fill goose down", "Stowable hood in collar", "Packs into its own pocket", "Original tags attached"],
    specs: [{ label: "Fill", value: "700-fill RDS down" }, { label: "Shell", value: "Recycled nylon ripstop" }, { label: "Fit", value: "Relaxed" }],
    seoTitle: "The North Face 1996 Retro Nuptse Men's M Black NWT", seoDescription: "New with tags The North Face 1996 Retro Nuptse in TNF Black, men's medium. 700-fill down. Below retail, ships from Denver.",
    keywords: ["north face nuptse 1996", "nuptse jacket mens medium", "tnf black nuptse"], hashtags: ["northface", "nuptse"],
    images: img("nuptse-black", "Black 1996 Retro Nuptse jacket, front"), priceCents: 21900, msrpCents: 33000, quantity: 3, weightOz: 26, packagePreset: "coat-mailer", featured: true,
  }),
  item({
    key: "nuptse-96-blue-l",
    title: "The North Face 1996 Retro Nuptse Jacket Men's L Hero Blue NWT",
    brand: "The North Face", brandSlug: "the-north-face", model: "1996 Retro Nuptse", category: "jackets", productType: "Down jacket", gender: "mens", size: "L", color: "Hero Blue",
    condition: "new_with_tags", description: "Classic 1996 Retro Nuptse in Hero Blue with black yokes. New with tags.\n\n700-fill down, stowable hood and a shiny ripstop finish.",
    seoTitle: "North Face Retro Nuptse Men's L Hero Blue NWT", seoDescription: "New with tags The North Face 1996 Retro Nuptse, Hero Blue, men's large. Ships from Denver below retail.",
    images: img("nuptse-blue", "Blue 1996 Retro Nuptse jacket, front"), priceCents: 21900, msrpCents: 33000, quantity: 2, weightOz: 27, packagePreset: "coat-mailer",
  }),
  item({
    key: "tnf-mcmurdo-parka-xl",
    title: "The North Face McMurdo Down Parka Men's XL Asphalt Grey NWT",
    brand: "The North Face", brandSlug: "the-north-face", model: "McMurdo Parka", category: "jackets", productType: "Down parka", gender: "mens", size: "XL", color: "Asphalt Grey",
    condition: "new_with_tags", description: "Long, waterproof McMurdo down parka built for real cold. New with tags.\n\nDryVent shell, 600-fill down and a removable faux-fur hood ruff.",
    seoTitle: "North Face McMurdo Parka Men's XL NWT", seoDescription: "New with tags The North Face McMurdo down parka, men's XL. Waterproof, 600-fill. Below retail, ships from Denver.",
    images: img("tnf-parka", "Grey McMurdo parka, front"), priceCents: 25900, msrpCents: 40000, quantity: 1, weightOz: 48, packagePreset: "medium-box",
  }),
  item({
    key: "montec-dune-snow-jacket-m",
    title: "Montec Dune Snowboard Jacket Men's M Sand NWT",
    brand: "Montec", brandSlug: "montec", model: "Dune", category: "jackets", productType: "Snow jacket", gender: "mens", size: "M", color: "Sand",
    condition: "new_with_tags", description: "Montec Dune shell in a roomy snowboard cut. New with tags.\n\n20K waterproof, fully taped seams, pit zips and a powder skirt.",
    seoTitle: "Montec Dune Snowboard Jacket Men's M NWT", seoDescription: "New with tags Montec Dune snowboard jacket, men's medium, 20K waterproof. Below retail, ships from Denver.",
    images: img("montec-dune", "Sand Montec Dune snow jacket"), priceCents: 13900, msrpCents: 21000, quantity: 4, weightOz: 30, packagePreset: "coat-mailer",
  }),
  item({
    key: "dope-adept-l",
    title: "Dope Adept Snow Jacket Men's L Olive Green NWT",
    brand: "Dope", brandSlug: "dope", model: "Adept", category: "jackets", productType: "Snow jacket", gender: "mens", size: "L", color: "Olive Green",
    condition: "new_with_tags", description: "Dope Adept snow jacket in olive. New with tags.\n\nWaterproof shell with taped seams and a helmet-compatible hood.",
    seoTitle: "Dope Adept Snow Jacket Men's L Olive NWT", seoDescription: "New with tags Dope Adept snow jacket, men's large, olive green. Below retail, ships from Denver.",
    images: img("dope-adept", "Olive Dope Adept snow jacket"), priceCents: 11900, msrpCents: 17900, quantity: 5, weightOz: 28, packagePreset: "coat-mailer",
  }),
  item({
    key: "fjallraven-greenland-s",
    title: "Fjällräven Greenland Jacket Women's S Green NWT",
    brand: "Fjällräven", brandSlug: "fjallraven", model: "Greenland Jacket", category: "jackets", productType: "Field jacket", gender: "womens", size: "S", color: "Green",
    condition: "new_with_tags", description: "The Greenland Jacket in G-1000 Original. New with tags.\n\nWax it with Greenland Wax for more weather resistance.",
    seoTitle: "Fjällräven Greenland Jacket Women's S NWT", seoDescription: "New with tags Fjällräven Greenland Jacket, women's small, G-1000. Below retail, ships from Denver.",
    images: img("fjallraven-greenland", "Green Fjällräven Greenland jacket"), priceCents: 16900, msrpCents: 260_00, quantity: 1, weightOz: 22, packagePreset: "coat-mailer",
  }),
  item({
    key: "patagonia-nano-puff-m",
    title: "Patagonia Nano Puff Jacket Men's M Red Used Good",
    brand: "Patagonia", brandSlug: "patagonia", model: "Nano Puff", category: "jackets", productType: "Insulated jacket", gender: "mens", size: "M", color: "Red",
    condition: "used_good", conditionNotes: "Light pilling at the cuffs and a faint mark on the left hem, shown in photos. Zippers and insulation are perfect.",
    description: "Pre-owned Patagonia Nano Puff in red, inspected and graded good.\n\nPrimaLoft insulation stays warm when damp, and it packs into its own chest pocket.",
    seoTitle: "Patagonia Nano Puff Men's M Red, Pre-owned", seoDescription: "Pre-owned Patagonia Nano Puff jacket, men's medium, red. Inspected and graded good. Ships from Denver.",
    images: img("pata-nano", "Red Patagonia Nano Puff jacket"), priceCents: 8900, msrpCents: 23900, quantity: 1, weightOz: 13, packagePreset: "coat-mailer",
  }),
  item({
    key: "patagonia-down-sweater-l",
    title: "Patagonia Down Sweater Jacket Men's L Navy Used Excellent",
    brand: "Patagonia", brandSlug: "patagonia", model: "Down Sweater", category: "jackets", productType: "Down jacket", gender: "mens", size: "L", color: "Navy",
    condition: "used_excellent", conditionNotes: "Worn a handful of times. No visible flaws.",
    description: "Pre-owned Patagonia Down Sweater in navy, graded excellent.\n\n800-fill responsibly sourced down.",
    seoTitle: "Patagonia Down Sweater Men's L Navy, Pre-owned", seoDescription: "Pre-owned Patagonia Down Sweater, men's large, navy, graded excellent. Ships from Denver.",
    images: img("pata-down", "Navy Patagonia Down Sweater"), priceCents: 12900, msrpCents: 27900, quantity: 1, weightOz: 14, packagePreset: "coat-mailer",
  }),
  item({
    key: "tnf-stormbreak-2",
    title: "The North Face Stormbreak 2 Backpacking Tent 2-Person NWT",
    brand: "The North Face", brandSlug: "the-north-face", model: "Stormbreak 2", category: "tents", productType: "Backpacking tent",
    condition: "new_with_tags", description: "Two-person, three-season Stormbreak 2. New in the bag with tags.\n\nTwo doors, two vestibules and a simple two-pole setup. A strong first backpacking tent.",
    highlights: ["Two doors and vestibules", "Color-coded poles", "Full-coverage fly"],
    specs: [{ label: "Sleeps", value: "2" }, { label: "Packed weight", value: "5 lb 12 oz" }, { label: "Floor area", value: "31.3 sq ft" }],
    seoTitle: "The North Face Stormbreak 2 Tent NWT", seoDescription: "New The North Face Stormbreak 2 two-person backpacking tent. Below retail, ships from Denver.",
    images: img("stormbreak-2", "Orange Stormbreak 2 tent pitched"), priceCents: 11900, msrpCents: 17900, quantity: 6, weightOz: 92, packagePreset: "tent-box", featured: true,
  }),
  item({
    key: "tnf-wawona-6",
    title: "The North Face Wawona 6 Camping Tent 6-Person NWT",
    brand: "The North Face", brandSlug: "the-north-face", model: "Wawona 6", category: "tents", productType: "Camping tent",
    condition: "new_with_tags", description: "The Wawona 6 car-camping tent with its huge front vestibule. New with tags.\n\nTall enough to stand up in.",
    specs: [{ label: "Sleeps", value: "6" }, { label: "Peak height", value: "6 ft 6 in" }],
    seoTitle: "The North Face Wawona 6 Tent NWT", seoDescription: "New The North Face Wawona 6 person camping tent with large vestibule. Below retail, ships from Denver.",
    images: img("wawona-6", "Green Wawona 6 tent"), priceCents: 34900, msrpCents: 50000, quantity: 2, weightOz: 320, packagePreset: "large-box",
  }),
  item({
    key: "tnf-wawona-4",
    title: "The North Face Wawona 4 Camping Tent 4-Person NWT",
    brand: "The North Face", brandSlug: "the-north-face", model: "Wawona 4", category: "tents", productType: "Camping tent",
    condition: "new_with_tags", description: "The Wawona 4 car-camping tent with a 75-inch peak and a 27.6 sq ft front vestibule. New with tags.",
    specs: [{ label: "Sleeps", value: "4" }, { label: "Peak height", value: "75 in" }, { label: "Floor area", value: "58.1 sq ft" }],
    seoTitle: "The North Face Wawona 4 Tent NWT", seoDescription: "New The North Face Wawona 4 person camping tent. Below retail, ships from Denver.",
    images: img("wawona-6", "Green Wawona 4 tent"), priceCents: 32900, msrpCents: 48500, quantity: 3, weightOz: 208, packagePreset: "large-box",
  }),
  item({
    key: "tnf-assault-2",
    title: "The North Face Assault 2 Futurelight 4-Season Tent NWT",
    brand: "The North Face", brandSlug: "the-north-face", model: "Assault 2 Futurelight", category: "tents", productType: "Mountaineering tent",
    condition: "new_with_tags", description: "Single-wall, four-season Assault 2 in Futurelight fabric. New with tags.",
    seoTitle: "The North Face Assault 2 Futurelight Tent NWT", seoDescription: "New The North Face Assault 2 Futurelight 4-season tent. Below retail, ships from Denver.",
    images: img("assault", "Yellow Assault 2 tent"), priceCents: 52900, msrpCents: 79900, quantity: 1, weightOz: 70, packagePreset: "tent-box",
  }),
  item({
    key: "pole-stormbreak-2-main",
    title: "Replacement Main Pole for The North Face Stormbreak 2 Tent",
    brand: "The North Face", brandSlug: "the-north-face", model: "Stormbreak 2 main pole", category: "poles", productType: "Tent pole",
    condition: "new_without_tags", description: "Factory replacement main hub pole for the Stormbreak 2. New, never used.",
    fitment: ["The North Face Stormbreak 2"], poleSpec: { sections: 9, material: "Aluminum", role: "main hub pole" },
    seoTitle: "Replacement Pole: The North Face Stormbreak 2", seoDescription: "Factory replacement main pole for The North Face Stormbreak 2 tent. New. Ships from Denver.",
    images: img("pole-gray", "Gray aluminum tent pole with label"), priceCents: 3900, msrpCents: null, quantity: 40, weightOz: 14, packagePreset: "pole-tube",
  }),
  item({
    key: "pole-stormbreak-3-fly",
    title: "Replacement Fly Pole for The North Face Stormbreak 3 Tent",
    brand: "The North Face", brandSlug: "the-north-face", model: "Stormbreak 3 fly pole", category: "poles", productType: "Tent pole",
    condition: "new_without_tags", description: "Factory replacement brow/fly pole for the Stormbreak 3. New, never used.",
    fitment: ["The North Face Stormbreak 3"], poleSpec: { sections: 3, material: "Aluminum", role: "fly pole" },
    seoTitle: "Replacement Pole: The North Face Stormbreak 3", seoDescription: "Factory replacement fly pole for The North Face Stormbreak 3 tent. New. Ships from Denver.",
    images: img("pole-blue", "Blue tent pole with label"), priceCents: 2400, quantity: 25, weightOz: 5, packagePreset: "pole-tube",
  }),
  item({
    key: "pole-wawona-6-hub",
    title: "Replacement Hub Pole Set for The North Face Wawona 6 Tent",
    brand: "The North Face", brandSlug: "the-north-face", model: "Wawona 6 hub pole", category: "poles", productType: "Tent pole",
    condition: "new_without_tags", description: "Factory replacement hub pole set for the Wawona 6. New, never used.",
    fitment: ["The North Face Wawona 6"], poleSpec: { sections: 12, material: "Aluminum", role: "hub pole" },
    seoTitle: "Replacement Pole: The North Face Wawona 6", seoDescription: "Factory replacement hub pole for The North Face Wawona 6 tent. New. Ships from Denver.",
    images: img("pole-green", "Green tent pole set with label"), priceCents: 5900, quantity: 18, weightOz: 30, packagePreset: "pole-tube",
  }),
];

async function main() {
  await db.delete(products).where(like(products.sku, "DEMO-%"));
  if (process.argv.includes("--clear")) {
    console.log("Removed demo products.");
  } else {
    await db.insert(products).values(rows);
    console.log(`Seeded ${rows.length} demo products.`);
  }
  await client.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
