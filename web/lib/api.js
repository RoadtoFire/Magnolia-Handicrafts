// Thin fetch helpers for the Django REST backend.
//
// Mirrors the old frontend/src/config.js pattern (API_BASE_URL from a Vite
// env var) but using Next.js's public env var convention instead.
//
// NOTE on the fallback host: this must stay on the same *site* as the
// Next.js app's own origin (localhost) for the admin section's cookie auth
// to work at all. The backend issues its access/refresh cookies with
// SameSite=Lax (see backend/store/auth_views.py) — browsers never attach a
// Lax cookie to a cross-*site* fetch/XHR, and "localhost" vs "127.0.0.1"
// count as different sites even though they resolve to the same machine.
// If this pointed at 127.0.0.1 while the app runs on http://localhost:3000,
// login would appear to succeed (the cookie gets set) but every subsequent
// admin fetch would silently 401 (the cookie never gets sent back). Public,
// unauthenticated reads (getProducts/getProduct/createOrder) don't care
// either way since they don't rely on cookies.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Resolve a possibly-relative media URL returned by the API into an absolute
 * one. The backend is mid-migration to Cloudinary (which returns absolute
 * URLs already); until that lands, or if it's ever bypassed, `image` fields
 * can still show up as a relative `/media/...` path the way the old
 * filesystem-backed storage returned them. Code defensively either way.
 */
export function resolveImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Pick a display image for a product, preferring the new `images` array
 * (nested ProductImage objects: {id, image, alt_text, sort_order}) that the
 * concurrent backend work is adding, falling back to the legacy single
 * `image` field, and gracefully returning null if neither is present.
 */
export function getPrimaryImage(product) {
  if (!product) return null;
  if (Array.isArray(product.images) && product.images.length > 0) {
    const sorted = [...product.images].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
    return resolveImageUrl(sorted[0].image);
  }
  if (product.image) return resolveImageUrl(product.image);
  return null;
}

/**
 * Every image for a product, in display order, for the product detail
 * page's gallery (thumbnail strip + main viewer) — as opposed to
 * getPrimaryImage() above, which only ever needs the first one (card grids,
 * OG/meta tags). Same fallback shape: nested `images[]` preferred, legacy
 * single `image` field as a one-item array, empty array if neither exists.
 */
export function getGalleryImages(product) {
  if (!product) return [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    return [...product.images]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((img) => ({
        url: resolveImageUrl(img.image),
        alt: img.alt_text || product.name,
      }))
      .filter((img) => img.url);
  }
  if (product.image) {
    return [{ url: resolveImageUrl(product.image), alt: product.name }];
  }
  return [];
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    throw new Error(
      `Request to ${path} failed with ${res.status}${detail ? `: ${detail}` : ""}`
    );
  }

  // Some endpoints (e.g. a successful DELETE) may return no body.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** GET /api/products/ — list all products. */
export function getProducts(options = {}) {
  return request("/api/products/", { next: { revalidate: 60 }, ...options });
}

/** GET /api/products/<id>/ — a single product. */
export function getProduct(id, options = {}) {
  return request(`/api/products/${id}/`, { next: { revalidate: 60 }, ...options });
}

/**
 * POST /api/orders/ — place an order. `payload` may include an optional
 * `payment_method` ("cod" | "safepay" | "easypaisa", defaults to "cod" on
 * the backend if omitted). `total_amount` and each item's `price` are
 * read-only server-side (computed from the real Product.price at order
 * time) — the backend silently ignores anything sent for those, so callers
 * don't need to bother sending them, only `product` + `quantity` per item.
 */
export function createOrder(payload) {
  return request("/api/orders/", {
    method: "POST",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

// ---------------------------------------------------------------------------
// Payments API — public/AllowAny, no cookies involved. See backend/payments/.
// ---------------------------------------------------------------------------

/**
 * GET /api/payments/methods/ — public. Returns which payment options are
 * actually usable right now, e.g. {cod: true, safepay: false, easypaisa:
 * false} — a gateway only reports `true` once real merchant credentials are
 * configured server-side. `no-store` since this reflects live config, not
 * something that should ever be cached/stale at checkout time.
 */
export function getPaymentMethods() {
  return request("/api/payments/methods/", { cache: "no-store" });
}

/**
 * POST /api/payments/initiate/ — public. Starts a hosted-checkout session
 * for an already-created order and returns {redirect_url} to send the
 * browser to. Never call this for "cod" — COD orders don't need a payment
 * session. Throws (via `request`) on failure, e.g. order already paid or
 * the gateway being unreachable — callers should catch and show a friendly
 * retry/fallback-to-COD message rather than letting it bubble up raw.
 */
export function initiatePayment({ orderPublicId, method }) {
  return request("/api/payments/initiate/", {
    method: "POST",
    body: JSON.stringify({ order_public_id: orderPublicId, method }),
    cache: "no-store",
  });
}

/**
 * GET /api/payments/status/?order=<public_id> — public. Polled by the
 * /checkout/result page after the gateway redirects the browser back.
 * Returns {payment_status, status}. The redirect itself proves nothing —
 * this endpoint (backed by a verified webhook server-side) is the only
 * authoritative source of payment state.
 */
export function getPaymentStatus(orderPublicId) {
  return request(`/api/payments/status/?order=${encodeURIComponent(orderPublicId)}`, {
    cache: "no-store",
  });
}

// ---------------------------------------------------------------------------
// Admin API — auth + product/order management for the /admin section.
//
// The backend issues httpOnly `access_token`/`refresh_token` cookies on
// login, so every call here needs `credentials: 'include'` (the browser
// won't attach cross-origin cookies otherwise, even same-site in dev). None
// of this touches localStorage/sessionStorage — the cookies themselves are
// httpOnly and inaccessible to JS by design, which is the whole point.
// ---------------------------------------------------------------------------

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Flatten a DRF validation-error body ({field: [msg, ...]}) into one string. */
function describeError(status, data) {
  if (data && typeof data === "object") {
    if (data.detail) return data.detail;
    const messages = Object.values(data).flat().filter(Boolean);
    if (messages.length > 0) return messages.join(" ");
  }
  return `Request failed with status ${status}.`;
}

// Refresh is shared across concurrent 401s so a burst of requests doesn't
// fire a burst of refresh calls — they all await the same in-flight promise.
let refreshInFlight = null;

function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/api/auth/refresh/`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * Fetch wrapper for admin-only endpoints. Sends cookies, and — since the
 * access token cookie is short-lived — transparently attempts one silent
 * refresh-and-retry on a 401 before giving up, so a store owner mid-edit
 * doesn't get bounced just because the access token expired while the
 * (still-valid) refresh token could have renewed it.
 */
async function adminRequest(path, options = {}, _retried = false) {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: isFormData
      ? { ...(options.headers || {}) } // let the browser set the multipart boundary
      : { "Content-Type": "application/json", ...(options.headers || {}) },
  });

  if (res.status === 401 && !_retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return adminRequest(path, options, true);
  }

  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const err = new Error(describeError(res.status, data));
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * POST /api/auth/login/ — separate from adminRequest on purpose: a failed
 * login is an expected outcome (bad credentials or non-staff user), not
 * something to retry via token refresh.
 */
export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/auth/login/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    // Deliberately generic — never reveal whether the username or the
    // password was the wrong part.
    throw new Error("Incorrect username or password.");
  }

  return data;
}

/** POST /api/auth/logout/ — clears both cookies. Best-effort: the caller
 *  redirects to /admin/login regardless of whether this network call
 *  succeeds, since the goal (get the owner signed out) is UX, not security. */
export function logout() {
  return fetch(`${API_URL}/api/auth/logout/`, {
    method: "POST",
    credentials: "include",
  }).catch(() => null);
}

/** GET /api/auth/me/ — returns {username} if signed in, null otherwise. */
export async function getMe() {
  try {
    return await adminRequest("/api/auth/me/");
  } catch {
    return null;
  }
}

/** POST /api/products/ — admin-only. JSON body, no images (see uploadProductImages). */
export function createProduct(payload) {
  return adminRequest("/api/products/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PATCH /api/products/<id>/ — admin-only partial update. */
export function updateProduct(id, payload) {
  return adminRequest(`/api/products/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/products/<id>/ — admin-only. */
export function deleteProduct(id) {
  return adminRequest(`/api/products/${id}/`, { method: "DELETE" });
}

/** POST /api/products/<id>/images/ — admin-only, multipart upload of one or more files. */
export function uploadProductImages(productId, files) {
  const formData = new FormData();
  for (const file of files) formData.append("images", file);
  return adminRequest(`/api/products/${productId}/images/`, {
    method: "POST",
    body: formData,
  });
}

/** PATCH /api/product-images/<id>/ — admin-only, update alt_text/sort_order. */
export function updateProductImage(imageId, payload) {
  return adminRequest(`/api/product-images/${imageId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/product-images/<id>/ — admin-only. */
export function deleteProductImage(imageId) {
  return adminRequest(`/api/product-images/${imageId}/`, { method: "DELETE" });
}

/** GET /api/orders/ — admin-only, list (backend already orders by -created_at). */
export function getOrders() {
  return adminRequest("/api/orders/");
}

/** GET /api/orders/<id>/ — admin-only, single order detail. */
export function getOrder(id) {
  return adminRequest(`/api/orders/${id}/`);
}

/**
 * PATCH /api/orders/<id>/ — admin-only, advance an order through its
 * fulfillment pipeline (or mark it cancelled). Only ever send `status` here
 * - payment_status/total_amount are read-only server-side on purpose.
 */
export function updateOrderStatus(id, status) {
  return adminRequest(`/api/orders/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
