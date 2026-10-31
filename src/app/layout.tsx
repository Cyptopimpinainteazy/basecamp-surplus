import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/big-shoulders-display/700";
import "@fontsource/big-shoulders-display/800";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}: New-with-tags tents, jackets & tent poles below retail`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: "website", siteName: site.name, locale: "en_US", url: site.url },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, "max-image-preview": "large" },
  verification: {
    // Google Search Console (HTML tag method) and Meta Commerce domain verification.
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.FACEBOOK_DOMAIN_VERIFICATION
      ? { "facebook-domain-verification": process.env.FACEBOOK_DOMAIN_VERIFICATION }
      : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#1f3a32",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Cookieless page-view analytics; enable Web Analytics on the Vercel project. */}
        <Analytics />
      </body>
    </html>
  );
}
