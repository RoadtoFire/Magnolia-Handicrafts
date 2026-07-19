"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getProducts, updateProduct, deleteProduct, getPrimaryImage } from "@/lib/api";
import Toast from "@/components/admin/Toast";

export default function AdminProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState(null); // product currently being deleted

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      // Public endpoint, but sent with credentials for consistency with the
      // rest of the admin section (harmless either way).
      const data = await getProducts({ credentials: "include", cache: "no-store" });
      setProducts(Array.isArray(data) ? data : data?.results ?? []);
    } catch (err) {
      console.error("Failed to load products:", err);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts(); // eslint-disable-line react-hooks/set-state-in-effect -- initial data load, not a state sync
  }, [loadProducts]);

  // Read a one-time success flag from the URL (set by the new/edit pages on
  // redirect) without pulling in useSearchParams + a Suspense boundary for
  // what's just a "show a toast once" concern.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("created") === "1") {
      setToast("Product created!"); // eslint-disable-line react-hooks/set-state-in-effect -- one-time toast from a URL flag, not a render loop
      router.replace("/admin/products");
    } else if (params.get("updated") === "1") {
      setToast("Product updated!");
      router.replace("/admin/products");
    }
  }, [router]);

  const handleToggleStock = async (product) => {
    const nextValue = !product.is_in_stock;

    // Optimistic update, with rollback on failure.
    setProducts((current) =>
      current.map((p) => (p.id === product.id ? { ...p, is_in_stock: nextValue } : p))
    );

    try {
      await updateProduct(product.id, { is_in_stock: nextValue });
    } catch (err) {
      console.error("Failed to update stock status:", err);
      setProducts((current) =>
        current.map((p) =>
          p.id === product.id ? { ...p, is_in_stock: product.is_in_stock } : p
        )
      );
      setToast("Could not update — please try again.");
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

    setBusyId(product.id);
    try {
      await deleteProduct(product.id);
      setProducts((current) => current.filter((p) => p.id !== product.id));
      setToast("Product deleted.");
    } catch (err) {
      console.error("Failed to delete product:", err);
      setToast("Could not delete — please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-serif text-stone-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="bg-stone-900 text-white px-5 py-3 text-xs uppercase tracking-widest hover:bg-stone-700 transition-colors"
        >
          + Add New Product
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-stone-400">Loading products…</p>
      ) : loadError ? (
        <p className="text-sm text-red-600">
          Could not load products. Please refresh the page.
        </p>
      ) : products.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-12 text-center">
          <p className="text-stone-500 mb-4">No products yet — add your first one.</p>
          <Link
            href="/admin/products/new"
            className="text-sm underline text-stone-900 hover:text-stone-600"
          >
            Add a product
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-widest text-stone-500">
              <tr>
                <th className="text-left px-4 py-3">Photo</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">In Stock</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const imageUrl = getPrimaryImage(product);
                return (
                  <tr key={product.id} className="border-t border-stone-100">
                    <td className="px-4 py-3">
                      <div className="relative w-14 h-14 bg-stone-100 rounded-sm overflow-hidden">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={product.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] text-stone-300 uppercase text-center leading-tight px-1">
                            No Photo
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-900">{product.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      PKR {Number(product.price).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStock(product)}
                          aria-pressed={product.is_in_stock}
                          aria-label={
                            product.is_in_stock
                              ? "Mark as out of stock"
                              : "Mark as in stock"
                          }
                          className={`relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full transition-colors ${
                            product.is_in_stock ? "bg-green-600" : "bg-stone-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                              product.is_in_stock ? "translate-x-8" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="text-xs text-stone-500 whitespace-nowrap">
                          {product.is_in_stock ? "Available" : "Out of stock"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="text-xs uppercase tracking-widest text-stone-600 hover:text-stone-900 underline mr-4"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={busyId === product.id}
                        onClick={() => handleDelete(product)}
                        className="text-xs uppercase tracking-widest text-red-600 hover:text-red-800 underline disabled:opacity-50"
                      >
                        {busyId === product.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}
