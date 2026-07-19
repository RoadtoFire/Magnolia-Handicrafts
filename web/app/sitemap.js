import { getProducts } from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function sitemap() {
  let products = [];
  try {
    const data = await getProducts();
    products = Array.isArray(data) ? data : data?.results ?? [];
  } catch (err) {
    console.error("sitemap: failed to load products:", err);
  }

  const staticRoutes = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const productRoutes = products.map((product) => ({
    url: `${SITE_URL}/products/${product.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
