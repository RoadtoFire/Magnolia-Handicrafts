"use client";

import { useCart } from "@/app/providers";
import { getPrimaryImage } from "@/lib/api";

// Small client island: the product detail page itself stays a server
// component (so metadata/JSON-LD render on the server), but "add to cart"
// needs the cart context, which requires client-side state.
export default function AddToCartButton({ product }) {
  const { addToCart } = useCart();

  const handleClick = () => {
    // Normalize whichever image shape the API gave us (legacy `image` field
    // vs. the new nested `images` array) into a single absolute `image` URL
    // on the cart line item, so CartDrawer doesn't need to know about either
    // shape.
    addToCart({ ...product, image: getPrimaryImage(product) });
  };

  return (
    <button
      onClick={handleClick}
      className="w-full md:w-auto bg-stone-900 text-white px-12 py-4 text-xs uppercase tracking-[0.2em] hover:bg-stone-700 transition-colors"
    >
      Add to Cart
    </button>
  );
}
