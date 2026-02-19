# Agent Rules

Behavioral constraints for any AI agent working in this codebase. Read this before every action.

## The Golden Rules

1. **Don't break what works.** This is a production business tool. The owner relies on it daily.
2. **Minimal changes.** Do the smallest thing that solves the problem. No speculative refactoring.
3. **No new dependencies** without explicit approval. The API has 3 deps. That's intentional.
4. **Never commit secrets.** API tokens, Twilio credentials, Mapbox keys — none of these go in git.

## TypeScript (API Worker)

### Do
- Use `strict: true` TypeScript. The tsconfig enforces it.
- Validate all request input with Zod schemas via `@hono/zod-validator`.
- Store money as integer cents (e.g., `base_price_cents`). Never use floats for money.
- Use Hono JSX (`jsxImportSource: "hono/jsx"`) for admin views. Not React.
- Return proper HTTP status codes (201 for creation, 404 for not found, etc.).
- Use parameterized D1 queries (`.bind()`). Never concatenate SQL strings.

### Don't
- Use `as any`, `@ts-ignore`, or `@ts-expect-error`. Fix the types.
- Add empty catch blocks `catch(e) {}`. At minimum, log the error.
- Import from React. The JSX runtime is Hono's, not React's.
- Use ORMs. D1 queries are written as raw SQL with `.prepare().bind()`.
- Add middleware to `index.ts` without checking auth implications on PUBLIC_PATHS.

## Hugo (Static Site)

### Do
- Use Hugo template syntax (`{{ }}`) in layouts.
- Put new content in the correct section (`content/pages/`, `content/posts/`, etc.).
- Include proper front matter (title, date, draft status) in all content files.
- Test with `hugo server` before pushing. Broken templates break the entire site build.

### Don't
- Modify the theme's README.md as if it were project documentation.
- Add JavaScript to the theme unless absolutely necessary. Hugo is a static site generator.
- Change permalink patterns in `hugo.toml` — they match legacy Ghost URLs.

## Database

- All new tables need a migration file in `migrations/` (sequential numbering: `0011_*.sql`).
- IDs are TEXT UUIDs. Generate with `crypto.randomUUID()`.
- Timestamps are ISO 8601 text strings.
- Booleans are INTEGER 0/1.
- Always include `created_at` and `updated_at` (where applicable).
- Add indexes for columns used in WHERE clauses or JOINs.

## Deployment

- **Never deploy without testing locally first.**
- API changes: `cd api && npx wrangler deploy`. Always from the `api/` directory.
- Site changes: `git push origin main` triggers Cloudflare Pages auto-build.
- If both changed: deploy API first, then push for Pages.
- Database migrations: `cd api && npx wrangler d1 migrations apply goatkit --remote`
- Deployment secrets and detailed steps are in `.deployment/DEPLOYMENT.md`.

## Testing

- No test framework is currently set up. If adding tests, discuss approach first.
- Always verify API changes work by hitting the endpoint after deployment.
- For Hugo changes, run `hugo server` and check the browser.
- For admin views, check on mobile viewport (375px) — the owner uses iPhone.

## Security

- Auth is handled by `api/src/middleware/auth.ts`. Don't bypass it.
- The `PUBLIC_PATHS` array defines unauthenticated routes. Adding to it is a security decision — flag it.
- API keys are SHA-256 hashed. Never store or log plaintext keys.
- Twilio webhook endpoints must remain public (they receive inbound SMS).
- `.deployment/DEPLOYMENT.md` is gitignored because it contains secrets. Keep it that way.

## File Organization

- API route files go in `api/src/routes/`.
- Business logic (SMS, notifications, webhooks) goes in `api/src/services/`.
- Admin dashboard views go in `api/src/views/` as `.tsx` files.
- Static assets served by the worker go in `api/src/assets/`.
- Hugo content goes in `content/{section}/`.
- Theme templates go in `themes/braun-hugo/layouts/`.

## Git

- Commit messages should be descriptive but concise.
- Don't commit generated files (`public/`, `resources/_gen/`, `node_modules/`).
- Don't commit AI context files (already in `.gitignore`).
- The `main` branch is production. Every push triggers a deploy.

## What to Flag

Raise these to the user before proceeding:
- Any change to authentication or PUBLIC_PATHS.
- Adding new npm dependencies.
- Database schema changes (new migrations).
- Changes to `wrangler.toml` (worker config, bindings, cron schedules).
- Anything that changes the public-facing URL structure.

## Keeping Agent Files Current

After completing work, check if your changes affect any of the committed agent files and update them:

| If you changed... | Update... |
|-------------------|-----------|
| API routes (added/removed/renamed endpoints) | `AGENT_ARCHITECTURE.md` → API Endpoints section |
| Database migrations (new tables/columns) | `AGENT_ARCHITECTURE.md` → Database Schema section |
| External integrations (new service, changed config) | `AGENT_ARCHITECTURE.md` → External Integrations section |
| Auth logic or PUBLIC_PATHS | `AGENT_ARCHITECTURE.md` → Authentication section |
| Deployment process or targets | `AGENT_ARCHITECTURE.md` → Deployment Flow section |
| Tech stack (new framework, major library) | `AGENT_README.md` → Tech Stack table |
| Project goals or constraints | `AGENT_README.md` → Goals section |
| Coding conventions or standards | `AGENT_RULES.md` → relevant section |
| New file/directory structure | `AGENT_ARCHITECTURE.md` → Key paths sections |

**Always** update `AGENT_TASKS.md` and `AGENT_MEMORY.md` at the end of every session — mark completed tasks, record discoveries, note anything the next session should know.
