"use client";

import { useRouter } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage() {
  const router = useRouter();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-serif text-stone-900 mb-6">Add New Product</h1>
      <ProductForm
        mode="create"
        onSaved={() => router.push("/admin/products?created=1")}
      />
    </div>
  );
}
