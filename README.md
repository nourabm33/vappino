# VAPPINO — Frontend (Part 1)

Premium, mobile-first French storefront for **VAPPINO — Vape Gros & Détail**, with prices in Tunisian dinars (DT).

Part 1 is **frontend only**: catalog, search, cart, and checkout UI. There is no backend, database, WhatsApp, payment, or deployment yet (see [Part 2](#part-2--what-still-needs-to-be-built)).

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
    orders.ts          order submission (Part 2 integration point)
    site.ts            site config, nav, contact (env-driven)
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

## Environment variables

See `.env.example`. All are optional in Part 1.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ORDERS_API_URL` | Orders endpoint. If empty, checkout **simulates** a successful order locally. |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for metadata |
| `NEXT_PUBLIC_CONTACT_PHONE` / `_EMAIL` / `_ADDRESS` | Footer contact info (hidden when empty) |

## Part 2 — what still needs to be built

1. **`POST /api/orders`** that accepts the payload built in `src/lib/orders.ts`:
   ```json
   {
     "customer": { "fullName": "Ali Ben Salah", "phone": "+21622123456" },
     "notes": "optional",
     "items": [{ "productId": "mazaya-80k", "quantity": 2 }]
   }
   ```
   and returns `{ "reference": "...", "total": 130 }`.
   The server must **recompute prices and totals** from its own product data and never trust client totals.
2. MongoDB persistence for orders, and optionally for products.
3. WhatsApp notification to the shop on new orders (server-side tokens only).
4. Rate limiting and anti-spam for the order endpoint.
5. Real contact details, legal pages, and deployment.
6. Real photos for products that currently use placeholders.

## Known limitations

- Orders are simulated when `NEXT_PUBLIC_ORDERS_API_URL` is not set.
- 19 of 27 products use branded placeholders because no dedicated photo was supplied.
- Product descriptions are short and generic until real copy is supplied.
