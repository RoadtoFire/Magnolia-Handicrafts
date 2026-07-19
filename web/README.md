# Magnolia by Rahat Jamal — Storefront + Admin (`web/`)

Next.js 16 (App Router, JavaScript, Tailwind v4) app. This is the customer
facing storefront (server-rendered/ISR product pages, sitemap, JSON-LD) and
the `/admin` dashboard the store owner uses to manage products and view
orders. It talks to the Django REST API in `../backend/`.

> **Note:** this Next.js version is newer than most training data — see
> `AGENTS.md` before making code changes and check `node_modules/next/dist/docs/`
> for anything that looks unfamiliar.

## Local development

```bash
npm install
cp .env.local.example .env.local   # then edit if your backend runs elsewhere
npm run dev
```

The site runs at `http://localhost:3000`. It expects the Django API from
`../backend/` to be running too (default `http://localhost:8000` — see
`backend/README.md`).

`.env.local.example` documents two variables:

- `NEXT_PUBLIC_API_URL` — base URL of the Django backend.
- `NEXT_PUBLIC_SITE_URL` — this app's own public URL, used by
  `app/sitemap.js`, `app/robots.js`, and `app/layout.jsx`'s `metadataBase`
  to build absolute URLs.

**Keep `NEXT_PUBLIC_API_URL` on `localhost`, not `127.0.0.1`, in local dev.**
The admin login cookies are set `SameSite=Lax` by the backend, and browsers
treat `localhost` and `127.0.0.1` as different sites. If this app runs on
`http://localhost:3000` but `NEXT_PUBLIC_API_URL` points at
`http://127.0.0.1:8000`, admin login will *appear* to work (the login
request succeeds and the cookie gets set) but every subsequent admin API
call will silently 401, because the browser won't attach the cookie to a
cross-site request. See the comments in `lib/api.js` and
`.env.local.example` for the full explanation — the same class of bug can
recur in production if the frontend and backend don't share a domain (see
below).

## Build

```bash
npm run build
npm run start   # serves the production build on :3000
```

`npm run build` should show the product list/detail pages as
static/ISR-rendered (look for `●`/`ISR` in the build output) — that's what
makes them SEO-friendly.

## The admin dashboard

Located at `/admin/login`. It requires a Django user with `is_staff=True` to
exist — see **"Creating an admin/superuser account"** in
[`../backend/README.md`](../backend/README.md). There is no self-service
signup; accounts are created on the backend by a developer.

Once signed in you get:

- **Products** (`/admin/products`) — table of all products with a photo,
  price, an in-stock toggle, and Edit/Delete actions.
- **Add New Product** / **Edit** — shared form: name, description, price,
  an in-stock checkbox, and a photo manager (add several photos at once,
  remove one, reorder with Up/Down).
- **Orders** (`/admin/orders`) — list of orders with payment status.

For a plain-language, no-jargon walkthrough of adding/editing products (the
version meant for the store owner, not a developer), see
[`docs/adding-a-product.md`](docs/adding-a-product.md).

## Production deployment

**Recommended: Vercel.** This is a standard Next.js App Router project, so
Vercel auto-detects the build — no extra config file is needed (there's
nothing project-specific to put in a `vercel.json` right now: no custom
redirects/headers are in use). That said, nothing here is Vercel-specific:
`npm run build && npm run start` works on any Node host (a VPS, Render,
Railway, etc) too.

Set these environment variables on whatever host you use:

| Variable | Production value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your deployed backend's URL, e.g. `https://api.magnoliabyrahatjamal.com` |
| `NEXT_PUBLIC_SITE_URL` | This site's own URL, e.g. `https://www.magnoliabyrahatjamal.com` |

### Cookie/domain requirement (important — read before deploying)

The admin dashboard's login uses httpOnly cookies set by the backend. For
those cookies to actually reach the backend on later requests, **the
frontend and backend must be served from the same registrable parent
domain** — subdomains of one domain, not two unrelated domains. For example:

- Frontend: `https://www.magnoliabyrahatjamal.com`
- Backend: `https://api.magnoliabyrahatjamal.com`
- Both under the parent domain `magnoliabyrahatjamal.com`
- Backend env var `AUTH_COOKIE_DOMAIN=.magnoliabyrahatjamal.com` (leading dot)

If you skip this — e.g. frontend on Vercel's `*.vercel.app` domain while the
backend is on a completely unrelated domain, with no shared parent — admin
login will **appear to succeed** (you'll see a success response and get
redirected past the login page) but **every admin API call afterward will
401**, because the browser has nowhere valid to attach the cookie. This is
the exact same underlying cookie/site rule as the `localhost` vs
`127.0.0.1` issue above, just at the production-domain layer instead of the
local-dev layer. Get the domains and `AUTH_COOKIE_DOMAIN` right before
telling the store owner it's ready to use.

### `next.config.mjs` note: `images.dangerouslyAllowLocalIP`

This is set to `true` to let `next/image` optimize the Django dev server's
locally-served media files (`http://localhost:8000/media/...` or
`http://127.0.0.1:8000/media/...`) — Next.js 16 added a default that
otherwise refuses to optimize images resolving to a private/loopback IP.
This is safe in production: it's still gated by the `remotePatterns`
allowlist right below it, which only permits `res.cloudinary.com` (the real
CDN production images are served from) plus those two specific local dev
host:port combinations — production traffic never hits a local IP, so the
flag has no effect there. It would only become a real concern if
`remotePatterns` were later changed to include a wildcard or an internal
network host for production use, which it currently is not.
