import { CartProvider } from "@/components/cart";
import { CartDrawer } from "@/components/cart-drawer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SupportChat } from "@/components/support-chat";
import { shippingPolicy, site } from "@/lib/config";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-blaze focus:px-3 focus:py-2">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <CartDrawer freeThresholdCents={shippingPolicy.freeThresholdCents} />
      <SupportChat storeName={site.name} />
    </CartProvider>
  );
}
