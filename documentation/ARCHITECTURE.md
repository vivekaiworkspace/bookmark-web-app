# Architecture

Smart Bookmark Manager is three apps plus shared Postgres. Do not mix stacks: no Python in `web/`, no Next.js routes in `backend/`, no service-role keys in the extension.

## Layout

| Path | Role |
| :--- | :--- |
| `web/` | Next.js 16 App Router, React 19, Tailwind, Shadcn UI, auth cookies, billing, enqueue to FastAPI |
| `backend/` | FastAPI + Celery (scrape, auto-tag, embeddings, digest) |
| `extension/` | Chrome Manifest V3 popup + service worker (save current tab) |
| `supabase/migrations/` | Schema and RLS (source of truth in git) |
| `Plan/` | Master plan and phase notes |
| `Requirments/Smart_Bookmark_Manager_Master_PRD.md` | Product + original DDL |
| `documentation/` | User guides, this runbook, implementation log |

## Data flow

1. Extension and web write bookmarks through **Supabase Auth + RLS**.
2. After a web save, Next.js `POST`s FastAPI with `AI_SERVICE_SECRET` (`/api/ai/enqueue` → `/api/v1/jobs`).
3. FastAPI enqueues Celery. Workers use the **service role**, always filtered by job `user_id`.
4. The extension never talks to Redis or FastAPI. Pending extension saves are picked up by the Celery beat poller.

```
[Extension / Next.js]
        │  Auth + RLS
        ▼
[Supabase Postgres]
        │
        │  Next.js enqueue (secret header)
        ▼
[FastAPI :8000] ──► Redis ──► Celery workers ──► service-role writes
```

## Local run

- Web: `cd web && npm run dev` (port 3000)
- Redis + FastAPI + worker: `docker compose up` from the repo root (API port 8000)

## Auth clients

Use `@supabase/ssr` with `getAll` / `setAll` cookie handlers. Server code validates with `supabase.auth.getUser()`, not `getSession()`.
