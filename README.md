# Smart Bookmark Manager

**New here?** Read the [user guide](documentation/README.md) (getting started, sign-in, workspace, extension).

Phase 1 MVP is **complete**. Phase 2 (AI scrape, auto-tag, digests) is **in the repo**.

Full roadmap: [Plan/MASTER_PLAN.md](Plan/MASTER_PLAN.md).

## What you can do

- Sign in with **email/password** or **Google**
- Organize links in **collections** (Inbox is created on first login) and **global tags**
- Save links from the web app (metadata scrape) or from the **extension** (current tab)
- Notes, favorites, keyword search, AND/OR tag filters, sort by newest / last opened / favorites
- Background content extract, **suggested tags**, digest list, and custom digest prompt

Free-tier gates (no billing yet): **3 collections**, **10 tags**. AI features are on for everyone until Phase 3.

## Project layout

```
src/app/             Web app (login, workspace, settings, digests, extract-meta, AI enqueue)
src/components/      UI and workspace features
src/lib/supabase/    Supabase browser/server clients + session proxy
supabase/migrations  Phase 1 + Phase 2 SQL
services/ai          FastAPI + Celery workers
extension/           Unpacked Chrome/Edge/Brave extension
docker-compose.yml   Redis + API + worker
```

Live Supabase project: **Smart Bookmark Manager** (`xpfkucssbdybylfcdqis`).

## Run the web app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Env files:

- [`.env.example`](.env.example) — template (`AI_SERVICE_URL`, `AI_SERVICE_SECRET`)
- `.env.local` — local keys (gitignored)
- [`services/ai/.env.example`](services/ai/.env.example) — Python service
- [`extension/config.js`](extension/config.js) — same URL and anon key for the extension

Set `NEXT_PUBLIC_GOOGLE_AUTH=true` to show **Continue with Google**.

### AI service (Phase 2)

1. Copy `services/ai/.env.example` to `services/ai/.env`.
2. Set `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Settings → API) and optional `OPENAI_API_KEY`.
3. Use the same `AI_SERVICE_SECRET` as `.env.local`.
4. Start Redis, API, and worker:

```bash
docker compose up --build
```

API: [http://localhost:8000/health](http://localhost:8000/health). Without this stack, bookmarks still save; scrape/tag/digest stay pending.

`pg_cron` to call `/api/v1/jobs` with `{"type":"digest_tick"}` is optional once the API is on a public URL. Locally, Celery beat polls pending links (including extension saves) and runs digest ticks hourly (UTC).

### Auth dashboard (already used for this project)

- [URL configuration](https://supabase.com/dashboard/project/xpfkucssbdybylfcdqis/auth/url-configuration)  
  Site URL: `http://localhost:3000`  
  Redirect URL: `http://localhost:3000/auth/callback`
- [Email provider](https://supabase.com/dashboard/project/xpfkucssbdybylfcdqis/auth/providers) — turn **Confirm email** off for local testing, or confirm users before sign-in
- [Google provider](https://supabase.com/dashboard/project/xpfkucssbdybylfcdqis/auth/providers) — Client ID + **Client secret** from Google Cloud  
  Google authorized redirect URI: `https://xpfkucssbdybylfcdqis.supabase.co/auth/v1/callback`

Schema: [`supabase/migrations/001_phase1.sql`](supabase/migrations/001_phase1.sql) and [`supabase/migrations/002_phase2.sql`](supabase/migrations/002_phase2.sql) (applied on the remote project).

## Test the extension

1. Keep `npm run dev` running.
2. Chrome / Edge / Brave → `chrome://extensions` → **Developer mode** → **Load unpacked** → select the `extension/` folder.
3. Pin **Smart Bookmark Manager**, click it → **Sign in**.
4. After login, the `/extension-auth` page tries to send the session to the extension. If it says connected, close the tab and open the popup again. If not, copy the session JSON from that page into the popup and click **Store session**.
5. Open a normal website (not `chrome://`), save the current tab, then refresh the web app to see the link.

Reload the extension on `chrome://extensions` after changing files under `extension/`.
