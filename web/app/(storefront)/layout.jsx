import { CartProvider } from "@/app/providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

// Route-group layout for the public storefront (`(storefront)` doesn't add a
// URL segment). Splitting this out from the root layout lets `/admin/*`
// render its own minimal shell (see app/admin/layout.jsx) instead of being
// wrapped in the storefront's Header/Footer/CartDrawer chrome, without
// moving any of the actual page files' URLs.
export default function StorefrontLayout({ children }) {
  return (
    <CartProvider>
      <Header />
      <div className="flex-1 flex flex-col">{children}</div>
      <Footer />
      <CartDrawer />
    </CartProvider>
  );
}
