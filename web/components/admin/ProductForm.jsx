"use client";

import { useState } from "react";
import Image from "next/image";
import {
  createProduct,
  updateProduct,
  uploadProductImages,
  updateProductImage,
  deleteProductImage,
  resolveImageUrl,
} from "@/lib/api";
import Toast from "@/components/admin/Toast";

function sortByOrder(images) {
  return [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/**
 * Shared create/edit form for products, used by both
 * app/admin/products/new/page.jsx and app/admin/products/[id]/edit/page.jsx.
 *
 * mode="create": text fields + is_in_stock are POSTed together on submit,
 * then any selected photos are uploaded to the newly-created product id
 * (the image upload endpoint requires a product id that only exists after
 * creation, so photos picked here just sit as local previews until submit).
 *
 * mode="edit": text fields are PATCHed on submit. Photos are handled
 * entirely separately from that submit — existing photos are deleted /
 * reordered inline (each action hits the API immediately), and newly
 * selected photos upload immediately on selection (the product id is
 * already known, so there's no reason to wait for "Save Changes").
 */
export default function ProductForm({ mode, product, onSaved }) {
  const isEdit = mode === "edit";

  const [name, setName] = useState(product?.name ?? "");
  const [shortDescription, setShortDescription] = useState(product?.short_description ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [isInStock, setIsInStock] = useState(product?.is_in_stock ?? true);

  const [existingImages, setExistingImages] = useState(
    product?.images ? sortByOrder(product.images) : []
  );
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingPreviews, setPendingPreviews] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageActionId, setImageActionId] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-picking the same file later
    if (files.length === 0) return;

    if (!isEdit) {
      setPendingFiles((current) => [...current, ...files]);
      setPendingPreviews((current) => [
        ...current,
        ...files.map((file) => URL.createObjectURL(file)),
      ]);
      return;
    }

    setIsUploadingImages(true);
    try {
      const uploaded = await uploadProductImages(product.id, files);
      setExistingImages((current) => sortByOrder([...current, ...(uploaded || [])]));
      setToast("Photos added!");
    } catch (err) {
      console.error("Failed to upload photos:", err);
      setToast("Could not upload photos — please try again.");
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removePendingFile = (index) => {
    setPendingFiles((current) => current.filter((_, i) => i !== index));
    setPendingPreviews((current) => {
      URL.revokeObjectURL(current[index]);
      return current.filter((_, i) => i !== index);
    });
  };

  const handleDeleteExisting = async (image) => {
    if (!window.confirm("Remove this photo?")) return;
    setImageActionId(image.id);
    try {
      await deleteProductImage(image.id);
      setExistingImages((current) => current.filter((img) => img.id !== image.id));
      setToast("Photo removed.");
    } catch (err) {
      console.error("Failed to delete photo:", err);
      setToast("Could not remove photo — please try again.");
    } finally {
      setImageActionId(null);
    }
  };

  const moveImage = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= existingImages.length) return;

    const original = existingImages;
    const reordered = [...existingImages];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setExistingImages(reordered);
    setImageActionId(reordered[index].id);

    try {
      // Re-stamp sort_order from each image's new array position, rather
      // than just swapping the two old values — robust even if the backend
      // hadn't assigned distinct sort_order values to begin with.
      await Promise.all([
        updateProductImage(reordered[index].id, { sort_order: index }),
        updateProductImage(reordered[targetIndex].id, { sort_order: targetIndex }),
      ]);
    } catch (err) {
      console.error("Failed to reorder photos:", err);
      setExistingImages(original);
      setToast("Could not reorder — please try again.");
    } finally {
      setImageActionId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setError("");
    setIsSaving(true);

    const payload = {
      name: name.trim(),
      short_description: shortDescription.trim(),
      description: description.trim(),
      price,
      is_in_stock: isInStock,
    };

    try {
      let productId = product?.id;
      if (isEdit) {
        await updateProduct(productId, payload);
      } else {
        const created = await createProduct(payload);
        productId = created.id;
      }

      if (pendingFiles.length > 0) {
        setIsUploadingImages(true);
        await uploadProductImages(productId, pendingFiles);
      }

      onSaved(productId);
    } catch (err) {
      console.error("Failed to save product:", err);
      setError(err.message || "Something went wrong saving this product.");
    } finally {
      setIsSaving(false);
      setIsUploadingImages(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-white border border-stone-200 rounded-sm p-6 space-y-5">
        <div>
          <label htmlFor="name" className="block text-xs uppercase tracking-widest text-stone-500 mb-2">
            Product Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900"
            placeholder="e.g. Hand-Painted Silk Cushion"
          />
        </div>

        <div>
          <label htmlFor="short_description" className="block text-xs uppercase tracking-widest text-stone-500 mb-2">
            Short Description
          </label>
          <p className="text-xs text-stone-400 mb-2">
            One short line, shown on the homepage under the product photo.
          </p>
          <input
            id="short_description"
            type="text"
            maxLength={160}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900"
            placeholder="e.g. Hand-embroidered silk cushion cover"
          />
          <p className="text-xs text-stone-400 mt-1 text-right">
            {shortDescription.length}/160
          </p>
        </div>

        <div>
          <label htmlFor="description" className="block text-xs uppercase tracking-widest text-stone-500 mb-2">
            Full Description
          </label>
          <p className="text-xs text-stone-400 mb-2">
            As much detail as you like, shown on this product&apos;s own page.
          </p>
          <textarea
            id="description"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900"
            placeholder="What makes this piece special? Materials, care instructions, sizing, story behind it..."
          />
        </div>

        <div>
          <label htmlFor="price" className="block text-xs uppercase tracking-widest text-stone-500 mb-2">
            Price (PKR)
          </label>
          <input
            id="price"
            type="number"
            required
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900"
            placeholder="e.g. 4500"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isInStock}
            onChange={(e) => setIsInStock(e.target.checked)}
            className="w-5 h-5 accent-stone-900"
          />
          <span className="text-sm text-stone-700">
            This item is available for purchase
          </span>
        </label>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-6">
        <h2 className="text-xs uppercase tracking-widest text-stone-500 mb-4">Photos</h2>

        {isEdit && (
          <div className="mb-6">
            {existingImages.length === 0 ? (
              <p className="text-sm text-stone-400 mb-4">No photos yet.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                {existingImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative border border-stone-200 rounded-sm overflow-hidden bg-stone-100 aspect-square"
                  >
                    <Image
                      src={resolveImageUrl(image.image)}
                      alt={image.alt_text || ""}
                      fill
                      sizes="150px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteExisting(image)}
                      disabled={imageActionId === image.id}
                      aria-label="Remove photo"
                      className="absolute top-1 right-1 bg-black/60 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-1 left-1 right-1 flex justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(index, -1)}
                        disabled={index === 0 || imageActionId === image.id}
                        className="flex-1 bg-black/60 text-white text-[10px] py-1 rounded-sm hover:bg-black/80 disabled:opacity-30"
                      >
                        ↑ Up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(index, 1)}
                        disabled={index === existingImages.length - 1 || imageActionId === image.id}
                        className="flex-1 bg-black/60 text-white text-[10px] py-1 rounded-sm hover:bg-black/80 disabled:opacity-30"
                      >
                        ↓ Down
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {pendingPreviews.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs uppercase tracking-widest text-stone-400 mb-3">
              Will be added when you save
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {pendingPreviews.map((src, index) => (
                <div key={src} className="relative border border-stone-200 rounded-sm overflow-hidden bg-stone-100 aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not a next/image-eligible remote asset */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePendingFile(index)}
                    aria-label="Remove"
                    className="absolute top-1 right-1 bg-black/60 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="inline-block cursor-pointer bg-stone-800 text-white text-xs uppercase tracking-widest px-5 py-3 hover:bg-stone-700 transition-colors">
          {isUploadingImages ? "Uploading…" : "Add Photos"}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            disabled={isUploadingImages}
            className="hidden"
          />
        </label>
        {!isEdit && (
          <p className="text-xs text-stone-400 mt-2">
            Photos are uploaded once you save this new product.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-sm px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="bg-stone-900 text-white px-8 py-4 text-xs uppercase tracking-[0.2em] hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving
            ? isUploadingImages
              ? "Uploading Photos…"
              : "Saving…"
            : isEdit
              ? "Save Changes"
              : "Create Product"}
        </button>
      </div>

      <Toast message={toast} onDone={() => setToast("")} />
    </form>
  );
}
