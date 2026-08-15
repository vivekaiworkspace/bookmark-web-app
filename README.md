# Smart Bookmark Manager

Phase 1 MVP is **complete**: a Next.js bookmark workspace and a Manifest V3 browser extension, backed by Supabase.

Later PRD phases (AI auto-tag, digests, Stripe, semantic search, reminders) are not in this repo yet.

## What you can do

- Sign in with **email/password** or **Google**
- Organize links in **collections** (Inbox is created on first login) and **global tags**
- Save links from the web app (metadata scrape) or from the **extension** (current tab)
- Notes, favorites, keyword search, AND/OR tag filters, sort by newest / last opened / favorites

Free-tier gates (no billing yet): **3 collections**, **10 tags**.

## Project layout

```
src/app/             Web app (login, workspace, auth callback, extract-meta API)
src/components/      UI and workspace features
src/lib/supabase/    Supabase browser/server clients + session proxy
supabase/migrations  Phase 1 SQL (already applied on the live project)
extension/           Unpacked Chrome/Edge/Brave extension
```

Live Supabase project: **Smart Bookmark Manager** (`xpfkucssbdybylfcdqis`).

## Run the web app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Env files:

- [`.env.example`](.env.example) — template
- `.env.local` — local keys (gitignored)
- [`extension/config.js`](extension/config.js) — same URL and anon key for the extension

Set `NEXT_PUBLIC_GOOGLE_AUTH=true` to show **Continue with Google**.

### Auth dashboard (already used for this project)

- [URL configuration](https://supabase.com/dashboard/project/xpfkucssbdybylfcdqis/auth/url-configuration)  
  Site URL: `http://localhost:3000`  
  Redirect URL: `http://localhost:3000/auth/callback`
- [Email provider](https://supabase.com/dashboard/project/xpfkucssbdybylfcdqis/auth/providers) — turn **Confirm email** off for local testing, or confirm users before sign-in
- [Google provider](https://supabase.com/dashboard/project/xpfkucssbdybylfcdqis/auth/providers) — Client ID + **Client secret** from Google Cloud  
  Google authorized redirect URI: `https://xpfkucssbdybylfcdqis.supabase.co/auth/v1/callback`

Schema: [`supabase/migrations/001_phase1.sql`](supabase/migrations/001_phase1.sql) (applied on the remote project).

## Test the extension

1. Keep `npm run dev` running.
2. Chrome / Edge / Brave → `chrome://extensions` → **Developer mode** → **Load unpacked** → select the `extension/` folder.
3. Pin **Smart Bookmark Manager**, click it → **Sign in**.
4. After login, the `/extension-auth` page tries to send the session to the extension. If it says connected, close the tab and open the popup again. If not, copy the session JSON from that page into the popup and click **Store session**.
5. Open a normal website (not `chrome://`), save the current tab, then refresh the web app to see the link.

Reload the extension on `chrome://extensions` after changing files under `extension/`.
