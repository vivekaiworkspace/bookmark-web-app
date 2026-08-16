# Smart Bookmark Manager

**New here?** Read the [user guide](documentation/README.md) (getting started, sign-in, workspace, extension).

Phase 1–3 product work is **implemented**. Current branch: `cursor/rules-compliance-refresh` (Cursor rules, tests, and docs alignment).

Full roadmap: [Plan/MASTER_PLAN.md](Plan/MASTER_PLAN.md). Architecture: [documentation/ARCHITECTURE.md](documentation/ARCHITECTURE.md).

## What you can do

- Sign in with **email/password** or **Google**
- Organize links in **collections** (Inbox is created on first login) and **global tags**
- Save links from the web app (metadata scrape) or from the **extension** (current tab)
- Notes, favorites, keyword search, AND/OR tag filters, sort by newest / last opened / favorites
- Background content extract, **suggested tags** (Pro), digest list, custom digest prompt (Pro)
- **Reminders**, **Read Today**, email/push when configured
- Keyword search for everyone; **semantic search** and **Ask links** on Pro
- **Stripe** Free vs Pro (3 collections / 10 tags on Free)

## Project layout

```
web/                 Next.js app (login, workspace, settings, digests, read-today, billing APIs)
backend/             FastAPI + Celery workers (scrape, tag, embed)
extension/           Unpacked Chrome/Edge/Brave extension
supabase/migrations  Phase 1–3 SQL
docker-compose.yml   Redis + API + worker
```

Live Supabase project: **Smart Bookmark Manager** (`xpfkucssbdybylfcdqis`).

## Run the web app

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If you deploy the web app with Vercel, set the project **Root Directory** to `web`.

Env files:

- [`web/.env.example`](web/.env.example) — template (AI, Stripe, Resend, VAPID, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`)
- `web/.env.local` — local keys (gitignored)
- [`backend/.env.example`](backend/.env.example) — Python service
- [`extension/config.js`](extension/config.js) — same URL and anon key for the extension

Set `NEXT_PUBLIC_GOOGLE_AUTH=true` to show **Continue with Google**.

### AI (Phase 2)

**Digests (no Docker):** add optional `OPENAI_API_KEY` to `web/.env.local`. Open **Digests** → **Run now**. Without that key you still get a markdown list of recent links.

**Background scrape and auto-tag** need the Python stack:

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Settings → API) and `OPENAI_API_KEY`.
3. Use the same `AI_SERVICE_SECRET` as `web/.env.local`.
4. Start Redis, API, and worker:

```bash
docker compose up --build
```

API: [http://localhost:8000/health](http://localhost:8000/health). Without this stack, bookmarks still save; suggested tags stay empty until a worker runs.

`pg_cron` to call `/api/v1/jobs` with `{"type":"digest_tick"}` is optional once the API is on a public URL. Locally, Celery beat polls pending links (including extension saves), runs digest ticks hourly (UTC), and POSTs `/api/cron/notify` every five minutes when `CRON_SECRET` matches the Next.js app.

### Phase 3 (billing, reminders, search)

Copy new keys from `web/.env.example` into `web/.env.local`:

- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`. Forward webhooks with `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
- Email: `RESEND_API_KEY`, `RESEND_FROM`.
- Push: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`npx web-push generate-vapid-keys`).
- Notify cron: `CRON_SECRET` (same value in `backend/.env` as `CRON_SECRET`) and `SUPABASE_SERVICE_ROLE_KEY` for webhook/plan writes.

Schema: [`supabase/migrations/001_phase1.sql`](supabase/migrations/001_phase1.sql), [`002_phase2.sql`](supabase/migrations/002_phase2.sql), and [`003_phase3.sql`](supabase/migrations/003_phase3.sql) (applied on the remote project).

### Auth dashboard (already used for this project)

- [URL configuration](https://supabase.com/dashboard/project/xpfkucssbdybylfcdqis/auth/url-configuration)  
  Site URL: `http://localhost:3000`  
  Redirect URL: `http://localhost:3000/auth/callback`
- [Email provider](https://supabase.com/dashboard/project/xpfkucssbdybylfcdqis/auth/providers) — turn **Confirm email** off for local testing, or confirm users before sign-in
- [Google provider](https://supabase.com/dashboard/project/xpfkucssbdybylfcdqis/auth/providers) — Client ID + **Client secret** from Google Cloud  
  Google authorized redirect URI: `https://xpfkucssbdybylfcdqis.supabase.co/auth/v1/callback`

## Test the extension

1. Keep `npm run dev` running from `web/`.
2. Chrome / Edge / Brave → `chrome://extensions` → **Developer mode** → **Load unpacked** → select the `extension/` folder.
3. Pin **Smart Bookmark Manager**, click it → **Sign in**.
4. After login, the `/extension-auth` page tries to send the session to the extension. If it says connected, close the tab and open the popup again. If not, copy the session JSON from that page into the popup and click **Store session**.
5. Open a normal website (not `chrome://`), save the current tab, then refresh the web app to see the link.

Reload the extension on `chrome://extensions` after changing files under `extension/`.
