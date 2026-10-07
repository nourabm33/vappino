# VAPPINO

Premium, mobile-first French storefront for **VAPPINO — Vape Gros & Détail**, with prices in Tunisian dinars (DT).

Part 1 built the storefront (catalog, search, cart, checkout UI). Part 2 adds the backend: MongoDB order storage, server-side pricing, `POST /api/orders` and owner notifications through the official WhatsApp Business Cloud API.

## Stack

- Next.js 15 (App Router, `src/`), React 19, TypeScript
- CSS Modules + global design tokens (`src/app/globals.css`), with no UI framework
- `next/font` (Sora for headings, Inter for body text), `next/image`

## Running the project

```bash
npm install
cp .env.example .env.local   # optional
npm run dev                  # http://localhost:3000
npm run lint
npm run build && npm start   # production build
```

## Routes

| Route | Description |
| --- | --- |
| `/` | Home: hero, featured products, categories, popular products, why VAPPINO, CTA |
| `/shop` | Full catalog with search, category filters, sorting (synced to `?q=&category=&sort=`) |
| `/search` | Search by product name **or** specification (e.g. `30ml`, `60K`) |
| `/product/[id]` | Product details, quantity selector, add to cart, related products (statically generated) |
| `/cart` | Cart: quantities, line totals, remove, clear, subtotal/total |
| `/checkout` | Name, phone, and optional notes with French validation, plus the `GET MY ORDER` button |
| `/order-success` | Confirmation with reference, total, and date |
| `/order-error` | Error state with retry and back-to-cart actions |

## Project structure

```
src/
  app/                 routes, layout, globals.css (design tokens), icons
  components/
    layout/            Header, MobileMenu, Footer, AgeGate, Logo
    home/              home page sections
    product/           ProductCard, ProductGrid, ProductImage, CatalogView, ProductPurchase, SpecBadge
    cart/              CartProvider (context + localStorage), CartView, CartLineItem, OrderSummary
    checkout/          CheckoutView
    order/             OrderSuccessView
    ui/                QuantitySelector, PageHeader, StatusCard, Icons
  data/
    products.ts        the 27 products (single source of truth)
    categories.ts      category definitions
  lib/
    catalog.ts         search / filter / sort
    cart.ts            cart persistence helpers
    format.ts          price formatting (65 DT)
    validation.ts      checkout validation (TN phone numbers)
    orders.ts          checkout → POST /api/orders client
    site.ts            site config, nav, contact (env-driven)
  server/              server-only: config, db (MongoDB), whatsapp (Cloud API), http, rateLimit
    orders/            validate, pricing, orderRef, message, service
  app/api/             orders/ and test-whatsapp/ route handlers
tests/                 Vitest suites (orders, whatsapp, test-whatsapp)
public/
  brand/               cleaned VAPPINO logo (WebP)
  images/products/     optimized product visuals (WebP)
```

### Products

Products live in `src/data/products.ts`. Each product has `id`, `name`, `specification`, `price`, `currency`, `image`, `description`, and `category`, plus optional `featured` and `popular` flags. **The specification is kept separate from the price**, so Mazaya 80K shows `80K` as a spec badge and `65 DT` as the price.

- Products without a dedicated photo use a branded placeholder (category color and specification). To add a photo, drop a WebP into `public/images/products/` and set `image` on the product.
- Categories (`devices`, `capsules`, `liquids`, `other`) are assigned per product and can be changed in one place.

### Cart

`CartProvider` stores only `{ productId, quantity }` in `localStorage` (`vappino.cart.v1`). Product data and prices are always resolved from the catalog, and the cart syncs across tabs.

### Branding

Colors are taken from the logo (mint → cyan → violet → magenta on deep navy) and exposed as CSS variables (`--brand-*`, `--color-*`, `--gradient-brand`).

## Architecture (Part 2)

```
Browser (checkout)  ──POST /api/orders {ids, quantities, customer}──►  Next.js route handler (Node runtime)
                                                                          │ validate input (src/server/orders/validate.ts)
                                                                          │ price from catalog (src/server/orders/pricing.ts)
                                                                          │ insert order, status=pending (MongoDB)
                                                                          │ notify owner (WhatsApp Business Cloud API)
                                                                          └ status=notification_sent | failed
```

- `src/app/api/orders/route.ts`: public order endpoint (rate limited, CORS-checked).
- `src/app/api/test-whatsapp/route.ts`: admin-only real Meta test message.
- `src/server/`: server-only code (config, MongoDB, WhatsApp client, rate limiter, order service). Never imported by client components.
- `src/data/products.ts` stays the single source of truth for products **and prices**; the server reads it, the client only sends ids and quantities.

### Order document (`orders` collection)

`orderRef`, `customerName`, `customerPhone` (E.164), `customerNotes`, `items[]` (`productId`, `productName`, `specification`, `quantity`, `unitPrice`, `subtotal`), `total`, `currency` (`TND`), `status` (`pending`, `notification_sent`, `confirmed`, `cancelled`, `failed`), `whatsappStatus` (`pending`, `sent`, `failed`), `whatsappMessageId`, `whatsappError`, `whatsappAttempts`, `idempotencyKey`, `fingerprint`, `createdAt`, `updatedAt`.

Indexes (created automatically): unique `orderRef`, unique `idempotencyKey` (when present), `fingerprint + createdAt`, `status + createdAt`.

## API

### `POST /api/orders`

Headers: `Content-Type: application/json`, optional `Idempotency-Key: <16–128 chars [A-Za-z0-9_-]>` (the checkout always sends one).

```json
{
  "customerName": "Ahmed Ben Ali",
  "customerPhone": "20123456",
  "customerNotes": "optionnel",
  "items": [{ "productId": "mazaya-80k", "quantity": 1 }]
}
```

Any price, subtotal or total fields sent by the client are ignored.

| Status | Body | Meaning |
| --- | --- | --- |
| 201 | `{ success: true, orderRef, status: "notification_sent", total, currency }` | Order saved and owner notified |
| 200 | same, plus `duplicate: true` | Resubmission of an already processed order (same key, or same phone + items within 2 min) |
| 400 | `{ success: false, error, message }` | `invalid_body`, `invalid_customer_name`, `invalid_phone`, `invalid_notes`, `empty_cart`, `invalid_product`, `invalid_quantity`, `too_many_items`, `invalid_idempotency_key` |
| 409 | `order_in_progress` | Same order is being processed right now |
| 415 / 413 | | Not JSON / body too large |
| 429 | `rate_limited` | More than 10 requests per 10 min from one IP |
| 502 / 503 | `{ success: false, error: "notification_failed", orderRef, ... }` | **Order saved** (`status: failed`) but WhatsApp failed (503 = WhatsApp env vars missing). Retrying with the same `Idempotency-Key` re-sends the notification for the same order. |
| 503 | `database_unavailable` / `database_error` | MongoDB unreachable / write failed (nothing sent) |

Order references look like `VAP-20261007-AB12` (`VAP-YYYYMMDD-XXXX`, Tunis date, uniqueness enforced by the index).

### `POST /api/test-whatsapp`

Sends a real message to `OWNER_WHATSAPP_NUMBER` through Meta and returns `{ success: true, messageId }` only when Meta accepts it. Requires `Authorization: Bearer $ADMIN_API_KEY` (disabled with 503 if the key is not configured) and is limited to 5 requests per 10 min per IP.

```bash
curl -X POST https://<your-host>/api/test-whatsapp -H "Authorization: Bearer $ADMIN_API_KEY"
```

Errors: `unauthorized`, `whatsapp_config_missing` (lists missing variable names), `whatsapp_auth` (invalid/expired token), `whatsapp_api` (Meta error with `metaCode`), `whatsapp_network`, `whatsapp_timeout`.

### Test an order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" -H "Idempotency-Key: test-$(date +%s)-abcdefgh" \
  -d '{"customerName":"Ahmed Ben Ali","customerPhone":"20123456","items":[{"productId":"mazaya-80k","quantity":1}]}'
```

Or add products in the shop, open `/checkout` and press **GET MY ORDER**.

## Environment variables

See `.env.example`. Server-side variables must **never** be prefixed with `NEXT_PUBLIC_`.

| Variable | Side | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | server | MongoDB connection string (required) |
| `MONGODB_DB` | server | Database name (default `vappino`) |
| `WHATSAPP_ACCESS_TOKEN` | server | Meta access token (required, secret) |
| `WHATSAPP_PHONE_NUMBER_ID` | server | Sender phone number id (`1356616710875243`) |
| `OWNER_WHATSAPP_NUMBER` | server | Recipient, international digits (`21651144339`) |
| `WHATSAPP_API_VERSION` | server | Graph API version (default `v21.0`) |
| `WHATSAPP_TEMPLATE_NAME` / `_LANGUAGE` | server | Optional approved template (see below) |
| `ADMIN_API_KEY` | server | Protects `/api/test-whatsapp` (long random string) |
| `ALLOWED_ORIGINS` | server | Extra origins allowed to call `/api/orders` (e.g. `https://nourabm33.github.io`) |
| `NEXT_PUBLIC_ORDERS_API_URL` | client | Full orders URL when the API is on another host; empty = same app |
| `NEXT_PUBLIC_SITE_URL` | client | Canonical site URL for metadata |
| `NEXT_PUBLIC_CONTACT_PHONE` / `_EMAIL` / `_ADDRESS` | client | Footer contact info (hidden when empty) |

## MongoDB setup

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) and a database user with read/write access.
2. Network access: allow the hosting provider (for Vercel/serverless, `0.0.0.0/0` with a strong password).
3. Copy the `mongodb+srv://…` string into `MONGODB_URI`. The `orders` collection and its indexes are created on first use.

## WhatsApp Cloud API setup

1. In [Meta for Developers](https://developers.facebook.com/), open the app with WhatsApp, note the **Phone number ID** (`WHATSAPP_PHONE_NUMBER_ID`).
2. Create a **permanent token**: Business Settings → System users → add a system user, assign the app and the WhatsApp account, generate a token with `whatsapp_business_messaging` (and `whatsapp_business_management`). Temporary tokens from the API Setup page expire after 24 h.
3. If you use Meta's test number, add `+216 51 144 339` to the allowed recipient list.
4. **24-hour rule:** free-form text is only delivered if the owner's number has messaged the business number in the last 24 h. For reliable delivery, create a *Utility* template (e.g. `nouvelle_commande`, language `fr`) with six body variables, then set `WHATSAPP_TEMPLATE_NAME=nouvelle_commande`:

   ```
   🛒 Nouvelle commande VAPPINO {{1}}
   Client : {{2}} ({{3}})
   Produits : {{4}}
   Total : {{5}}
   Notes : {{6}}
   ```
5. Run the `/api/test-whatsapp` request above; `success: true` with a `messageId` means Meta accepted the message.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI, WHATSAPP_ACCESS_TOKEN, ADMIN_API_KEY
npm run dev                  # http://localhost:3000
```

Checks: `npm run lint`, `npx tsc --noEmit`, `npm test` (Vitest, uses an in-memory MongoDB; Meta responses are stubbed in tests only), `npm run build`.

## Deployment

The API routes need a Node.js server, so the full app must be deployed on a platform that runs Next.js (e.g. Vercel, Render, Railway, a VPS with `npm run build && npm start`). Set the server-side variables in the host's environment settings, never in the repository.

GitHub Pages (`.github/workflows/deploy-pages.yml`) can only host the static frontend: the workflow builds with `STATIC_EXPORT=1`, excludes `src/app/api`, and sends orders to the URL stored in the repository variable `ORDERS_API_URL` (that API host must list `https://nourabm33.github.io` in `ALLOWED_ORIGINS`).

## Security notes

- Prices and totals are computed only on the server from `src/data/products.ts`; client-sent prices are ignored (covered by tests).
- Strict validation of every field (types, lengths, integer quantities 1–99, known product ids, phone format); queries only use server-built values, so operator injection (`{"$ne": …}`) is rejected.
- Secrets are read from `process.env` in `src/server/` only; nothing secret uses `NEXT_PUBLIC_`. Logs contain HTTP status, Meta error code/message and trace id, never tokens; MongoDB errors are logged with credentials stripped.
- Duplicate protection: checkout button locks during submission, an idempotency key per order attempt, unique DB index, and a 2-minute phone + items fingerprint.
- Rate limiting is in-memory per server instance (10/10 min per IP on orders, 5/10 min on the test endpoint). On serverless hosts each instance has its own counter; use a shared store (e.g. Upstash Redis) if stronger limits are needed.
- `/api/test-whatsapp` is disabled without `ADMIN_API_KEY` and compares keys in constant time.
- Error responses never contain stack traces, tokens or connection strings.

## Known limitations

- Rate limiting is per server instance (see Security notes).
- Orders can be reviewed directly in MongoDB (`orders` collection, filter `status: "failed"` for notifications to resend); there is no admin UI yet.
- 19 of 27 products use branded placeholders because no dedicated photo was supplied.
- Product descriptions are short and generic until real copy is supplied.
