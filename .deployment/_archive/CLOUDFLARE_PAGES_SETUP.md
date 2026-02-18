# Cloudflare Pages Setup (Project Bootstrap)

Use this once when creating the Pages project. For day-to-day deploy commands, use `DEPLOYMENT.md`.

## Create the project

1. Open Cloudflare Dashboard -> Workers & Pages -> Create Application -> Pages.
2. Connect GitHub repo: `unclebike/braun-hugo`.
3. Configure:
   - Project name: `theme-unclebike-xyz`
   - Production branch: `main`
   - Build command: `npm install -g hugo && hugo --minify && npx pagefind --site public`
   - Build output directory: `public`

## Environment variables

Add to Production:

- `HUGO_ENV=production`
- `NODE_ENV=production`
- `HUGO_VERSION=0.121.0` (optional)

## First deploy

Click Save and Deploy. Confirm the deployment succeeds and site is available at:

- `https://theme-unclebike-xyz.pages.dev`

## Domain setup

Choose one production domain and use it consistently across all docs.

For subdomain setup:

- Type: `CNAME`
- Host: `<your-subdomain>`
- Value: `theme-unclebike-xyz.pages.dev`

For apex/root domain setup:

- Use the DNS records Cloudflare Pages provides in the Domains UI.

## Operational note

- Git push to `main` is the preferred production deploy path.
- Manual CLI deploy is supported for urgent local deploys (see `DEPLOYMENT.md`).
