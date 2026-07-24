import Link from "next/link";
import Image from "next/image";
import { getPrimaryImage } from "@/lib/api";

// Server component: no cart interactivity here (that lives on the detail
// page's AddToCartButton), so this can render on the server with next/image.
export default function ProductCard({ product }) {
  const imageUrl = getPrimaryImage(product);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col bg-white border border-stone-200 rounded-sm overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      <div className="relative aspect-square w-full bg-stone-100 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-300">
            <span className="text-[10px] uppercase tracking-widest">No Image</span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 text-center">
        <h3 className="text-sm font-serif text-stone-900 line-clamp-1">
          {product.name}
        </h3>

        <p className="mt-1 text-xs text-stone-500 line-clamp-1 min-h-[1.25em]">
          {product.short_description || "Luxury lawn collection."}
        </p>

        <div className="mt-4 pt-3 border-t border-stone-100 w-full">
          <span className="text-sm font-bold text-stone-800">
            PKR {Number(product.price).toLocaleString()}
          </span>
        </div>

        <div className="mt-3 w-full bg-stone-800 text-white text-[10px] uppercase tracking-widest py-2 group-hover:bg-stone-600 transition-colors">
          View Details
        </div>
      </div>
    </Link>
  );
}
