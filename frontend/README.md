# QuickDrop — Hyperlocal Delivery Tracker (Frontend)

A React + TypeScript frontend for a multi-vendor hyperlocal delivery platform. Customers order from nearby shops and follow their rider on a live map, vendors manage products and orders, riders accept deliveries and share GPS, and admins monitor everything.

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS · React Router 6 · Axios · Supabase JS (Realtime) · React Leaflet + OpenStreetMap · Lucide React · React Hot Toast · Vitest + Testing Library

---

## Quick start

```bash
cd frontend
cp .env.example .env        # then fill in the values
npm install
npm run dev                 # http://localhost:5173
```

To try the app without a backend, create `.env.local` with `VITE_DEMO_MODE=true` (see [Demo mode](#demo-mode)). `.env.local` overrides `.env` and is ignored by git.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check (`tsc --noEmit`), then production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | Type-check only |
| `npm test` | Run the unit/component test suite once |
| `npm run test:watch` | Tests in watch mode |

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | yes | FastAPI web-app API, `http://localhost:8000/api/app` for the local backend |
| `VITE_DEMO_MODE` | no | `true` runs against the in-browser mock backend (no FastAPI or Supabase needed); `false` uses the real backend |
| `VITE_SUPABASE_URL` | for realtime | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | for realtime | Supabase **public anon** key |
| `VITE_<ROLE>_EMAIL` / `VITE_<ROLE>_PASSWORD` | no | Account each module signs in with automatically (`CUSTOMER`, `VENDOR`, `RIDER`, `ADMIN`); default `<role>@demo.com` / `demo1234` |
| `VITE_DEFAULT_LAT` / `VITE_DEFAULT_LNG` | no | Map centre when browser location is unavailable |
| `VITE_CURRENCY` | no | ISO currency for display (default `INR`) |

> **Never put the Supabase service-role key in this app.** Everything under `VITE_` is shipped to the browser. The frontend only uses the anon key, and Row Level Security decides what each user can read.

If Supabase isn't configured the app still works: live views fall back to polling the API (tracking every 10 s, orders every 15 s, notifications every 30 s).

---

## Demo mode

With `VITE_DEMO_MODE=true`, Axios requests are answered by an in-browser backend (`src/services/mock/`) instead of FastAPI:

- `db.ts` seeds users, shops, products, addresses, 30 days of order history and a few live situations, and saves them in `localStorage` (`qd.demo.db`). Bump `VERSION` to force a reseed.
- `server.ts` implements the same endpoints and business rules as the backend contract below, including role checks and allowed status transitions.
- Orders at shops without a demo sign-in progress automatically, with a simulated rider moving along the route. **Fresh Mart** (`vendor@demo.com`) orders wait for the vendor and `rider@demo.com` to act, so the whole flow can be tried by hand.
- Polling intervals are shortened (2–4 s) so changes show quickly, and notifications that arrive through polling are shown as toasts.

Demo accounts all use the password `demo1234`: `customer@demo.com`, `vendor@demo.com`, `rider@demo.com`, `admin@demo.com`. Each module signs in with its account automatically.

---

## Theme

The colours are set in `tailwind.config.js` rather than in individual components:

- `slate` is a warm neutral scale from **Coconut Cream** (`50` = `#FBEFDD`, the page background) to deep plum (`900` = `#2A1B3D`, body text).
- `surface` (`#FFF8EE`) is the card and panel colour.
- `brand` is **Borahae Purple**. Step `600` is the swatch `#B7A5DB`, used for fills with dark plum text on top; steps `700–950` are deeper shades for purple text and links. `emerald`, `green` and `violet` point to the same scale.
- Status colours outside the purple keep their meaning: blue, amber, teal, red, and fuchsia for "ready for pickup". On maps, the shop marker is orange and the rider is purple.

Change the palette in that one file to re-theme the app.

---

## Roles and pages

| Role | Path prefix | Pages |
|---|---|---|
| Customer (main site) | `/` | Home, Browse (shops + product search/filters), Vendor details, Product details, Cart, Checkout, My orders, Live tracking (`/orders/:id`), Notifications, Profile & addresses |
| Vendor | `/vendor` | Dashboard (open/closed toggle, stats), Products (search, availability toggles, delete), Add/Edit product (image upload), Incoming orders (accept/reject/prepare/ready), Order details, Order history, Store profile |
| Rider | `/rider` | Dashboard (online toggle, stats), Available deliveries (accept/skip, route preview), My deliveries, Delivery details (map, directions, progress), Live location sharing, Delivery history, Rider profile |
| Admin | `/admin` | Dashboard, Customers, Vendors (approve/reject/revoke), Riders (approve/reject), Orders (filter + detail), Live monitoring map, Analytics |

There are no login pages. The customer app is the main site (landing page at `/`); the vendor, rider and admin portals live at `/vendor`, `/rider` and `/admin`. Opening a module with no session, or a session for another role, signs in automatically with that module's account (`src/routes/guards.tsx`, `src/utils/autoLogin.ts`), configured with `VITE_<ROLE>_EMAIL` / `VITE_<ROLE>_PASSWORD` (default `<role>@demo.com` / `demo1234`). Old auth URLs redirect to the module's home. Vendor and rider accounts show an approval notice until an admin approves them.

### Order lifecycle

`placed → accepted → preparing → ready_for_pickup → rider_assigned → picked_up → out_for_delivery → delivered`, plus the terminal states `rejected` and `cancelled`. The timeline component shows a timestamp for each step from `status_history`.

| Actor | Allowed transitions in the UI |
|---|---|
| Customer | cancel while `placed` |
| Vendor | accept / reject (`placed`), `accepted → preparing`, `preparing → ready_for_pickup` |
| Rider | accept a `ready_for_pickup` order (the backend sets `rider_assigned`), then `picked_up → out_for_delivery → delivered` |

The backend must enforce these rules. The UI only offers the valid next step.

---

## Architecture

```
src/
  components/
    ui/            Button, form controls, Card, Badge/StatusBadge, Modal/ConfirmDialog,
                   skeletons, Empty/Error states, Tabs, Toggle, StatCard…
    maps/          BaseMap, DeliveryMap (vendor/destination/rider + trail), LocationPicker, DivIcon markers
    orders/        OrderTimeline, OrderCard, OrderSummary, TrackingStats (distance/ETA/live)
    customer/      VendorCard, ProductCard, AddressForm, useAddToCart (single-vendor cart guard)
    vendor/ rider/ admin/ notifications/ profile/ charts/
  contexts/        AuthContext, CartContext (persisted), NotificationContext (realtime),
                   LocationSharingContext (rider GPS stream, throttled uploads)
  hooks/           useAsync, useDebounce, useInterval, useCurrentLocation,
                   useOrderTracking (rider location: API + realtime + polling fallback),
                   useOrderRealtime (orders table changes)
  layouts/         DashboardLayout (sidebar + mobile drawer + topbar), AuthLayout, RiderLayout, navigation config
  pages/           auth/ customer/ vendor/ rider/ admin/ shared/
  routes/          AppRoutes (lazy-loaded per page), guards
  services/        api (Axios + auth/refresh interceptors), authService, vendorService, productService,
                   orderService, riderService, trackingService, notificationService, adminService,
                   realtimeService, supabase
  types/           Shared domain types
  utils/           env, format, geo (haversine/ETA), orderStatus, errors (FastAPI detail parsing), validation…
```

**Key decisions**

- **Auth goes through FastAPI.** `POST /auth/login` returns `access_token` and `refresh_token` (Supabase-issued JWTs). They're stored in `localStorage`, attached as `Bearer` tokens by Axios, and passed to `supabase.auth.setSession` / `realtime.setAuth` so Realtime runs under the user's RLS identity. On a 401, the app makes one refresh attempt (`POST /auth/refresh`) before signing the user out.
- **Password recovery:** `POST /auth/forgot-password` sends a Supabase recovery email that redirects to `/reset-password`, where `supabase.auth.updateUser` sets the new password.
- **Single-vendor cart.** An order comes from one shop. Adding an item from another shop asks the user to confirm before the cart is replaced.
- **Rider GPS** runs in a context mounted by the rider layout, so sharing continues while the rider moves between pages. Uploads are throttled to one every 5 s at most, and only after the rider moves 15 m or more, with a heartbeat every 30 s.
- **Maps** use OpenStreetMap data with CARTO Voyager tiles and HTML `DivIcon` markers, which avoids Leaflet's PNG marker problem under bundlers. Distance is the haversine distance × 1.3 road factor, and the ETA assumes 22 km/h. Both are shown as estimates.
- **Charts** are small custom SVG components (no chart library). Each chart shows a single series, has hover tooltips and a table view, and uses a colour validated for contrast and colour-blind safety.

---

## Backend contract (FastAPI)

The FastAPI backend in `D:\delivery-backend\backend` implements this contract under **`/api/app`**. Set `VITE_API_BASE_URL=http://localhost:8000/api/app` and `VITE_DEMO_MODE=false`, then start the backend with `uvicorn app.main:app --port 8000`. The backend README section "Connecting the React frontend" covers its setup, and its Swagger UI (`http://localhost:8000/docs`) lists these routes under the **App:** tags.

The frontend expects these endpoints. List endpoints may return either a bare array or `{ "items": [...], "total": n }`. Errors should use FastAPI's standard `{"detail": "..."}` or the 422 validation array. Both are shown to users as readable messages.

<details>
<summary><strong>Auth & profile</strong></summary>

| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/auth/register` | `{email, password, full_name, phone?, role, store_name?, store_category?, store_address?, latitude?, longitude?, vehicle_type?, vehicle_number?}` | `{access_token, refresh_token, user}` or `{message}` if email confirmation is required |
| POST | `/auth/login` | `{email, password}` | `{access_token, refresh_token, user}` |
| POST | `/auth/refresh` | `{refresh_token}` | `{access_token, refresh_token}` |
| POST | `/auth/logout` | — | — |
| GET / PATCH | `/auth/me` | `{full_name?, phone?, avatar_url?}` | `User` |
| POST | `/auth/change-password` | `{current_password, new_password}` | — |
| POST | `/auth/forgot-password` | `{email, redirect_to}` | — |
| GET / POST | `/customers/me/addresses` | `AddressInput` | `Address[]` / `Address` |
| PATCH / DELETE | `/customers/me/addresses/{id}` | partial `AddressInput` | `Address` |
</details>

<details>
<summary><strong>Vendors & products</strong></summary>

| Method | Path | Notes |
|---|---|---|
| GET | `/vendors` | `latitude, longitude, radius_km, search, category, open_now, sort=distance\|rating\|name` → `Vendor[]` with `distance_km` |
| GET | `/vendors/{id}` | `Vendor` |
| GET / PATCH | `/vendors/me` | vendor's own store |
| GET | `/vendors/me/stats` | `{orders_today, revenue_today, pending_orders, active_orders, total_products, completed_orders}` |
| GET | `/vendors/me/orders` | `status=placed,accepted,...` (comma-separated) |
| GET | `/vendors/me/products` | vendor's catalogue |
| GET | `/products` | `vendor_id, search, category, min_price, max_price, available` → `Product[]` (include `vendor {id,name,is_open,delivery_fee}` for cross-shop search) |
| GET | `/products/{id}` | `Product` |
| POST | `/products` | `ProductInput` |
| PATCH / DELETE | `/products/{id}` | |
| PATCH | `/products/{id}/availability` | `{is_available}` |
| POST | `/products/upload-image` | multipart `file` → `{url}` |
</details>

<details>
<summary><strong>Orders, deliveries & tracking</strong></summary>

| Method | Path | Notes |
|---|---|---|
| POST | `/orders` | `{vendor_id, address_id, items:[{product_id, quantity}], payment_method: "cod"\|"online", notes?}` → `Order` (server computes prices) |
| GET | `/orders/me` | customer's orders, optional `status` |
| GET | `/orders/{id}` | full `Order` incl. `items`, `vendor`, `customer`, `rider`, `delivery_address`, `status_history[]` |
| POST | `/orders/{id}/cancel` | `{reason?}` |
| POST | `/orders/{id}/accept` · `/orders/{id}/reject` | vendor; reject takes `{reason}` |
| PATCH | `/orders/{id}/status` | vendor: `{status: "preparing"\|"ready_for_pickup"}` |
| GET / PATCH | `/riders/me` | `{vehicle_type?, vehicle_number?}` |
| PATCH | `/riders/me/availability` | `{is_online}` |
| GET | `/riders/me/stats` | `{deliveries_today, earnings_today, total_deliveries, rating}` |
| GET | `/riders/me/deliveries` | optional `status` |
| GET | `/deliveries/available` | ready orders offered to this rider (optional `rider_earning`, `distance_km`) |
| POST | `/deliveries/{order_id}/accept` · `/reject` | |
| PATCH | `/deliveries/{order_id}/status` | `{status: "picked_up"\|"out_for_delivery"\|"delivered"}` |
| POST | `/tracking/location` | `{latitude, longitude, accuracy?, heading?, speed?, order_id?}` (upsert into `rider_locations`) |
| GET | `/tracking/orders/{order_id}` | latest `RiderLocation` or `null` |
| GET | `/tracking/active` | admin: latest location per online rider (optional `rider_name`) |
</details>

<details>
<summary><strong>Notifications & admin</strong></summary>

| Method | Path | Notes |
|---|---|---|
| GET | `/notifications` | `AppNotification[]` |
| PATCH | `/notifications/{id}/read` | |
| POST | `/notifications/read-all` | |
| DELETE | `/notifications/{id}` | |
| GET | `/admin/stats` | `{total_customers, total_vendors, total_riders, active_orders, orders_today, revenue_today, pending_approvals, online_riders}` |
| GET | `/admin/users` | `role, search, status=active\|inactive` |
| PATCH | `/admin/users/{id}/status` | `{is_active}` |
| GET | `/admin/vendors` · `/admin/riders` | `search, status=pending\|approved\|rejected` (include `owner` / `user`) |
| POST | `/admin/vendors/{id}/approve` · `/reject` | `{reason?}` |
| POST | `/admin/riders/{id}/approve` · `/reject` | `{reason?}` |
| GET | `/admin/orders` | `status, search` |
| GET | `/admin/analytics` | `days` → `{daily:[{date, orders, revenue}], status_breakdown:[{status, count}], top_vendors:[{vendor_id, name, orders, revenue}], avg_delivery_minutes}` |
</details>

Full TypeScript shapes for every payload are in [`src/types/index.ts`](src/types/index.ts).

---

## Supabase Realtime setup

The frontend subscribes to `postgres_changes` on three tables. You don't need to set this up by hand: the backend's migrations (`alembic upgrade head`) create the tables, add them to the `supabase_realtime` publication, and install the RLS policies.

| Table | Filter used | Who subscribes |
|---|---|---|
| `rider_locations` (`rider_id`, `order_id`, `latitude`, `longitude`, `heading`, `speed`, `accuracy`, `updated_at`) | `order_id=eq.<id>`; none for admin | customer tracking, vendor pickup view, admin monitor |
| `orders` | `id=eq.<id>`, `customer_id=eq.<uid>`, `vendor_id=eq.<vendor id>`, `order_status=eq.READY_FOR_PICKUP`; none for admin | order pages, vendor queues, rider job board |
| `notifications` | `user_id=eq.<uid>` (INSERT) | everyone, via the bell icon and toasts |

Realtime filters match the raw database columns, not the API's field names:

- The status column in `orders` is `order_status`, with uppercase values (`READY_FOR_PICKUP`).
- `rider_id` is the rider profile ID, which matches `Order.rider_id` and `RiderProfile.id`.
- The `type` of a realtime notification row is a detailed event name (for example
  `order_picked_up`). `notificationService` maps it to the app's categories.

The backend's **RLS policies** decide what each role can read:

- Customers read `rider_locations` only for their own orders.
- Vendors read only their own store's orders.
- Approved riders can also see unassigned `READY_FOR_PICKUP` orders, for the job board.
- Admins read everything.

Supabase Realtime applies these policies because the socket is authorised with the user's JWT. When an order update arrives, the app refetches the full order through the API, so the realtime payloads don't need joined data.

---

## Testing

```bash
npm test
```

42 tests across 5 files cover:

- **utils**: geo distance/ETA, formatting, order-timeline building (including rejected orders), next-action rules, FastAPI error parsing, validation, API list unwrapping, chart ticks
- **CartContext**: reducer merge/clamp/vendor-switch, totals, localStorage persistence and restore
- **components**: OrderTimeline, badges, Button, Toggle, QuantityStepper, ConfirmDialog (required reason), Empty/Error states, OrderCard
- **route guards**: automatic sign-in per module, switching accounts across modules, clearing an invalid session, retry on sign-in failure
- **demo backend**: all four demo logins, the full customer → vendor → rider → delivered flow, transition and ownership rules, the auto-progressing order with a moving rider, admin analytics and approvals, registration

`src/test/setup.ts` installs an in-memory `localStorage` when needed. Node 25+ ships its own experimental `localStorage`, which otherwise hides jsdom's and breaks the tests.

## Browser support and notes

- Modern evergreen browsers. Live GPS needs HTTPS (or `localhost`) and location permission.
- Riders should keep the app open during a delivery. Browsers pause GPS for pages in background tabs.
- Map tiles come from CARTO's public basemaps (OpenStreetMap data). They have [usage limits](https://carto.com/basemaps), so for production traffic use a tile provider plan or host your own tiles, and change the `TileLayer` URL in `src/components/maps/BaseMap.tsx`.
