"use client";

import { useState } from "react";
import Image from "next/image";

// Client island: the product detail page itself stays a server component
// (metadata/JSON-LD render on the server), but selecting a thumbnail and the
// hover-zoom effect both need client-side state, same pattern as
// AddToCartButton.
export default function ProductGallery({ images, productName }) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return (
      <div className="bg-stone-100 aspect-[4/5] rounded-sm flex items-center justify-center text-stone-300">
        <span className="text-xs uppercase tracking-widest">No Image</span>
      </div>
    );
  }

  const current = images[selected] ?? images[0];

  return (
    <div>
      {/* Portrait aspect ratio (vs. the previous square crop) so the photo
          reads as much larger now that this column also got more of the
          page's width - the product image should dominate this page. */}
      <div className="group bg-stone-100 aspect-[4/5] relative rounded-sm overflow-hidden">
        <Image
          src={current.url}
          alt={current.alt || productName}
          fill
          sizes="(min-width: 768px) 60vw, 100vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-3">
          {images.map((image, index) => (
            <button
              key={image.url + index}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Show photo ${index + 1} of ${productName}`}
              aria-current={index === selected}
              className={`relative aspect-square rounded-sm overflow-hidden bg-stone-100 transition-opacity ${
                index === selected
                  ? "ring-2 ring-stone-900"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={image.url}
                alt={image.alt || `${productName} thumbnail ${index + 1}`}
                fill
                sizes="20vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
