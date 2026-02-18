# Deployment Runbook

This repository has two separate deployment targets:

1. API Worker (`api/`) -> Cloudflare Workers (`zenbooker-api`)
2. Public site (repo root) -> Cloudflare Pages (`braun-hugo`)

Use the right flow for the files you changed.

## Source of truth

- Pages project: `braun-hugo`
- Pages production branch: `main`
- Pages preview URL: `https://braun-hugo.pages.dev`
- Worker name: `zenbooker-api`
- Worker URL: `https://zenbooker-api.adam-7e5.workers.dev`

If your custom production domain changes, update this file and use the same domain everywhere.

## What to deploy

- Deploy **API Worker** when you change `api/**`.
- Deploy **Pages site** when you change Hugo/theme/static assets at repo root (for example `themes/**`, `static/**`, `content/**`, `hugo.toml`).
- If both areas changed, run both deploys.

## API Worker deploy

Run from `api/`:

```bash
CLOUDFLARE_API_TOKEN=... npx wrangler deploy
```

Expected success signal:

- Output includes `Current Version ID:` and worker URL.

## Pages deploy (preferred)

Preferred production flow is git-driven deploys from `main`:

1. Commit and push to `main`.
2. Cloudflare Pages builds automatically from project settings.
3. Verify in Pages -> Deployments.

Use this when possible for traceability.

## Pages deploy (manual CLI)

Use when you need immediate deployment from local changes.

1) Build locally from repo root:

```bash
hugo --minify && npx pagefind --site public
```

2) Deploy `public/` to Pages:

```bash
CLOUDFLARE_API_TOKEN=... npm exec --yes wrangler@3.114.17 -- pages deploy public --project-name braun-hugo --branch main --commit-dirty=true
```

Notes:

- `--branch main` targets production branch deployment.
- `--commit-dirty=true` is required if working tree is not clean.
- We use explicit `npm exec ... wrangler@3.114.17` because it has been more reliable in this environment than implicit `npx wrangler pages ...`.

## Cloudflare Pages project settings

Set these in Cloudflare Pages UI:

- Production branch: `main`
- Build command: `npm install -g hugo && hugo --minify && npx pagefind --site public`
- Build output directory: `public`

Environment variables:

- `HUGO_ENV=production`
- `NODE_ENV=production`
- `HUGO_VERSION=0.121.0` (optional)

## Domain and DNS

Keep one canonical production site domain and use it consistently across docs.

For a subdomain setup (example only):

- Host: `<your-subdomain>`
- Type: `CNAME`
- Target: `braun-hugo.pages.dev`

If you use apex/root domain, follow Pages-provided DNS records.

## Quick verification checklist

- API deploy:
  - `/admin` loads
  - inbox + SMS thread refresh works
- Pages deploy:
  - site opens
  - latest static assets load
  - PWA assets (`/manifest.webmanifest`, `/sw.js`) are current

## Common pitfalls

- Mixing up API and Pages deploy commands.
- Assuming a local manual Pages deploy is the same as git-driven main deploy.
- Inconsistent domain references across docs.
- Looking for Pages settings in `wrangler.toml` (Pages build settings are in Cloudflare project config and `.pages.yml`).

## Last reviewed

- 2026-02-13
