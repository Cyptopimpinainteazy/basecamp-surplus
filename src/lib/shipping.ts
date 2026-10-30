import "server-only";
import { getPackagePreset, site } from "./config";
import type { Address } from "./db/schema";

// Shippo label purchasing: rates for a parcel, buy the chosen rate, return label + tracking.
const SHIPPO = "https://api.goshippo.com";

export function shippoConfigured() {
  return Boolean(process.env.SHIPPO_API_TOKEN);
}

async function shippo<T>(path: string, body?: unknown): Promise<T> {
  const token = process.env.SHIPPO_API_TOKEN;
  if (!token) throw new Error("SHIPPO_API_TOKEN is not set. Add it to buy shipping labels.");
  const res = await fetch(`${SHIPPO}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `ShippoToken ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Shippo: ${JSON.stringify(json.detail ?? json)}`);
  return json as T;
}

export type Rate = {
  object_id: string;
  provider: string;
  servicelevel: { name: string; token: string };
  amount: string;
  currency: string;
  estimated_days: number | null;
  duration_terms?: string;
};

export async function getRates(to: Address, presetId: string, itemWeightOz: number) {
  const preset = getPackagePreset(presetId);
  const from = site.shipFrom;
  if (!from.street1 || !from.zip) throw new Error("Set SHIP_FROM_STREET1 and SHIP_FROM_ZIP to buy labels.");
  const shipment = await shippo<{ object_id: string; rates: Rate[]; messages: { text: string }[] }>("/shipments/", {
    address_from: {
      name: from.name,
      street1: from.street1,
      street2: from.street2,
      city: from.city,
      state: from.state,
      zip: from.zip,
      country: "US",
      phone: from.phone,
      email: from.email,
    },
    address_to: {
      name: to.name,
      street1: to.line1,
      street2: to.line2 ?? "",
      city: to.city,
      state: to.state,
      zip: to.postalCode,
      country: to.country,
      phone: to.phone ?? "",
    },
    parcels: [
      {
        length: String(preset.length),
        width: String(preset.width),
        height: String(preset.height),
        distance_unit: "in",
        weight: String(Math.max(1, itemWeightOz + preset.packagingOz)),
        mass_unit: "oz",
      },
    ],
    async: false,
  });
  const rates = [...shipment.rates].sort((a, b) => Number(a.amount) - Number(b.amount));
  return { shipmentId: shipment.object_id, rates, messages: shipment.messages.map((m) => m.text) };
}

export async function buyLabel(rateId: string) {
  const tx = await shippo<{
    object_id: string;
    status: string;
    label_url: string;
    tracking_number: string;
    tracking_url_provider: string;
    messages: { text: string }[];
    rate: string;
  }>("/transactions/", { rate: rateId, label_file_type: process.env.LABEL_FORMAT ?? "PDF_4x6", async: false });
  if (tx.status !== "SUCCESS") {
    throw new Error(`Label purchase failed: ${tx.messages.map((m) => m.text).join("; ") || tx.status}`);
  }
  return tx;
}

export async function getRate(rateId: string) {
  return shippo<Rate>(`/rates/${rateId}`);
}
