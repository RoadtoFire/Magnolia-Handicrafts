import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Magnolia by Rahat Jamal | Handcrafted Goods",
    template: "%s | Magnolia by Rahat Jamal",
  },
  description:
    "Handcrafted custom paint designs, silk painted dresses, and cushions by Magnolia by Rahat Jamal — Pakistani handicrafts, made to order.",
  openGraph: {
    title: "Magnolia by Rahat Jamal | Handcrafted Goods",
    description:
      "Handcrafted custom paint designs, silk painted dresses, and cushions by Magnolia by Rahat Jamal.",
    siteName: "Magnolia by Rahat Jamal",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#1c1917",
  width: "device-width",
  initialScale: 1,
};

// True app root: just the <html>/<body> shell and site-wide metadata.
// Storefront chrome (Header/Footer/CartDrawer/CartProvider) lives in
// app/(storefront)/layout.jsx and admin's own nav lives in
// app/admin/layout.jsx — each route group renders its own shell inside
// this one, so `/admin/*` never gets the storefront's cart UI.
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-stone-50 font-sans relative antialiased">
        {children}
      </body>
    </html>
  );
}
