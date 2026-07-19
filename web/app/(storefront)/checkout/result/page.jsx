"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/app/providers";
import { getPaymentStatus } from "@/lib/api";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

// This is where Safepay/Easypaisa's hosted checkout redirects the browser
// back to (backend/payments/gateways/{safepay,easypaisa}.py build
// redirect_url as `{FRONTEND_URL}/checkout/result?order={public_id}`). The
// redirect itself proves nothing — only polling GET /api/payments/status/
// (backed by a verified webhook server-side) is authoritative, so this page
// exists purely to poll until that settles one way or the other.
function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();

  const orderPublicId = searchParams.get("order");

  // 'checking' | 'pending' | 'paid' | 'failed' | 'timeout' | 'invalid'
  const [state, setState] = useState(orderPublicId ? "checking" : "invalid");
  const clearedRef = useRef(false); // guard against clearing the cart twice

  useEffect(() => {
    // The missing-param case is already covered by the initial state above
    // (computed once from the same `orderPublicId` at mount) — nothing to
    // poll for, so just bail without touching state synchronously here.
    if (!orderPublicId) return;

    let cancelled = false;
    let timer = null;
    const startedAt = Date.now();

    async function poll() {
      let result;
      try {
        result = await getPaymentStatus(orderPublicId);
      } catch (err) {
        console.error("Failed to fetch payment status:", err);
        if (!cancelled) setState("invalid");
        return;
      }
      if (cancelled) return;

      if (result.payment_status === "paid") {
        // Only clear the cart on confirmed success, never before — see
        // the checkout page's initiatePayment comment for why.
        if (!clearedRef.current) {
          clearedRef.current = true;
          clearCart();
        }
        setState("paid");
        // Reuse the existing order-success page rather than duplicating
        // its success UI here. `orderId` now carries the public_id (a
        // UUID) rather than the old numeric id — order-success just
        // displays whatever it's given, so no change needed there.
        router.replace(`/order-success?orderId=${orderPublicId}`);
        return;
      }

      if (result.payment_status === "failed") {
        setState("failed");
        return;
      }

      // Still 'unpaid'/'pending' — keep polling until the timeout.
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setState("timeout");
        return;
      }
      setState("pending");
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderPublicId, clearCart, router]);

  if (state === "invalid") {
    return (
      <StatusShell>
        <p className="text-stone-600 mb-8">
          We couldn&apos;t find a payment to check on. If you just completed a
          payment, please check your email for confirmation, or contact us if
          you&apos;re unsure.
        </p>
        <HomeLink />
      </StatusShell>
    );
  }

  if (state === "failed") {
    return (
      <StatusShell tone="failed">
        <h1 className="text-3xl font-serif text-stone-900 mb-2">Payment Failed</h1>
        <p className="text-stone-600 mb-8">
          Your payment didn&apos;t go through. Your cart is still here — you
          can try again or choose Cash on Delivery instead.
        </p>
        <Link
          href="/checkout"
          className="bg-stone-900 text-white px-8 py-3 text-xs uppercase tracking-widest hover:bg-stone-700 transition-colors"
        >
          Try Again
        </Link>
      </StatusShell>
    );
  }

  if (state === "timeout") {
    return (
      <StatusShell>
        <h1 className="text-3xl font-serif text-stone-900 mb-2">Still Processing</h1>
        <p className="text-stone-600 mb-8">
          This is taking longer than expected. We&apos;ll email you a
          confirmation shortly once it&apos;s done — no need to keep this page
          open, and please don&apos;t place a second order.
        </p>
        <HomeLink />
      </StatusShell>
    );
  }

  // 'checking' or 'pending' (and the brief instant before router.replace on 'paid')
  return (
    <StatusShell>
      <Spinner />
      <h1 className="text-3xl font-serif text-stone-900 mt-6 mb-2">
        Confirming Your Payment...
      </h1>
      <p className="text-stone-500">
        Please don&apos;t close this page. This usually only takes a few
        seconds.
      </p>
    </StatusShell>
  );
}

function StatusShell({ children }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {children}
    </div>
  );
}

function HomeLink() {
  return (
    <Link
      href="/"
      className="bg-stone-900 text-white px-8 py-3 text-xs uppercase tracking-widest hover:bg-stone-700 transition-colors"
    >
      Back to Home
    </Link>
  );
}

function Spinner() {
  return (
    <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense
      fallback={
        <StatusShell>
          <Spinner />
        </StatusShell>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
