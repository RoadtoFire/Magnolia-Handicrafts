import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getProducts, getPrimaryImage, getGalleryImages } from "@/lib/api";
import AddToCartButton from "@/components/AddToCartButton";
import ProductGallery from "@/components/ProductGallery";

// Pre-render known product pages at build time (ISR beyond that via the
// `revalidate: 60` on the fetch in lib/api.js — new products that appear
// after build will still be served, just generated on first request).
export async function generateStaticParams() {
  try {
    const data = await getProducts();
    const products = Array.isArray(data) ? data : data?.results ?? [];
    return products.map((product) => ({ id: String(product.id) }));
  } catch (err) {
    console.error("generateStaticParams: failed to load products:", err);
    return [];
  }
}

async function loadProduct(id) {
  try {
    return await getProduct(id);
  } catch (err) {
    console.error(`Failed to load product ${id}:`, err);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await loadProduct(id);

  if (!product) {
    return { title: "Product not found" };
  }

  const description =
    (product.short_description || product.description || "").slice(0, 160) || undefined;
  const image = getPrimaryImage(product);

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: image ? [{ url: image }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  const product = await loadProduct(id);

  if (!product) notFound();

  const imageUrl = getPrimaryImage(product);
  const galleryImages = getGalleryImages(product);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: imageUrl || undefined,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "PKR",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link href="/" className="text-xs uppercase tracking-widest text-stone-500 mb-8 inline-block">
        &larr; Back
      </Link>

      {/* Image column gets ~65% of the width on desktop (vs. an even 50/50
          split before) - the product photo should dominate the page. */}
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-12">
        <ProductGallery images={galleryImages} productName={product.name} />
        <div className="flex flex-col justify-center">
          <h1 className="text-3xl font-serif text-stone-900 mb-2">{product.name}</h1>
          <p className="text-2xl font-medium text-stone-800 mb-8">
            PKR {Number(product.price).toLocaleString()}
          </p>

          {product.description && (
            <p className="whitespace-pre-line text-stone-600 leading-relaxed mb-8">
              {product.description}
            </p>
          )}

          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}
