# Architecture

## System Overview

```
                    ┌─────────────────────────┐
                    │     Cloudflare Edge      │
                    │                         │
  Browser ────────► │  ┌───────────────────┐  │
                    │  │  Cloudflare Pages  │  │
                    │  │  (braun-hugo)      │  │
                    │  │  Static HTML/CSS/JS│  │
                    │  └───────────────────┘  │
                    │                         │
                    │  ┌───────────────────┐  │
                    │  │  Cloudflare Worker │  │
                    │  │  (zenbooker-api)   │  │
                    │  │  Hono API + Admin  │──┼──► Twilio (SMS)
                    │  │                   │──┼──► Mapbox (Geocoding)
                    │  └────────┬──────────┘  │
                    │           │              │
                    │  ┌────────▼──────────┐  │
                    │  │  Cloudflare D1    │  │
                    │  │  (goatkit)        │  │
                    │  │  SQLite @ edge    │  │
                    │  └───────────────────┘  │
                    └─────────────────────────┘
```

## Two Deployment Targets

### 1. Cloudflare Pages — Static Site

**What**: Hugo-generated static site (marketing, blog, services).
**Domain**: unclebike.xyz / braun-hugo.pages.dev
**Deploys**: Automatically on `git push origin main`.
**Build**: `hugo --minify && npx pagefind --site public`

Key paths:
```
hugo.toml                    # Site config (base URL, theme params, menus)
content/                     # Markdown content
  pages/                     #   Static pages (about, contact, membership, etc.)
  posts/                     #   Blog posts
  services/                  #   Service listings (Primo Pete, Ready Eddy, etc.)
  projects/                  #   Portfolio/case studies
  benefits/                  #   Membership benefits
themes/braun-hugo/           # Custom theme
  layouts/                   #   Hugo templates
    _default/                #     Base templates (baseof.html, list.html, single.html)
    partials/                #     Reusable components (header, footer, navigation, etc.)
    pages/, posts/, etc.     #     Section-specific templates
  assets/                    #   CSS/JS assets
  i18n/                      #   Translations
static/                      # Static files (images, fonts)
build.sh                     # Build script (hugo + pagefind + draft redirects)
```

### 2. Cloudflare Worker — API Backend

**What**: Hono-based REST API + server-rendered admin dashboard.
**Domain**: api.unclebike.xyz
**Deploys**: `cd api && npx wrangler deploy`
**Worker name**: `zenbooker-api` (legacy name, not yet renamed)

Key paths:
```
api/
  src/
    index.ts                 # Main app, route mounting, widget endpoints, cron handler
    middleware/
      auth.ts                # CF Access JWT + API key authentication
    routes/                  # REST API endpoints (18 route files)
      admin.ts               #   Admin dashboard (server-rendered HTML)
      jobs.ts                #   Job CRUD + status transitions
      bookings.ts            #   Public booking creation
      customers.ts           #   Customer CRM
      scheduling.ts          #   Availability + timeslot calculation
      services.ts            #   Service catalog management
      messages.ts            #   SMS thread management
      invoices.ts            #   Invoice generation
      transactions.ts        #   Payment tracking
      team.ts                #   Provider management
      territories.ts         #   Service area management
      categories.ts          #   Service categories
      modifiers.ts           #   Service add-ons/modifiers
      skills.ts              #   Provider skill matching
      coupons.ts             #   Discount codes
      recurring-bookings.ts  #   Subscription jobs
      webhooks.ts            #   Webhook management
      twilio-webhooks.ts     #   Twilio inbound SMS handler
    services/                # Business logic
      twilio.ts              #   SMS sending, templates, quiet hours
      notifications.ts       #   Push notification dispatch
      webhooks.ts            #   Outbound webhook firing
    views/                   # Admin dashboard JSX templates (Hono JSX)
      layout.tsx             #   Base HTML layout (PWA meta, safe-area CSS)
      dashboard.tsx          #   Main dashboard
      job-detail.tsx         #   Job detail view
      job-wizard.tsx         #   Job creation wizard
      invoice-detail.tsx     #   Invoice view
      message-detail.tsx     #   SMS thread view
      provider-detail.tsx    #   Team member view
      service-detail.tsx     #   Service editor
      territory-detail.tsx   #   Territory/area editor
      branding.tsx           #   Widget branding settings
      push-settings.tsx      #   Push notification config
      sms-settings.tsx       #   Twilio config
      components.tsx         #   Shared UI components
    widget/
      embed.ts               #   Booking widget JS (inline, no build step)
    geo/                     #   Geo utilities
    scheduling/              #   Scheduling logic
    db/                      #   Database helpers
    utils/                   #   General utilities
    assets/                  #   Static assets served by worker (fonts, admin.js, SW)
  wrangler.toml              # Worker config, D1 binding, cron triggers
  tsconfig.json              # TypeScript config (strict, ES2020, Hono JSX)
  package.json               # 3 deps: hono, zod, @hono/zod-validator
```

## Database Schema (D1 — SQLite)

Database name: `goatkit` | 10 migrations applied.

### Core Tables

| Table | Purpose | Key Relations |
|-------|---------|---------------|
| `territories` | Service areas with operating hours | Has many services, team members |
| `services` | Service catalog (name, price, duration) | Belongs to category, has modifiers + required skills |
| `service_categories` | Service grouping | Has many services |
| `service_modifiers` | Add-ons that adjust price/duration | Belongs to service |
| `customers` | Customer records | Has many addresses, jobs, invoices |
| `customer_addresses` | Customer locations (with lat/lng) | Belongs to customer |
| `team_members` | Service providers | Has skills, territories, weekly hours |
| `jobs` | Scheduled work (the core entity) | Belongs to customer, service, territory; has providers, notes |
| `recurring_bookings` | Subscription/repeat jobs | Belongs to customer, service |
| `invoices` | Bills tied to jobs | Belongs to job, customer |
| `transactions` | Payments against invoices | Belongs to invoice |
| `coupons` | Discount codes | Standalone |
| `webhooks` | Outbound event hooks | Standalone |
| `settings` | Key-value config store | Standalone |
| `api_keys` | API authentication keys | Standalone |
| `price_adjustment_rules` | Dynamic pricing rules | Belongs to service/territory |

### Junction Tables
- `service_required_skills` — services ↔ skills
- `territory_services` — territories ↔ services
- `team_member_skills` — team members ↔ skills
- `team_member_territories` — team members ↔ territories
- `job_providers` — jobs ↔ team members
- `provider_weekly_hours` — team member availability
- `provider_date_overrides` — availability exceptions

### Schema Conventions
- All IDs are `TEXT PRIMARY KEY` (UUIDs)
- Timestamps are ISO 8601 text (`datetime('now')`)
- Money is stored as `INTEGER` cents (`_cents` suffix)
- Booleans are `INTEGER` (0/1)
- JSON stored as `TEXT` (operating_hours, service_area_data, etc.)

## API Endpoints

### REST API (`/v1/...`) — JSON, Auth Required Unless Noted

All endpoints return JSON. Standard CRUD pattern: `GET /` (list), `GET /:id` (detail), `POST /` (create → 201), `PATCH /:id` (update), `DELETE /:id` (delete).

#### Territories — `/v1/territories`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/territories` | Yes | `?active=true` filter |
| GET | `/v1/territories/:id` | Yes | Includes services + providers |
| POST | `/v1/territories` | Yes | Accepts `service_ids[]`, `provider_ids[]` |
| PATCH | `/v1/territories/:id` | Yes | Partial update, can replace service/provider assignments |
| DELETE | `/v1/territories/:id` | Yes | Cascades junction tables |

#### Scheduling — `/v1/scheduling`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/scheduling/service_area_check` | **Public** | `?postal_code=&lat=&lng=` — checks if address is within any territory |
| GET | `/v1/scheduling/timeslots` | **Public** | `?territory_id=&date_from=&date_to=&duration_minutes=&service_id=` — Zod validated |

#### Services — `/v1/services`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/services` | **Public** | `?territory_id=&active=true` — includes modifiers + required_skills |
| GET | `/v1/services/:id` | **Public** | Full detail with modifiers + skills |
| POST | `/v1/services` | Yes | Accepts `required_skill_ids[]` |
| PATCH | `/v1/services/:id` | Yes | |
| DELETE | `/v1/services/:id` | Yes | Cascades modifiers, skills, territory links |

#### Categories — `/v1/categories`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/categories` | Yes | Sorted by sort_order |
| GET | `/v1/categories/:id` | Yes | |
| POST | `/v1/categories` | Yes | |
| PATCH | `/v1/categories/:id` | Yes | |
| DELETE | `/v1/categories/:id` | Yes | Nullifies services.category_id |

#### Modifiers — `/v1/modifiers`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/modifiers` | Yes | `?service_id=` filter |
| GET | `/v1/modifiers/:id` | Yes | |
| POST | `/v1/modifiers` | Yes | |
| PATCH | `/v1/modifiers/:id` | Yes | |
| DELETE | `/v1/modifiers/:id` | Yes | |

#### Customers — `/v1/customers`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/customers` | Yes | Includes addresses |
| GET | `/v1/customers/:id` | Yes | |
| POST | `/v1/customers` | Yes | Duplicate check (email/phone). Accepts `customer_addresses[]` |
| PATCH | `/v1/customers/:id` | Yes | Can replace addresses |
| DELETE | `/v1/customers/:id` | Yes | Cascades addresses |

#### Team — `/v1/team`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/team` | Yes | Includes weekly_hours, skills, territories |
| GET | `/v1/team/:id` | Yes | |
| POST | `/v1/team` | Yes | Accepts `skill_ids[]`, `territory_ids[]`, `provider_weekly_hours[]` |
| PATCH | `/v1/team/:id` | Yes | Can replace skills/territories/hours |
| DELETE | `/v1/team/:id` | Yes | Cascades all junction tables |

#### Skills — `/v1/skills`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/skills` | Yes | |
| GET | `/v1/skills/:id` | Yes | |
| POST | `/v1/skills` | Yes | |
| PATCH | `/v1/skills/:id` | Yes | |
| DELETE | `/v1/skills/:id` | Yes | Cascades service + team links |

#### Jobs — `/v1/jobs`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/jobs` | Yes | `?status=` filter. Includes providers + notes |
| GET | `/v1/jobs/:id` | Yes | |
| POST | `/v1/jobs` | Yes | Accepts `provider_ids[]`, `notes[]`. Auto-creates invoice if status=complete |
| PATCH | `/v1/jobs/:id` | Yes | Partial update. Add note via `note` field. Auto-invoice on complete |
| DELETE | `/v1/jobs/:id` | Yes | Cascades notes, providers, invoices |

#### Bookings — `/v1/bookings`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/v1/bookings/create` | **Public** | Widget booking flow. Auto-creates customer/address, applies modifiers + pricing rules, sends SMS confirmation |

#### Recurring Bookings — `/v1/recurring-bookings`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/recurring-bookings` | Yes | |
| GET | `/v1/recurring-bookings/:id` | Yes | |
| POST | `/v1/recurring-bookings` | Yes | |
| PATCH | `/v1/recurring-bookings/:id` | Yes | |
| DELETE | `/v1/recurring-bookings/:id` | Yes | |

#### Invoices — `/v1/invoices`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/invoices` | Yes | |
| GET | `/v1/invoices/:id` | Yes | |
| POST | `/v1/invoices` | Yes | Auto-generates INV-XXXXXX number. Supports line_items, tax, discount |
| PATCH | `/v1/invoices/:id` | Yes | Recomputes totals from line items |
| DELETE | `/v1/invoices/:id` | Yes | |

#### Transactions — `/v1/transactions`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/transactions` | Yes | |
| GET | `/v1/transactions/:id` | Yes | |
| POST | `/v1/transactions` | Yes | |
| PATCH | `/v1/transactions/:id` | Yes | |
| DELETE | `/v1/transactions/:id` | Yes | |

#### Coupons — `/v1/coupons`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/coupons/validate` | **Public** | `?code=&subtotal_cents=` — validates + calculates discount |
| GET | `/v1/coupons` | Yes | |
| GET | `/v1/coupons/:id` | Yes | |
| POST | `/v1/coupons` | Yes | Code auto-uppercased |
| PATCH | `/v1/coupons/:id` | Yes | |
| DELETE | `/v1/coupons/:id` | Yes | |

#### Messages — `/v1/messages`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/v1/messages/submit` | **Public** | Zod-validated discriminated union: `contact`, `newsletter`, `registration`. Triggers push notification |
| GET | `/v1/messages` | Yes | `?source=&status=&cursor=&limit=` — paginated |
| GET | `/v1/messages/:id` | Yes | |
| PATCH | `/v1/messages/:id` | Yes | Update status/is_read |
| DELETE | `/v1/messages/:id` | Yes | |

#### Webhooks — `/v1/webhooks`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/webhooks` | Yes | |
| GET | `/v1/webhooks/:id` | Yes | |
| POST | `/v1/webhooks` | Yes | Auto-generates secret |
| PATCH | `/v1/webhooks/:id` | Yes | |
| DELETE | `/v1/webhooks/:id` | Yes | |

### Widget Endpoints (root level) — Public

| Method | Path | Notes |
|--------|------|-------|
| GET | `/widget/booking-widget.js` | Embeddable booking widget JS (injects branding color) |
| GET | `/widget/popup.js` | Popup booking widget variant |
| GET | `/widget/branding.js` | CSS custom property injector for brand color |
| GET | `/widget/demo` | Full-page booking widget demo |
| GET | `/widget/address/search` | `?q=&proximity=` — Mapbox geocoding proxy |

### Twilio Webhooks — Public

| Method | Path | Notes |
|--------|------|-------|
| POST | `/webhooks/twilio/status` | SMS delivery status callbacks. Signature-validated |
| POST | `/webhooks/twilio/inbound` | Inbound SMS handler. Matches customer by phone, logs message, handles opt-out/in keywords, triggers push notification |

### Admin Dashboard (`/admin/...`) — Server-Rendered HTML, CF Access Auth

The admin panel is NOT a JSON API. It's server-rendered HTML with HTMX for interactivity. All endpoints under `/admin/` return HTML and use form POSTs (not JSON).

**Key admin sections:**

| Section | List | Detail/Edit | Create | Delete |
|---------|------|-------------|--------|--------|
| Dashboard | `GET /admin/` | — | — | — |
| Territories | `GET /admin/territories` | `GET /admin/territories/:id` | `GET/POST /admin/territories/new` | `POST /admin/territories/:id/delete` |
| Services | `GET /admin/services` | `GET /admin/services/:id` | `GET/POST /admin/services/new` | `POST /admin/services/:id/delete` |
| Customers | `GET /admin/customers` | `GET /admin/customers/:id/edit` | `GET/POST /admin/customers/new` | `POST /admin/customers/:id/delete` |
| Team | `GET /admin/team` | `GET /admin/team/:id` | `GET/POST /admin/team/new` | `POST /admin/team/:id/delete` |
| Jobs | `GET /admin/jobs` | `GET /admin/jobs/:id` | `GET /admin/jobs/new` (wizard) | `POST /admin/jobs/:id/delete` |
| Invoices | `GET /admin/invoices` | `GET /admin/invoices/:id` | `GET/POST /admin/invoices/new` | `POST /admin/invoices/:id/delete` |
| Recurring | `GET /admin/recurring` | `GET /admin/recurring/:id/edit` | `GET/POST /admin/recurring/new` | `POST /admin/recurring/:id/delete` |
| Inbox (SMS) | `GET /admin/inbox` | `GET /admin/inbox/:id` | — | `POST /admin/inbox/:id/delete` |
| Coupons | `GET /admin/coupons` | `GET /admin/coupons/:id/edit` | `GET/POST /admin/coupons/new` | `POST /admin/coupons/:id/delete` |
| Webhooks | `GET /admin/webhooks` | `GET /admin/webhooks/:id/edit` | `GET/POST /admin/webhooks/new` | `POST /admin/webhooks/:id/delete` |
| Branding | `GET /admin/branding` | — | — | — |
| SMS Settings | `GET /admin/sms-settings` | — | — | — |
| Push Settings | `GET /admin/push-settings` | — | — | — |
| Settings (KV) | `GET /admin/settings` | `GET /admin/settings/:key/edit` | `GET/POST /admin/settings/new` | `POST /admin/settings/:key/delete` |

**Notable admin-specific endpoints:**

| Method | Path | Notes |
|--------|------|-------|
| POST | `/admin/jobs/quick-create` | One-step job creation from form |
| POST | `/admin/jobs/wizard/step1-address` | Multi-step job wizard (address → service → time → confirm) |
| POST | `/admin/jobs/:id/status` | Status transitions + SMS notifications |
| POST | `/admin/jobs/:id/line-items/add` | HTMX line item management |
| POST | `/admin/jobs/:id/notes/add` | Add note (text or from SMS task) |
| POST | `/admin/inbox/:id/sms-reply` | Send SMS reply from inbox |
| POST | `/admin/inbox/:id/sms-task` | Create task from SMS message |
| POST | `/admin/customers/import` | Bulk CSV import |
| GET | `/admin/api/customers/search` | HTMX customer search (autocomplete) |
| GET | `/admin/api/address/search` | HTMX address search (Mapbox proxy) |
| POST | `/admin/push/subscribe` | Register push notification subscription |
| POST | `/admin/push/test` | Send test push notification |

### Infrastructure Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` | Public | `{ status: "ok", timestamp: "..." }` |
| GET | `/fonts/*` | Public | Static font assets via ASSETS binding |
| GET | `/images/*` | Public | Static image assets via ASSETS binding |
| GET | `/admin.js` | Public | Admin panel JavaScript |
| GET | `/admin.webmanifest` | Public | PWA manifest |
| GET | `/admin-sw.js` | Public | Service worker |

## Authentication

Two auth mechanisms (checked in order):

1. **Cloudflare Access JWT** — `CF-Access-JWT-Assertion` header or `Bearer` token. Validated against CF Access JWKS endpoint. Used by admin dashboard.
2. **API Key** — `Bearer` token with SHA-256 hash verified against `api_keys` table. Used for programmatic access.

### Public Paths (no auth required)
- `/health`, `/widget/*`, `/fonts/*`, `/images/*`
- `/v1/scheduling/service_area_check`, `/v1/scheduling/timeslots`
- `/v1/services`, `/v1/coupons/validate`, `/v1/bookings/create`
- `/v1/messages/submit`, `/webhooks/twilio/*`

## Cron Jobs

| Schedule | Handler | Purpose |
|----------|---------|---------|
| `0 13 * * *` (1PM UTC / 8AM ET) | `sendReminders()` | SMS reminders for today's and tomorrow's jobs |

## External Integrations

| Service | Used For | Config Location |
|---------|----------|-----------------|
| Twilio | SMS send/receive | `settings` table (`twilio_*` keys) |
| Mapbox | Address geocoding in widget | `MAPBOX_ACCESS_TOKEN` env var |
| Cloudflare Access | Admin authentication | `CF_ACCESS_TEAM_DOMAIN` in wrangler.toml |

## Deployment Flow

```
Code change
  │
  ├─ themes/**, content/**, hugo.toml, static/**
  │   └─► git push main → Cloudflare Pages auto-build
  │
  ├─ api/src/**, api/wrangler.toml
  │   └─► cd api && npx wrangler deploy
  │
  └─ migrations/**
      └─► cd api && npx wrangler d1 migrations apply goatkit --remote
```

**Rule**: If both changed, deploy API first, then Pages.

See `.deployment/DEPLOYMENT.md` for detailed deployment instructions (gitignored, contains secrets).
