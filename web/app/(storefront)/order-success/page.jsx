import Link from "next/link";

export const metadata = {
  title: "Order Confirmed",
  robots: { index: false }, // transient, per-order page — keep it out of search results
};

// Server component: reads `orderId` straight from the `searchParams` prop
// (Next.js App Router has no React Router `location.state` equivalent, so
// the id is passed as a query param instead: /order-success?orderId=...).
// Kept as a plain server component rather than a client `useSearchParams`
// hook since all it needs is to read one query param and render static
// markup — no interactivity, no need for a Suspense boundary.
//
// `orderId` is display-only here (nothing is fetched with it), so it's
// fine that its shape now varies by checkout path: the COD flow (this
// page's direct route target) passes the order's `public_id` (a UUID) —
// preferring that over the old numeric `id` since public_id is the
// non-enumerable reference the backend intends to be shared externally.
// The gateway flow (/checkout/result) redirects here too once payment is
// confirmed 'paid', passing the same public_id it polled on.
export default async function OrderSuccessPage({ searchParams }) {
  const params = await searchParams;
  const orderId = params?.orderId || "Confirmed";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>

      <h1 className="text-3xl font-serif text-stone-900 mb-2">Thank You!</h1>
      <p className="text-stone-500 mb-8">
        Your order <span className="font-bold text-stone-800">#{orderId}</span> has been placed successfully.
      </p>

      <div className="bg-stone-50 p-6 rounded-sm mb-8 max-w-md w-full border border-stone-200">
        <p className="text-sm text-stone-600 mb-2">We will verify your order via phone call shortly.</p>
        <p className="text-xs text-stone-400">Please check your email for the invoice.</p>
      </div>

      <Link
        href="/"
        className="bg-stone-900 text-white px-8 py-3 text-xs uppercase tracking-widest hover:bg-stone-700 transition-colors"
      >
        Continue Shopping
      </Link>
    </div>
  );
}
