# DEPLOYMENT.md Template

This is a **template** showing what your local `.deployment/DEPLOYMENT.md` should contain.

To use:
1. Copy this file to `.deployment/DEPLOYMENT.md`
2. Fill in `CLOUDFLARE_API_TOKEN` with your actual token
3. `.deployment/DEPLOYMENT.md` is gitignored — never commit secrets

---

# Deployment Guide

Complete reference for deploying GOATkit (braun-hugo + API worker).

## Prerequisites

### Environment Variables

```bash
# Get from Cloudflare dashboard: https://dash.cloudflare.com/profile/api-tokens
export CLOUDFLARE_API_TOKEN="your-actual-token-here"
```

### Project Configuration

| Target | Project Name | Domain |
|--------|-------------|--------|
| **Pages** | `braun-hugo` | `braun-hugo.pages.dev` |
| **Worker** | `goatkit-api` | `api.unclebike.xyz` |

---

## Quick Deploy

### API Worker (if changed `api/**`)

```bash
cd api
CLOUDFLARE_API_TOKEN="your-token" npx wrangler deploy
```

### Pages Site (if changed `themes/**`, `content/**`, `hugo.toml`)

**Preferred: Git-driven**
```bash
git push origin main
# Cloudflare auto-deploys
```

**Manual CLI:**
```bash
hugo --minify && npx pagefind --site public
CLOUDFLARE_API_TOKEN="your-token" npm exec --yes wrangler@3.114.17 -- \
  pages deploy public \
  --project-name braun-hugo \
  --branch main \
  --commit-dirty=true
```

---

**For full guide, see the full `.deployment/DEPLOYMENT.md` file (gitignored).**
