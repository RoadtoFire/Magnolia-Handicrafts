# Magnolia by Rahat Jamal — Backend (`backend/`)

Django 6.0.1 + Django REST Framework 3.16.1 API, project package `core`, single app `store`.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in real values, see comments in the file
python manage.py migrate
```

All configuration (secret key, debug flag, allowed hosts, database, CORS,
Cloudinary, cookie domain, etc) is read from environment variables via
`django-environ`. See `.env.example` for the full list and description of
each variable. `.env` itself is gitignored and must never be committed.

## Creating an admin/superuser account

The old `create_superuser.py` script (which hardcoded a superuser named
`admin` with password `admin123`) has been **removed**. It shipped as a
committed file with a plaintext, well-known credential - do not reintroduce
anything like it.

Use one of the following instead:

**Interactive (local dev):**

```bash
python manage.py createsuperuser
```

**Scripted / non-interactive (deploys, CI, one-off provisioning):**

```bash
export DJANGO_SUPERUSER_USERNAME=someadmin
export DJANGO_SUPERUSER_EMAIL=someadmin@example.com
export DJANGO_SUPERUSER_PASSWORD='a-strong-unique-password'
python manage.py createsuperuser --noinput
```

These `DJANGO_SUPERUSER_*` env vars are a built-in Django management command
feature - no custom script is required.

### Security warning: rotate the old credential

The removed script created a superuser `admin` / `admin123`, and both the
script and a previous hardcoded `SECRET_KEY` were committed to this
repository's git history. Anyone with read access to the repo (or its
history) has effectively had these credentials.

**If this project was ever deployed anywhere using that account or that
secret key, treat both as compromised immediately:**

- Log in and change the `admin` account's password, or delete the account
  entirely, right away.
- Rotate `DJANGO_SECRET_KEY` to a freshly generated value in every deployed
  environment (this invalidates existing sessions/signed cookies, which is
  expected and fine).

## Authentication

Admin-only login is available via cookie-based JWT (see `store/auth_views.py`
and `store/authentication.py`):

- `POST /api/auth/login/` - `{ "username": "...", "password": "..." }`. Only
  staff (`is_staff=True`) users can log in; sets httpOnly `access_token`
  (~1 hour) and `refresh_token` (~14 days) cookies. Returns `{"username": ...}`
  in the body - tokens are never exposed in JSON.
- `POST /api/auth/refresh/` - reads the `refresh_token` cookie, issues a new
  `access_token` cookie.
- `POST /api/auth/logout/` - clears both cookies.
- `GET /api/auth/me/` - requires a valid `access_token` cookie, returns
  `{"username": ...}`.

There is currently no customer-facing account system - this login is for
store admin/staff use only (e.g. managing products, viewing orders).

## Tests

```bash
source venv/bin/activate
pytest
```

## Payments

`backend/payments/` handles order payments alongside cash-on-delivery:
Safepay for card payments and Easypaisa for mobile wallet payments. Both are
configured entirely through env vars (`SAFEPAY_*` / `EASYPAISA_*` in
`.env.example`) and default to blank/unconfigured — `GET
/api/payments/methods/` reports which gateways currently have real
credentials set so the frontend can hide the rest, meaning the site runs
fine (COD-only) with no payment credentials at all.

**Both gateway integrations were written without live merchant sandbox
access.** Before processing any real payment through either one, read the
`*** VERIFY BEFORE GOING LIVE ***` docstrings at the top of
`backend/payments/gateways/safepay.py` and `backend/payments/gateways/easypaisa.py`
— they call out exactly which request/response field names, endpoint paths,
and signature/hash details need to be confirmed against each gateway's real
docs and sandbox before going live. This README won't re-litigate those
specifics; treat the docstrings as the source of truth.

## Production deployment

This project deploys via a `Procfile` (Heroku/Render-style "buildpack"
hosting) rather than a Dockerfile — stay consistent with that if you add
new hosting config.

- **`Procfile`** — `web: gunicorn core.wsgi --log-file -` runs the app;
  `release: python manage.py migrate` runs migrations automatically on
  every deploy, before the new web process starts.
- **`runtime.txt`** — pins the Python version (`python-3.13.12`, matching
  this project's `venv`) for hosts that read it (Heroku-style buildpacks).
  Not every host needs this, but it's harmless to leave in and avoids
  surprises if the host defaults to a different Python version.

### Checklist before going live

1. **Database** — provision a real Postgres instance (most hosts
   auto-provision one via an add-on and inject `DATABASE_URL` for you — you
   usually don't need to construct the connection string by hand). The
   `release: python manage.py migrate` step in the Procfile then applies
   migrations automatically on deploy.
2. **`DJANGO_SECRET_KEY`** — generate a fresh one for the production
   environment specifically (never reuse the local `.env` value, and never
   the old hardcoded key from git history — see the security warning
   above):
   ```bash
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```
3. **Core env vars** — set real production values (placeholder domain
   shown, use your actual one consistently across backend and frontend):
   - `DJANGO_DEBUG=False`
   - `DJANGO_ALLOWED_HOSTS=api.magnoliabyrahatjamal.com`
   - `CORS_ALLOWED_ORIGINS=https://www.magnoliabyrahatjamal.com`
   - `CSRF_TRUSTED_ORIGINS=https://www.magnoliabyrahatjamal.com` (must
     include the `https://` scheme — Django parses each entry with
     `urlsplit()` and a bare hostname will never match)
   - `FRONTEND_URL=https://www.magnoliabyrahatjamal.com`
   - `AUTH_COOKIE_DOMAIN=.magnoliabyrahatjamal.com` (leading dot — see
     "Cookie/domain requirement" below)
4. **Cloudinary** — create a Cloudinary account, copy the "Cloudinary URL"
   from its dashboard, set it as `CLOUDINARY_URL`. Without it, uploaded
   product images fall back to the local filesystem, which does **not**
   survive most hosts' ephemeral deploys/restarts — this is required for
   production, not optional.
5. **Superuser** — create the first admin account via the
   `DJANGO_SUPERUSER_*` env vars + `createsuperuser --noinput` (see above),
   run once against the production database.
6. **Payment gateways** — once real Safepay/Easypaisa merchant credentials
   exist, set `SAFEPAY_API_KEY` / `SAFEPAY_SECRET_KEY` / `SAFEPAY_WEBHOOK_SECRET`
   / `SAFEPAY_ENV=production` and/or `EASYPAISA_STORE_ID` / `EASYPAISA_HASH_KEY`
   / `EASYPAISA_ENV=production`, **and** register the production webhook
   URLs in each gateway's merchant dashboard:
   - `https://api.magnoliabyrahatjamal.com/api/payments/webhooks/safepay/`
   - `https://api.magnoliabyrahatjamal.com/api/payments/webhooks/easypaisa/`

   This registration step happens entirely on the gateway's side (their
   dashboard, not this codebase) and is easy to forget — without it,
   payments will appear to hang/never confirm because the webhook that
   flips `payment_status` to `paid` never arrives.

### Cookie/domain requirement (important)

Admin login (`/api/auth/login/`) sets httpOnly `access_token`/`refresh_token`
cookies with `SameSite=Lax`. For the browser to send those cookies back on
later admin API calls, **the frontend and backend must be served from
subdomains of the same registrable parent domain**, e.g.:

- Frontend: `www.magnoliabyrahatjamal.com`
- Backend: `api.magnoliabyrahatjamal.com`
- `AUTH_COOKIE_DOMAIN=.magnoliabyrahatjamal.com` (leading dot) on the backend

Get this wrong (unrelated domains, or `AUTH_COOKIE_DOMAIN` left unset when
it's actually needed) and admin login **silently breaks**: the login call
still returns success and the cookie gets set, but every subsequent admin
API call 401s because the browser has no valid domain to attach the cookie
to. This is the same underlying rule as the `localhost` vs `127.0.0.1`
issue that was found and fixed on the frontend in Phase 4 (see
`web/lib/api.js` and `web/.env.local.example`) — same bug class, different
layer. See also `web/README.md`'s "Cookie/domain requirement" section.
