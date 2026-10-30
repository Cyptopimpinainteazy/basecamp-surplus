import { site } from "@/lib/config";
import { ebayConfigured, ebayConnected } from "@/lib/channels/ebay";
import { shippoConfigured } from "@/lib/shipping";

export const dynamic = "force-dynamic";
export const metadata = { title: "Channels" };

function Row({ ok, name, children }: { ok: boolean; name: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-tag)] bg-snow p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="display text-3xl">{name}</h2>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${ok ? "bg-lichen/70 text-spruce" : "bg-blaze/15 text-blaze-deep"}`}>{ok ? "Ready" : "Needs setup"}</span>
      </div>
      <div className="mt-2 space-y-2 text-[0.95rem]">{children}</div>
    </section>
  );
}

export default async function ChannelsPage({ searchParams }: { searchParams: Promise<{ ebay?: string; msg?: string }> }) {
  const sp = await searchParams;
  const ebayKeys = ebayConfigured();
  const ebayOn = ebayKeys && (await ebayConnected());
  const feed = `${site.url}/feeds/products.xml`;
  const env = (k: string) => Boolean(process.env[k]);

  return (
    <div className="space-y-5">
      <h1 className="display text-6xl">Channels</h1>
      {sp.ebay === "connected" && <p className="rounded-md bg-lichen/60 p-3">eBay connected.</p>}
      {sp.ebay === "error" && <p className="rounded-md bg-blaze/15 p-3">eBay connection failed: {sp.msg}</p>}
      {sp.ebay === "denied" && <p className="rounded-md bg-blaze/15 p-3">eBay connection was cancelled or expired. Try again.</p>}
      {sp.ebay === "missing-keys" && <p className="rounded-md bg-blaze/15 p-3">Add EBAY_CLIENT_ID, EBAY_CLIENT_SECRET and EBAY_RU_NAME first.</p>}

      <Row ok={ebayOn && env("EBAY_FULFILLMENT_POLICY_ID")} name="eBay">
        <p>One-click listing, live price comps at intake, automatic quantity sync, and eBay orders pulled into your shipping queue every 15 minutes.</p>
        {!ebayKeys ? (
          <p className="text-granite">Create a production keyset at developer.ebay.com, then set EBAY_CLIENT_ID, EBAY_CLIENT_SECRET and EBAY_RU_NAME. On the RuName, set the accepted URL to <code>{site.url}/api/ebay/callback</code>.</p>
        ) : ebayOn ? (
          <p className="text-spruce">Account connected. <a href="/api/ebay/connect" className="underline">Reconnect</a></p>
        ) : (
          <a href="/api/ebay/connect" className="btn btn-blaze">Connect eBay account</a>
        )}
        {!env("EBAY_FULFILLMENT_POLICY_ID") && <p className="text-granite">Also set EBAY_FULFILLMENT_POLICY_ID, EBAY_PAYMENT_POLICY_ID and EBAY_RETURN_POLICY_ID from Seller Hub → Business policies.</p>}
      </Row>

      <Row ok name="Google Shopping (free listings)">
        <p>In Google Merchant Center, add a product source → scheduled fetch → this URL, daily:</p>
        <code className="block break-all rounded bg-glacier p-2">{feed}</code>
        <p className="text-granite">Verify and claim {new URL(site.url).hostname} in Merchant Center first. Items show up in Google Shopping and image search with your price.</p>
      </Row>

      <Row ok name="Facebook, Instagram & Marketplace">
        <p>Meta Commerce Manager → Catalog → Data sources → Data feed → scheduled feed with the same URL. Then turn on your Shop for the Facebook Page and Instagram.</p>
        <p className="text-granite">Marketplace placement for business catalogs depends on Meta approving your shop. Individual Marketplace posts can&apos;t be automated. Use the copy pack on each product if you want to post some by hand.</p>
      </Row>

      <Row ok name="Pinterest">
        <p>Pinterest Business → Catalogs → add data source with the same feed URL. Each item becomes a shoppable pin.</p>
      </Row>

      <Row ok name="Poshmark, Mercari, Depop, Geartrade">
        <p>None of these offer a listing API, and Poshmark bans automation. Each product has a copy pack with titles, descriptions and prices adjusted for that marketplace&apos;s fees. When something sells, it shows up on the Today screen to remove there.</p>
        <p>Using a crosslister (Vendoo, List Perfectly, Crosslist)? Import this CSV: <a href="/api/admin/export" className="font-semibold underline">download crosslister CSV</a></p>
      </Row>

      <Row ok={shippoConfigured() && env("SHIP_FROM_STREET1")} name="Shipping labels (Shippo)">
        <p>Buy discounted USPS, UPS and FedEx labels on each order, print 4×6, and the customer gets tracking by email automatically. eBay orders get tracking uploaded to eBay.</p>
        {!shippoConfigured() && <p className="text-granite">Set SHIPPO_API_TOKEN and the SHIP_FROM_* address variables.</p>}
      </Row>

      <Row ok={env("RESEND_API_KEY")} name="Email">
        <p>Order confirmations, tracking emails, support replies and owner alerts are sent with Resend.</p>
        {!env("RESEND_API_KEY") && <p className="text-granite">Set RESEND_API_KEY and verify your domain in Resend.</p>}
      </Row>

      <Row ok={env("ANTHROPIC_API_KEY")} name="AI listings & support">
        <p>Photo-to-listing intake and the customer Help chat run on Claude.</p>
        {!env("ANTHROPIC_API_KEY") && <p className="text-granite">Set ANTHROPIC_API_KEY.</p>}
      </Row>
    </div>
  );
}
