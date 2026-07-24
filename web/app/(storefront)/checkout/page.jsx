"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/providers";
import { createOrder, getPaymentMethods, initiatePayment } from "@/lib/api";

const PAYMENT_METHOD_LABELS = {
  cod: "Cash on Delivery",
  safepay: "Card (Visa/Mastercard)",
  easypaisa: "Easypaisa",
};

// Display order for the selector — COD first as the safe, always-available
// default, then the two gateways.
const PAYMENT_METHOD_ORDER = ["cod", "safepay", "easypaisa"];

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const router = useRouter();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Which payment methods are actually usable right now, reported live by
  // GET /api/payments/methods/ (a gateway only comes back `true` once real
  // merchant credentials exist server-side). Default to COD-only so the
  // page never looks broken/empty before the fetch resolves, and stays
  // usable even if the fetch fails outright.
  const [methods, setMethods] = useState({ cod: true, safepay: false, easypaisa: false });
  const [selectedMethod, setSelectedMethod] = useState("cod");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPaymentMethods();
        if (!cancelled && data) {
          setMethods({
            cod: data.cod !== false,
            safepay: !!data.safepay,
            easypaisa: !!data.easypaisa,
          });
        }
      } catch (err) {
        console.error("Failed to load payment methods:", err);
        // Keep the COD-only default — a failed fetch here shouldn't block checkout.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // extra guard against double-submit (e.g. double-click)
    setIsSubmitting(true);
    setPaymentError("");

    const orderPayload = {
      ...formData,
      payment_method: selectedMethod,
      items: cart.map((item) => ({
        product: item.id,
        quantity: item.quantity,
      })),
    };

    try {
      const order = await createOrder(orderPayload);

      if (selectedMethod === "cod") {
        clearCart();
        router.push(`/order-success?orderId=${order.public_id ?? order.id}`);
        return;
      }

      // Gateway methods (safepay/easypaisa): deliberately do NOT clear the
      // cart here. The cart should only be cleared once payment is actually
      // confirmed (the /checkout/result page's status poll sees 'paid') —
      // clearing it now would mean an abandoned or failed payment leaves
      // the customer with an empty cart and no order to show for it.
      try {
        const result = await initiatePayment({
          orderPublicId: order.public_id,
          method: selectedMethod,
        });
        // Leaving the app for the gateway's hosted checkout — a real
        // cross-origin redirect, not a Next.js route, so this must not go
        // through the router. isSubmitting is intentionally left `true`
        // (button stays disabled) since the page is about to unload.
        window.location.href = result.redirect_url;
      } catch (initiateError) {
        console.error("Payment initiation failed:", initiateError);
        setPaymentError(
          "Payment couldn't be started — try again or choose Cash on Delivery."
        );
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Order failed:", error);
      alert("Something went wrong placing your order. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return <div className="text-center mt-20">Your cart is empty.</div>;
  }

  const availableMethods = PAYMENT_METHOD_ORDER.filter((m) => methods[m]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-serif text-stone-900 mb-8 text-center">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* LEFT: FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Full Name</label>
            <input required name="full_name" onChange={handleChange} className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900" type="text" placeholder="e.g. Rahat Jamal" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Email</label>
            <input required name="email" onChange={handleChange} className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900" type="email" placeholder="e.g. rahat@example.com" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Phone</label>
            <input required name="phone" onChange={handleChange} className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900" type="tel" placeholder="e.g. 0300-1234567" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">City</label>
            <input required name="city" onChange={handleChange} className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900" type="text" placeholder="e.g. Islamabad" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Address</label>
            <textarea required name="address" onChange={handleChange} rows="3" className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900" placeholder="e.g. House 12, Street 4, F-7/2"></textarea>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-3">Payment Method</label>
            <div className="space-y-2">
              {availableMethods.map((m) => (
                <label
                  key={m}
                  className={`flex items-center gap-3 border p-3 text-sm cursor-pointer transition-colors ${
                    selectedMethod === m
                      ? "border-stone-900 bg-stone-50"
                      : "border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={m}
                    checked={selectedMethod === m}
                    onChange={() => {
                      setSelectedMethod(m);
                      setPaymentError("");
                    }}
                    className="accent-stone-900"
                  />
                  {PAYMENT_METHOD_LABELS[m]}
                </label>
              ))}
            </div>
            {paymentError && (
              <p className="mt-3 text-sm text-red-600">{paymentError}</p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-stone-900 text-white py-4 text-xs uppercase tracking-[0.2em] hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? "Please wait..." : "Place Order"}
          </button>
        </form>

        {/* RIGHT: ORDER SUMMARY */}
        <div className="bg-stone-50 p-8 h-fit">
          <h2 className="text-lg font-serif mb-6">Order Summary</h2>
          <div className="space-y-4 mb-6 border-b border-stone-200 pb-6">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.quantity} x {item.name} </span>
                <span> PKR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-lg font-medium">
            <span>Total</span>
            <span>PKR {cartTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
