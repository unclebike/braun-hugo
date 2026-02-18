# zenbooker-api (recovered)

This folder is a recovery baseline for the currently deployed Cloudflare Worker `zenbooker-api`.

What it contains:
- `index.js`: downloaded from the Cloudflare Workers Scripts API (bundled output)
- `wrangler.toml`: reconstructed from Cloudflare Worker settings + route + D1 binding
- `.dev.vars.example`: placeholders for required secrets (Cloudflare cannot export secret values)

Run locally:

```bash
cp .dev.vars.example .dev.vars
npx wrangler dev --cwd recovered/zenbooker-api
```

Export remote D1 (optional):

```bash
# schema only
npx wrangler d1 export zenbooker --remote --no-data --output recovered/zenbooker-api/zenbooker.schema.sql

# schema + data
npx wrangler d1 export zenbooker --remote --output recovered/zenbooker-api/zenbooker.full.sql
```
