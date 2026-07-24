# Magnolia by Rahat Jamal

An ecommerce store for Magnolia by Rahat Jamal — handcrafted custom paint
designs, silk-painted dresses, and cushions made in Pakistan. This repo
contains the store's backend API and its customer-facing website + admin
dashboard.

## Architecture

Two services deployed independently:

- **`backend/`** — Django 6 + Django REST Framework API. Owns the product
  catalog, orders, admin authentication, and payment processing (Safepay for
  cards, Easypaisa for mobile wallet, plus cash-on-delivery). See
  [`backend/README.md`](backend/README.md).
- **`web/`** — Next.js 16 (App Router) storefront and admin dashboard.
  Server-rendered/ISR product pages for SEO, a checkout flow, and an
  `/admin` section a non-technical store owner can use to manage products
  and view orders. See [`web/README.md`](web/README.md).

```
Magnolia-Handicrafts/
├── backend/     Django + DRF API (products, orders, auth, payments)
└── web/         Next.js storefront + admin dashboard
```

## Local development

You'll run both services at once, in two terminals.

**1. Backend (Django API), from the repo root:**

```bash
cd backend
python3 -m venv venv          # first time only
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then edit .env with real local values if needed
python manage.py migrate
python manage.py createsuperuser   # first time only, to get an admin login
python manage.py runserver
```

The API now runs at `http://localhost:8000`. See
[`backend/README.md`](backend/README.md) for the full env var reference and
how superuser accounts work.

**2. Frontend (Next.js storefront + admin), in a second terminal from the
repo root:**

```bash
cd web
npm install
cp .env.local.example .env.local
npm run dev
```

The site now runs at `http://localhost:3000`. The admin dashboard is at
`http://localhost:3000/admin/login` — sign in with the Django superuser
account you just created. See [`web/README.md`](web/README.md) for details,
and [`web/docs/adding-a-product.md`](web/docs/adding-a-product.md) for a
plain-language guide to adding products day-to-day.

Both services need to be running simultaneously for the storefront and
admin dashboard to work — the frontend talks to the backend over HTTP using
`NEXT_PUBLIC_API_URL` (see `web/.env.local.example`).

## Deploying

See the "Production deployment" sections in
[`backend/README.md`](backend/README.md) and
[`web/README.md`](web/README.md) for env vars, hosting notes, and the
pre-launch checklist (Postgres, Cloudinary, payment gateway webhooks, and
the cookie/domain setup the admin login depends on).

## Payments

Checkout supports cash-on-delivery today, with Safepay (cards) and
Easypaisa (mobile wallet) integrations scaffolded in `backend/payments/`.
Both gateway integrations were written without live merchant sandbox access
and are marked with `*** VERIFY BEFORE GOING LIVE ***` docstrings in
`backend/payments/gateways/safepay.py` and `easypaisa.py` — read those before
processing real payments through either gateway.
