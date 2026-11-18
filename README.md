# QuickDrop — Multi-Vendor Hyperlocal Delivery (Frontend)

QuickDrop connects **customers**, **local shops**, **delivery riders** and **administrators** on one platform. Customers order from shops nearby and watch their rider move on a live map. Vendors run their store and orders. Riders accept deliveries and share their GPS. Admins approve partners and monitor the platform.

This repository contains the **web frontend** (React + TypeScript). It talks to a FastAPI backend and uses Supabase Realtime for live updates. It also includes a **demo mode** that runs without any backend.

---

## Features

| Customer (main site) | Vendor | Rider | Admin |
|---|---|---|---|
| Browse nearby shops | Open / close the store | Go online / offline | Platform stats |
| Search & filter products | Add, edit, delete products | Accept or skip deliveries | Approve vendors & riders |
| Cart & checkout | Toggle product availability | Pickup & drop-off maps | Manage users |
| **Live rider tracking** on a map | Accept / reject orders | **Live GPS sharing** | **Live map of all riders** |
| 8-step order timeline | Preparing → ready for pickup | Update delivery progress | Order monitoring |
| Real-time notifications | Order history | Delivery & earnings history | Analytics charts |
| Profile & saved addresses | Store profile & location | Rider & vehicle profile | |

**Order flow:** Order Placed → Vendor Accepted → Preparing → Ready for Pickup → Rider Assigned → Picked Up → Out for Delivery → Delivered

---

## Quick start

You need **Node.js 18 or newer**.

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

### Option A — Demo mode (no backend needed)

Demo mode runs a simulated backend inside your browser, with sample shops, products, past orders and a rider that moves on the map by itself.

Create `frontend/.env.local` containing:

```
VITE_DEMO_MODE=true
```

Then restart `npm run dev`. There is no login page: each module opens directly and signs in with its demo account (password **`demo1234`**):

| Role | Address | Account |
|---|---|---|
| Customer | http://localhost:5173/ | `customer@demo.com` |
| Vendor (owns *Fresh Mart*) | http://localhost:5173/vendor | `vendor@demo.com` |
| Rider | http://localhost:5173/rider | `rider@demo.com` |
| Admin | http://localhost:5173/admin | `admin@demo.com` |

**Things to try:**

- **See live tracking straight away:** open the home page and pick the *Spice Route Kitchen* order. It progresses on its own, and within about a minute a rider starts moving towards you.
- **Run the full flow by hand:**
  1. As the customer, order from **Fresh Mart**.
  2. As the vendor, accept the order, start preparing it and mark it ready.
  3. As the rider, go online and accept the delivery, then confirm pickup, start the delivery and mark it delivered.
  4. As the customer, check the finished timeline.
- **Admin:** approve the pending shop (*Green Leaf Organics*) and the pending rider (*Meena Das*), and open Analytics and Live monitoring.

Demo data is saved only in your browser. **Reset data** in the demo box puts it back to the start. To leave demo mode, delete `frontend/.env.local`.

### Option B — Real backend

1. Start the FastAPI backend (`D:\delivery-backend\backend`):
   ```bash
   # inside the backend folder, after filling in its .env with your Supabase project values
   alembic upgrade head
   uvicorn app.main:app --port 8000
   ```
2. Configure the frontend in `frontend/.env` (copy `frontend/.env.example`):
   ```
   VITE_API_BASE_URL=http://localhost:8000/api/app
   VITE_DEMO_MODE=false
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your public anon key>
   ```
3. Make sure no `frontend/.env.local` exists, because it would switch demo mode back on. Then run `npm run dev`.

> Only the Supabase **anon** key belongs in the frontend. Never put the service-role key in any `VITE_` variable, because those values are shipped to the browser.

---

## Site map

| Area | Address |
|---|---|
| Customer shop (main site, landing page) | `/` |
| Vendor dashboard | `/vendor` |
| Rider dashboard | `/rider` |
| Admin dashboard | `/admin` |

There are no login pages. Opening a module signs in automatically with that module's account (set with `VITE_<ROLE>_EMAIL` / `VITE_<ROLE>_PASSWORD`, default `<role>@demo.com` / `demo1234`). Old sign-in URLs such as `/login` or `/vendor/login` redirect to the module's home.

---

## Tech stack

- **React 18 + TypeScript**, built with **Vite**
- **Tailwind CSS**: "Coconut Cream" theme (`#FBEFDD`) with **Borahae Purple** accents (`#B7A5DB`)
- **React Router 6**: role-protected routes, with each page loaded on demand
- **Axios**: REST calls to FastAPI, with automatic token refresh
- **Supabase JS**: Realtime subscriptions for rider locations, orders and notifications (polling fallback)
- **React Leaflet + Leaflet**: OpenStreetMap data with CARTO Voyager map tiles
- **Lucide React** icons · **React Hot Toast** notifications
- **Vitest + Testing Library**: 42 tests

---

## Project structure

```
delivery-frontend/
├── README.md                ← you are here
└── frontend/
    ├── README.md            ← detailed developer docs (API contract, realtime, architecture)
    ├── .env.example         ← environment template
    ├── tailwind.config.js   ← theme colours
    └── src/
        ├── pages/           ← auth, customer, vendor, rider, admin, shared
        ├── components/      ← UI kit, maps, order timeline, charts…
        ├── layouts/         ← sidebar dashboard layout, auth layout
        ├── contexts/        ← auth, cart, notifications, rider GPS
        ├── hooks/           ← data loading, live tracking, realtime
        ├── services/        ← API clients, Supabase, demo backend (services/mock)
        ├── routes/          ← routes and role guards
        ├── types/ utils/
        └── test/
```

## Scripts (run inside `frontend/`)

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server at http://localhost:5173 |
| `npm run build` | Type-check and create a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the test suite |

## More documentation

See **[frontend/README.md](frontend/README.md)** for:

- the full backend API contract the frontend expects
- the Supabase Realtime tables and access rules
- architecture decisions
- testing details

## Troubleshooting

- **"Unable to reach the server" on sign-in:** the backend isn't running, or demo mode is off. Start the backend, or turn on demo mode (Option A above).
- **`npm` is not recognized after updating Node.js:** close and reopen your terminal or editor so it picks up the new path.
- **A page shows a blank map:** map tiles load from the internet, so check your connection.
- **Live GPS doesn't work on a phone:** browsers only allow location access over HTTPS or on `localhost`, so plain local-network addresses such as `http://192.168…` won't work.
