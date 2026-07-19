import Hero from "@/components/Hero";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/api";

export default async function HomePage() {
  let products = [];
  let loadError = false;

  try {
    const data = await getProducts();
    products = Array.isArray(data) ? data : data?.results ?? [];
  } catch (err) {
    // Backend may be down/mid-migration — fail gracefully instead of
    // crashing the page (no unhandled exception / 500).
    console.error("Failed to load products:", err);
    loadError = true;
  }

  return (
    <>
      <Hero />

      <section id="collection" className="w-full max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8 border-b border-stone-200 pb-4">
          <h2 className="text-xl font-serif text-stone-800">Latest Collection</h2>
          <span className="text-xs text-stone-500 uppercase tracking-widest">
            {products.length} Items
          </span>
        </div>

        {loadError ? (
          <div className="w-full flex justify-center py-20">
            <p className="text-xs uppercase tracking-widest text-stone-400">
              Unable to load the collection right now. Please try again shortly.
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="w-full flex justify-center py-20">
            <p className="text-xs uppercase tracking-widest text-stone-400">
              No products yet — check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
