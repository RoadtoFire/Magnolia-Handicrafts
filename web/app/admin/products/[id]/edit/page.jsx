"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProduct } from "@/lib/api";
import ProductForm from "@/components/admin/ProductForm";

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getProduct(id, { credentials: "include", cache: "no-store" });
        if (!cancelled) setProduct(data);
      } catch (err) {
        console.error(`Failed to load product ${id}:`, err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return <p className="text-sm text-stone-400">Loading product…</p>;
  }

  if (loadError || !product) {
    return (
      <p className="text-sm text-red-600">
        Could not load this product. It may have been deleted.
      </p>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-serif text-stone-900 mb-6">Edit Product</h1>
      <ProductForm
        mode="edit"
        product={product}
        onSaved={() => router.push("/admin/products?updated=1")}
      />
    </div>
  );
}
