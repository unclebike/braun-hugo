# Uncle Bike / GOATkit

## What This Is

A mobile bike repair business platform with two systems:

1. **Public website** — Hugo static site for Uncle Bike (unclebike.xyz). Marketing pages, blog, service listings, booking widget embed.
2. **GOATkit API** — Cloudflare Worker backend powering admin dashboard, job management, customer CRM, invoicing, SMS messaging, and the embeddable booking widget.

The owner is a solo mobile bike mechanic serving the Greater Toronto Area. The software handles his entire business: customers book online, jobs get scheduled, reminders go out via SMS, and he manages everything from a PWA admin panel on his phone.

## Goals

- **Revenue tool, not a tech demo.** Every feature must serve the business. No speculative abstractions.
- **Mobile-first admin.** The admin dashboard is a PWA used primarily on iPhone while on the road.
- **Zero-downtime deploys.** Cloudflare edge deployment means no maintenance windows.
- **Minimal dependencies.** The API has exactly 3 runtime deps: Hono, Zod, @hono/zod-validator. Keep it that way.
- **Single-tenant.** This serves one business. No multi-tenancy, no user management beyond the owner.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Static site | Hugo | Custom `braun-hugo` theme (ported from Ghost) |
| Site hosting | Cloudflare Pages | Auto-deploys from `main` branch |
| API framework | Hono | TypeScript, runs on Cloudflare Workers |
| Database | Cloudflare D1 | SQLite at the edge |
| Auth | Cloudflare Access | JWT verification + API key fallback |
| SMS | Twilio | Inbound/outbound, quiet hours, templates |
| Geocoding | Mapbox | Address search in booking widget |
| Search | Pagefind | Static search index, built at deploy time |
| Validation | Zod | Request validation via @hono/zod-validator |
| Admin views | Hono JSX | Server-rendered HTML, HTMX for interactivity |

## Key URLs

| Environment | URL |
|-------------|-----|
| Production site | https://unclebike.xyz |
| Pages preview | https://braun-hugo.pages.dev |
| API / Admin | https://api.unclebike.xyz/admin |
| Booking widget | https://api.unclebike.xyz/widget/demo |
| Health check | https://api.unclebike.xyz/health |

## What Does Not Change

- Hugo is the static site generator. Not switching to Next.js, Astro, etc.
- Hono is the API framework. Not switching to Express, Fastify, etc.
- Cloudflare is the platform (Pages + Workers + D1). Not migrating to AWS/Vercel.
- The admin dashboard is server-rendered HTML with HTMX. Not a SPA.
- Single tenant. One business, one owner.
