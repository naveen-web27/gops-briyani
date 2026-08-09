# Billzo — Restaurant SaaS Platform

---

## What Is Billzo?

Billzo is a **software-as-a-service (SaaS) platform** built for small and medium restaurants.

You (the developer) maintain **one shared codebase**. Each restaurant you onboard gets their own branded website, admin panel, billing system, and inventory manager — all powered by the same code.

No expensive hosting. No complex backend. Everything runs on:
- **GitHub Pages** (free website hosting)
- **Google Sheets** (free database per client)
- **Google Apps Script** (free backend API)

---

## Who Is It For?

| Who | What They Get |
|---|---|
| **You (Billzo)** | One codebase to maintain. Add new clients in minutes. Earn recurring SaaS fees. |
| **Restaurant owners** | A full digital system — website, billing, inventory, admin — without paying for expensive software. |

---

## What Does Billzo Provide?

### 1. Public Website
A fully branded restaurant website with:
- **Hero image slider** with custom slides per client
- **About section** with years of experience, story
- **Menu section** — live from Google Sheets, filterable by category
- **Events section** — upcoming events/offers
- **Outlets section** — multiple branch locations
- **Testimonials** — customer reviews
- **Reservation form** — sends directly to Google Forms / Sheets
- **Social media links** — Instagram, Facebook, WhatsApp, Zomato, Swiggy
- **Floating order button** — WhatsApp / Swiggy quick order
- **Mobile responsive** — works on all screen sizes
- **Custom brand colors** — each client gets their own color theme

### 2. Admin Panel (PIN Protected)
A management dashboard with:
- **PIN login** — secure, no passwords to remember
- **Dashboard** — quick stats (total orders, revenue, menu count, low stock)
- **Menu Manager** — add, edit, delete dishes. Set category, price, type (Veg/Non-Veg), availability, badge (New/Popular), image URL
- **Orders Viewer** — see all orders with filters (date range, status). Sort by any column. Export to CSV.
- **Inventory Overview** — view current stock levels from admin
- **Analytics** — revenue chart, order counts by period (today / week / month / custom)
- **Settings** — update Script URL, change PIN, view connection status

### 3. Billing / POS System
A point-of-sale system for the cashier with:
- **Product search** — instant search across all menu items
- **Category filter bar** — browse by food category
- **Cart** — add items, adjust quantities, remove items
- **Hold & Resume bills** — park a bill, serve another customer, come back
- **Customer types** — Walk-in / Online / Delivery
- **Customer details** — name, phone, address for delivery orders
- **Table number** — for dine-in
- **GST calculation** — configurable percentage
- **Discount** — flat or percentage discount
- **Payment modes** — Cash, UPI, Card, Online
- **WhatsApp bill** — send bill summary to customer via WhatsApp
- **Print bill** — browser print with proper bill format
- **Bill screenshot** — save bill as image (html2canvas)
- **Auto bill numbering** — sequential bill numbers per session
- **Sync to Google Sheets** — every bill saved to Orders sheet automatically

### 4. Inventory Manager
Track raw materials and stock with:
- **Stock cards** — total items, low stock count, out of stock, total value
- **Add / Edit items** — Item name, category, unit, stock qty, minimum qty, unit cost, supplier
- **Quick stock adjust** — +/- buttons to adjust stock without opening the full form
- **Delete items** — with confirmation
- **Category filter** — filter inventory by category
- **Search** — search by item name
- **Stock status badges** — OK / Low / Out labels
- **Sync to Google Sheets** — all data stored in the client's Inventory sheet

---

## How the System Works (Architecture)

```
┌─────────────────────────────────────────────────────────┐
│                    BILLZO PLATFORM                       │
│                                                         │
│  biryani-core repo (GitHub Pages CDN)                   │
│  ├── core/style.css      ← website styles               │
│  ├── core/app.js         ← website logic + HTML         │
│  ├── core/admin.css      ← admin styles                 │
│  ├── core/admin.js       ← admin logic                  │
│  ├── core/billing.css    ← billing styles               │
│  ├── core/billing.js     ← billing logic                │
│  ├── core/inventory.css  ← inventory styles             │
│  └── core/inventory.js   ← inventory logic              │
│                                                         │
│  Billzo Master Sheet (Google Sheets)                    │
│  ├── Config tab          ← client registry              │
│  └── Sessions tab        ← auth tokens                  │
│                                                         │
│  Apps Script (ONE deployment, serves ALL clients)       │
│  └── Single Web App URL ─────────────────────────────┐  │
└──────────────────────────────────────────────────────│──┘
                                                       │
        ┌──────────────────────────────────────────────┘
        │  Reads Config sheet → finds client's Sheet ID
        │  Opens that client's Google Sheet
        ↓
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│  Gopi's Briyani   │  │  Hot Bites        │  │  Spice Garden     │
│  Google Sheet     │  │  Google Sheet     │  │  Google Sheet     │
│  ├─ Orders        │  │  ├─ Orders        │  │  ├─ Orders        │
│  ├─ Menu          │  │  ├─ Menu          │  │  ├─ Menu          │
│  └─ Inventory     │  │  └─ Inventory     │  │  └─ Inventory     │
└───────────────────┘  └───────────────────┘  └───────────────────┘

        ↑                       ↑                       ↑
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│ gops-briyani repo │  │ hot-bites repo    │  │ spice-garden repo │
│ (GitHub Pages)    │  │ (GitHub Pages)    │  │ (GitHub Pages)    │
│ ├─ config.js      │  │ ├─ config.js      │  │ ├─ config.js      │
│ ├─ auth.js        │  │ ├─ auth.js        │  │ ├─ auth.js        │
│ ├─ index.html     │  │ ├─ index.html     │  │ ├─ index.html     │
│ ├─ admin.html     │  │ ├─ admin.html     │  │ ├─ admin.html     │
│ ├─ billing.html   │  │ ├─ billing.html   │  │ ├─ billing.html   │
│ ├─ inventory.html │  │ ├─ inventory.html │  │ ├─ inventory.html │
│ └─ images/        │  │ └─ images/        │  │ └─ images/        │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

---

## Key Design Principle: Shared Core

All CSS and JS lives in the `biryani-core` repo. Client repos only contain their own `config.js` and `images/`.

```
When you fix a bug or add a feature in core/admin.js:
  → Push to biryani-core repo
  → ALL clients get the update instantly
  → You do NOT touch individual client repos
```

This is the same principle as Google Fonts — you host it once, everyone uses it via URL.

---

## Security Model

- **PIN login** — stored in each client's `config.js`. Never sent in plain text (hashed with SHA-256 in Apps Script).
- **Session tokens** — stored in the master Sessions sheet. Expire after 24 hours.
- **Token hashing** — tokens are SHA-256 hashed before storage. Even if someone reads the sheet, they cannot reuse a token.
- **Per-client isolation** — each client's data is in their own Google Sheet. Client A cannot access Client B's data.
- **Inactive clients** — set Status = `inactive` in Config sheet to block all API access for a client instantly.

---

## GitHub Account / Repo Naming

**GitHub Username:** `billzo-saas`

**CDN Repo:** `billzo-saas/biryani-core`
- URL: `https://billzo-saas.github.io/biryani-core/`
- Contains: all shared `core/` files

**Client Repos:**
```
billzo-saas/gops-briyani      → https://billzo-saas.github.io/gops-briyani/
billzo-saas/hot-bites         → https://billzo-saas.github.io/hot-bites/
billzo-saas/spice-garden      → https://billzo-saas.github.io/spice-garden/
```

---

## Google Account

**Gmail:** `billzo.saas@gmail.com`

This one account owns:
- Billzo Master Sheet (Config + Sessions)
- Apps Script deployment (single Web App URL)
- Has access to all client Google Sheets (shared by client)

---

## Master Sheet (Apps Script Backend)

**Sheet Name:** Billzo Master

**Config Tab** — one row per client:
| Client ID | Sheet ID | Password | Session MS | Status |
|---|---|---|---|---|
| `gops_briyani` | `1BxiMVs0...` | `gops123` | `86400000` | `active` |
| `hot_bites` | `1KpzNWt9...` | `hotbites@1` | `86400000` | `active` |

**Sessions Tab** — auto-managed. Login creates a row. Logout/expiry deletes it.

**Apps Script API actions:**

| Action | Method | Description |
|---|---|---|
| `login` | GET | Validate password → return token |
| `logout` | GET | Revoke session token |
| `validateSession` | GET | Check if token is still valid |
| `menu` | GET | Fetch all menu items |
| `orders` | GET | Fetch all orders |
| `inventory` | GET | Fetch all inventory |
| `upsertOrder` | POST | Save or update a bill |
| `addDish` | POST | Add new menu item |
| `editDish` | POST | Edit existing menu item |
| `editField` | POST | Toggle a single field (e.g. availability) |
| `deleteDish` | POST | Delete a menu item |
| `saveInventoryItem` | POST | Add or update inventory item |
| `deleteInventoryItem` | POST | Delete inventory item |
| `adjustInventoryStock` | POST | Quick +/- stock adjustment |

---

## Adding a New Client — Step by Step

1. **Create their Google Sheet**
   - Login as `billzo.saas@gmail.com`
   - New Google Sheet → name it (e.g. "Hot Bites")
   - Create tabs: `Menu`, `Orders`, `Inventory` (or leave blank — script creates them)
   - Copy the Sheet ID from the URL

2. **Add to Config Sheet**
   - Open Billzo Master sheet → Config tab
   - Add row: `hot_bites | <Sheet ID> | <password> | 86400000 | active`

3. **Create GitHub Repo**
   - Copy `_new-client-template/` folder contents
   - Create new repo: `billzo-saas/hot-bites`
   - Fill in `config.js` with client's brand, colors, menu sheet URL, script URL
   - Upload their logo/images to `images/`
   - Enable GitHub Pages → branch: `main`, folder: `/ (root)`

4. **Update core/ URLs in HTML files**
   - In all 4 HTML files, change `./core/` to `https://billzo-saas.github.io/biryani-core/`

5. **Done** — Client's website is live at `https://billzo-saas.github.io/hot-bites/`

---

## File Structure

```
gops-briyani/ (your current working repo — first client)
├── config.js             ← Client-specific: brand, colors, sheets URLs
├── auth.js               ← BillzoAuth module (login/session/API calls)
├── index.html            ← Public website (thin shell, loads from core/)
├── admin.html            ← Admin panel (thin shell)
├── billing.html          ← Billing POS (thin shell)
├── inventory.html        ← Inventory manager (thin shell)
├── apps-script.js        ← The Apps Script code (paste into Google Apps Script)
├── core/
│   ├── style.css         ← Website CSS (shared)
│   ├── app.js            ← Website JS + HTML (shared)
│   ├── admin.css         ← Admin CSS (shared)
│   ├── admin.js          ← Admin JS (shared)
│   ├── billing.css       ← Billing CSS (shared)
│   ├── billing.js        ← Billing JS (shared)
│   ├── inventory.css     ← Inventory CSS (shared)
│   └── inventory.js      ← Inventory JS (shared)
└── _new-client-template/
    ├── config.js         ← Template: copy and fill for each new client
    ├── auth.js           ← Same auth module
    ├── index.html        ← Template website shell
    ├── admin.html        ← Template admin shell
    ├── billing.html      ← Template billing shell
    └── inventory.html    ← Template inventory shell
```

---

## Tech Stack Summary

| Layer | Technology | Cost |
|---|---|---|
| Frontend hosting | GitHub Pages | Free |
| Shared CDN | GitHub Pages (`biryani-core` repo) | Free |
| Database | Google Sheets (per client) | Free |
| Backend API | Google Apps Script | Free |
| Fonts | Google Fonts | Free |
| Bill screenshots | html2canvas (CDN) | Free |
| Domain (optional) | Custom domain via GitHub Pages | ~₹700/year |

**Total infrastructure cost: ₹0** (or ~₹700/year if using custom domains)

---

## Revenue Model (Your Business)

- Charge each restaurant a **monthly or yearly SaaS fee**
- You maintain one codebase — any improvement reaches all clients automatically
- Add new clients in under 30 minutes
- Scale to 50+ clients with zero extra infrastructure cost
