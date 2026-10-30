import "server-only";
import { getSetting, setSetting } from "../settings";
import { getCategory, isNewCondition, site } from "../config";
import type { Product } from "../db/schema";

// eBay REST APIs: OAuth (app + user tokens), Inventory API for listings,
// Browse API for price comps, Taxonomy API for category suggestions,
// Fulfillment API to pull eBay orders back into our inventory.

const SANDBOX = process.env.EBAY_ENV === "sandbox";
const API = SANDBOX ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
const AUTH = SANDBOX ? "https://auth.sandbox.ebay.com" : "https://auth.ebay.com";
const MARKETPLACE = "EBAY_US";

export const EBAY_SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
];

type UserToken = { accessToken: string; expiresAt: number; refreshToken: string; refreshExpiresAt: number };

export function ebayConfigured() {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET && process.env.EBAY_RU_NAME);
}

function basicAuth() {
  return "Basic " + Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString("base64");
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(`${API}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`eBay auth failed: ${json.error_description ?? json.error ?? res.status}`);
  return json as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
  };
}

let appToken: { token: string; expiresAt: number } | null = null;
async function getAppToken() {
  if (appToken && appToken.expiresAt > Date.now() + 60_000) return appToken.token;
  const t = await tokenRequest({ grant_type: "client_credentials", scope: EBAY_SCOPES[0] });
  appToken = { token: t.access_token, expiresAt: Date.now() + t.expires_in * 1000 };
  return appToken.token;
}

export function ebayConsentUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.EBAY_CLIENT_ID ?? "",
    redirect_uri: process.env.EBAY_RU_NAME ?? "",
    response_type: "code",
    scope: EBAY_SCOPES.join(" "),
    state,
  });
  return `${AUTH}/oauth2/authorize?${params}`;
}

export async function exchangeEbayCode(code: string) {
  const t = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.EBAY_RU_NAME ?? "",
  });
  const token: UserToken = {
    accessToken: t.access_token,
    expiresAt: Date.now() + t.expires_in * 1000,
    refreshToken: t.refresh_token ?? "",
    refreshExpiresAt: Date.now() + (t.refresh_token_expires_in ?? 0) * 1000,
  };
  await setSetting("ebay_user_token", token);
  return token;
}

async function getUserToken() {
  const tok = await getSetting<UserToken>("ebay_user_token");
  if (!tok) throw new Error("eBay account is not connected. Connect it under Admin → Channels.");
  if (tok.expiresAt > Date.now() + 120_000) return tok.accessToken;
  if (tok.refreshExpiresAt < Date.now()) throw new Error("eBay connection expired. Reconnect under Admin → Channels.");
  const t = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: tok.refreshToken,
    scope: EBAY_SCOPES.join(" "),
  });
  const next: UserToken = { ...tok, accessToken: t.access_token, expiresAt: Date.now() + t.expires_in * 1000 };
  await setSetting("ebay_user_token", next);
  return next.accessToken;
}

export async function ebayConnected() {
  const tok = await getSetting<UserToken>("ebay_user_token");
  return Boolean(tok && tok.refreshExpiresAt > Date.now());
}

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown; user?: boolean; headers?: Record<string, string> } = {},
): Promise<T> {
  const token = init.user === false ? await getAppToken() : await getUserToken();
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Language": "en-US",
      "Accept-Language": "en-US",
      "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE,
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const msg =
      json?.errors?.map((e: { message: string; longMessage?: string }) => e.longMessage ?? e.message).join("; ") ??
      `HTTP ${res.status}`;
    throw new Error(`eBay: ${msg}`);
  }
  return json as T;
}

// ---------- Price comps (Browse API, app token) ----------

export async function ebayComps(query: string, isNew: boolean) {
  if (!process.env.EBAY_CLIENT_ID) return null;
  const condition = isNew ? "conditionIds:{1000}" : "conditionIds:{3000|2990|2750}";
  const params = new URLSearchParams({
    q: query,
    limit: "50",
    filter: `${condition},buyingOptions:{FIXED_PRICE},itemLocationCountry:US`,
  });
  type Resp = { itemSummaries?: { title: string; price?: { value: string }; itemWebUrl: string }[] };
  const data = await call<Resp>(`/buy/browse/v1/item_summary/search?${params}`, { user: false });
  const prices = (data.itemSummaries ?? [])
    .map((i) => Number(i.price?.value))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (prices.length < 3) return { count: prices.length, medianCents: null, lowCents: null, highCents: null };
  const pct = (p: number) => prices[Math.min(prices.length - 1, Math.floor(p * prices.length))];
  return {
    count: prices.length,
    medianCents: Math.round(pct(0.5) * 100),
    lowCents: Math.round(pct(0.2) * 100),
    highCents: Math.round(pct(0.8) * 100),
  };
}

// ---------- Category suggestions (Taxonomy API, app token) ----------

export async function suggestEbayCategory(query: string) {
  type Resp = { categorySuggestions?: { category: { categoryId: string; categoryName: string } }[] };
  const data = await call<Resp>(
    `/commerce/taxonomy/v1/category_tree/0/get_category_suggestions?q=${encodeURIComponent(query)}`,
    { user: false },
  );
  return data.categorySuggestions?.[0]?.category ?? null;
}

// ---------- Listings (Inventory API, user token) ----------

const APPAREL = new Set(["jackets", "pants"]);

function ebayCondition(p: Product) {
  // Apparel categories use the "pre-owned" condition family; hard goods use classic used grades.
  const apparel = APPAREL.has(p.category);
  switch (p.condition) {
    case "new_with_tags":
      return "NEW";
    case "new_without_tags":
      return "NEW_OTHER";
    case "used_excellent":
      return apparel ? "PRE_OWNED_EXCELLENT" : "USED_EXCELLENT";
    case "used_good":
      return apparel ? "USED_EXCELLENT" : "USED_GOOD"; // apparel 3000 = "Pre-owned - Good"
    case "used_fair":
      return apparel ? "PRE_OWNED_FAIR" : "USED_ACCEPTABLE";
    default:
      return isNewCondition(p.condition) ? "NEW" : "USED_GOOD";
  }
}

function ebayDescription(p: Product) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paras = p.description.split(/\n{2,}/).map((s) => `<p>${esc(s.trim())}</p>`).join("");
  const highlights = p.highlights.length ? `<ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : "";
  const specs = p.specs.length
    ? `<table>${p.specs.map((s) => `<tr><td><b>${esc(s.label)}</b></td><td>${esc(s.value)}</td></tr>`).join("")}</table>`
    : "";
  const cond = p.conditionNotes ? `<p><b>Condition:</b> ${esc(p.conditionNotes)}</p>` : "";
  const fit = p.fitment.length ? `<p><b>Fits:</b> ${p.fitment.map(esc).join(", ")}</p>` : "";
  return `${paras}${highlights}${cond}${fit}${specs}<p>Ships from Denver, CO within 1–2 business days. SKU ${esc(p.sku)}.</p>`;
}

async function ensureLocation() {
  const key = "denver-main";
  const done = await getSetting<boolean>("ebay_location_ready");
  if (done) return key;
  try {
    await call(`/sell/inventory/v1/location/${key}`);
  } catch {
    await call(`/sell/inventory/v1/location/${key}`, {
      method: "POST",
      body: {
        location: {
          address: {
            city: site.shipFrom.city,
            stateOrProvince: site.shipFrom.state,
            postalCode: site.shipFrom.zip,
            country: "US",
          },
        },
        locationTypes: ["WAREHOUSE"],
        name: site.name,
        merchantLocationStatus: "ENABLED",
      },
    });
  }
  await setSetting("ebay_location_ready", true);
  return key;
}

function policies() {
  const fulfillmentPolicyId = process.env.EBAY_FULFILLMENT_POLICY_ID;
  const paymentPolicyId = process.env.EBAY_PAYMENT_POLICY_ID;
  const returnPolicyId = process.env.EBAY_RETURN_POLICY_ID;
  if (!fulfillmentPolicyId || !paymentPolicyId || !returnPolicyId) {
    throw new Error(
      "Set EBAY_FULFILLMENT_POLICY_ID, EBAY_PAYMENT_POLICY_ID and EBAY_RETURN_POLICY_ID (from eBay Seller Hub → Business policies).",
    );
  }
  return { fulfillmentPolicyId, paymentPolicyId, returnPolicyId };
}

/** eBay prices: site price plus a markup to absorb marketplace fees (default 13%). */
export function ebayPriceCents(p: Product) {
  const markup = Number(process.env.EBAY_PRICE_MARKUP ?? 0.13);
  return Math.round((p.priceCents * (1 + markup)) / 100) * 100 - 1;
}

export async function publishToEbay(p: Product, existingOfferId?: string | null) {
  const merchantLocationKey = await ensureLocation();
  let categoryId = p.ebayCategoryId;
  if (!categoryId) {
    const c = await suggestEbayCategory(`${p.brand} ${p.productType || getCategory(p.category)?.name} ${p.gender}`);
    if (!c) throw new Error("Could not determine an eBay category. Set one on the product.");
    categoryId = c.categoryId;
  }

  const aspects: Record<string, string[]> = { Brand: [p.brand], ...(p.ebayAspects ?? {}) };
  if (p.size && !aspects.Size) aspects.Size = [p.size];
  if (p.color && !aspects.Color) aspects.Color = [p.color];
  if (p.model && !aspects.Model) aspects.Model = [p.model];

  await call(`/sell/inventory/v1/inventory_item/${encodeURIComponent(p.sku)}`, {
    method: "PUT",
    body: {
      availability: { shipToLocationAvailability: { quantity: p.quantity } },
      condition: ebayCondition(p),
      conditionDescription: isNewCondition(p.condition) ? undefined : p.conditionNotes.slice(0, 1000) || undefined,
      product: {
        title: p.title.slice(0, 80),
        description: p.description.slice(0, 4000),
        aspects,
        brand: p.brand,
        mpn: "Does Not Apply",
        imageUrls: p.images.slice(0, 24).map((i) => i.url),
      },
      packageWeightAndSize: p.weightOz ? { weight: { value: p.weightOz, unit: "OUNCE" } } : undefined,
    },
  });

  const offerBody = {
    sku: p.sku,
    marketplaceId: MARKETPLACE,
    format: "FIXED_PRICE",
    availableQuantity: p.quantity,
    categoryId,
    listingDescription: ebayDescription(p),
    listingPolicies: policies(),
    merchantLocationKey,
    pricingSummary: { price: { value: (ebayPriceCents(p) / 100).toFixed(2), currency: "USD" } },
  };

  let offerId = existingOfferId ?? null;
  if (offerId) {
    await call(`/sell/inventory/v1/offer/${offerId}`, { method: "PUT", body: offerBody });
  } else {
    try {
      const created = await call<{ offerId: string }>(`/sell/inventory/v1/offer`, { method: "POST", body: offerBody });
      offerId = created.offerId;
    } catch (e) {
      // Offer may already exist for this SKU from a previous attempt.
      const existing = await call<{ offers?: { offerId: string }[] }>(
        `/sell/inventory/v1/offer?sku=${encodeURIComponent(p.sku)}`,
      );
      offerId = existing.offers?.[0]?.offerId ?? null;
      if (!offerId) throw e;
      await call(`/sell/inventory/v1/offer/${offerId}`, { method: "PUT", body: offerBody });
    }
  }

  const published = await call<{ listingId: string }>(`/sell/inventory/v1/offer/${offerId}/publish`, {
    method: "POST",
  });
  const listingId = published.listingId;
  return {
    offerId: offerId!,
    listingId,
    categoryId,
    url: `${SANDBOX ? "https://sandbox.ebay.com" : "https://www.ebay.com"}/itm/${listingId}`,
  };
}

export async function updateEbayQuantity(sku: string, offerId: string, quantity: number) {
  await call(`/sell/inventory/v1/bulk_update_price_quantity`, {
    method: "POST",
    body: {
      requests: [
        {
          sku,
          shipToLocationAvailability: { quantity },
          offers: [{ offerId, availableQuantity: quantity }],
        },
      ],
    },
  });
}

export async function withdrawEbay(offerId: string) {
  await call(`/sell/inventory/v1/offer/${offerId}/withdraw`, { method: "POST" });
}

// ---------- Orders (Fulfillment API) ----------

export type EbayOrder = {
  orderId: string;
  creationDate: string;
  orderFulfillmentStatus: string;
  buyer?: { username?: string; buyerRegistrationAddress?: { email?: string; fullName?: string } };
  pricingSummary?: { total?: { value: string }; deliveryCost?: { value: string }; priceSubtotal?: { value: string } };
  lineItems: { lineItemId: string; sku?: string; title: string; quantity: number; lineItemCost?: { value: string } }[];
  fulfillmentStartInstructions?: {
    shippingStep?: {
      shipTo?: {
        fullName?: string;
        email?: string;
        primaryPhone?: { phoneNumber?: string };
        contactAddress?: {
          addressLine1?: string;
          addressLine2?: string;
          city?: string;
          stateOrProvince?: string;
          postalCode?: string;
          countryCode?: string;
        };
      };
    };
  }[];
};

export async function fetchEbayOrdersSince(since: Date) {
  const filter = `creationdate:[${since.toISOString()}..]`;
  const orders: EbayOrder[] = [];
  let offset = 0;
  for (let page = 0; page < 10; page++) {
    const data = await call<{ orders?: EbayOrder[]; total?: number }>(
      `/sell/fulfillment/v1/order?filter=${encodeURIComponent(filter)}&limit=50&offset=${offset}`,
    );
    orders.push(...(data.orders ?? []));
    offset += 50;
    if (!data.total || offset >= data.total) break;
  }
  return orders;
}

export async function markEbayShipped(orderId: string, carrier: string, tracking: string) {
  const order = await call<EbayOrder>(`/sell/fulfillment/v1/order/${orderId}`);
  const lineItemIds = order.lineItems.map((l) => l.lineItemId);
  await call(`/sell/fulfillment/v1/order/${orderId}/shipping_fulfillment`, {
    method: "POST",
    body: {
      lineItems: lineItemIds.map((lineItemId) => ({ lineItemId })),
      shippingCarrierCode: carrier.toUpperCase(),
      trackingNumber: tracking,
    },
  });
}
