---
name: Phase 2 AI Microservice
overview: "Phase 2 from the PRD: FastAPI AI service, Trafilatura/Readability/Playwright scrape, Redis+Celery jobs, LLM auto-tag, scheduled digests via pg_cron, and web UI for summaries and prompt overrides."
todos:
  - id: schema
    content: Add ai_summaries, user_ai_settings, scrape/auto-tag status, suggested tags columns; RLS; keep embeddings for Phase 3
    status: pending
  - id: fastapi
    content: Scaffold FastAPI service with extract, auto-tag, and digest endpoints plus service-role DB writes
    status: pending
  - id: scrape
    content: Trafilatura + Readability scrape, Playwright fallback, tiktoken cap 4k–6k, persist content_raw
    status: pending
  - id: queue
    content: Redis + Celery workers; Next.js POSTs FastAPI to enqueue; extension via DB webhook; pg_cron digest trigger
    status: pending
  - id: llm
    content: LLM auto-tag against existing tags (suggest up to 3 new) and collection routing
    status: pending
  - id: digest
    content: Daily/weekly digest worker, custom prompt override, write ai_summaries
    status: pending
  - id: web-ui
    content: Enqueue jobs on save, show suggested tags, digest list/detail, prompt settings
    status: pending
  - id: docs
    content: Update documentation/ for AI tags, digests, prompt settings, and troubleshooting
    status: pending
---

# Smart Bookmark Manager — Phase 2 AI microservice

**Status: implemented in repo (run docker compose + env).**  
**Depends on:** [Phase 1](phase-1-mvp.md) merged to `main` ([PR #1](https://github.com/vivekaiworkspace/bookmark-web-app/pull/1)).

PRD Phase 2 (weeks 4–6): FastAPI on Fly.io / Railway / ECS; scrape pipeline; LLM auto-tag + scheduled digests via `pg_cron` and Celery/Redis.

**Still later:** [Phase 3](phase-3-productivity-monetization.md) — Stripe, Resend/Web Push, `pgvector` semantic search.

## Current baseline (do not redo)

- Next.js 16 app + extension + Supabase (`xpfkucssbdybylfcdqis`)
- Lightweight [`src/app/api/extract-meta/route.ts`](../src/app/api/extract-meta/route.ts) (title/OG/favicon only)
- `links.content_raw` exists but is unused
- No `ai_summaries`, no queue, no Python service

## Architecture

```mermaid
flowchart LR
  Web[Next.js app] -->|save link| DB[(Supabase Postgres)]
  Web -->|enqueue job| Redis
  Cron[pg_cron] -->|digest webhook| API[FastAPI]
  Redis --> Celery[Celery workers]
  Celery --> API
  API --> Scrape[Trafilatura Readability Playwright]
  API --> LLM[LLM auto-tag and digest]
  API --> DB
```

Same stack, enqueue path made explicit (Next.js never opens Redis; workers do not HTTP back to FastAPI):

```mermaid
flowchart LR
  Web[Next.js save] -->|POST enqueue| FastAPI
  Ext[Extension save] -->|DB insert only| Postgres
  FastAPI -->|Celery| Redis
  Workers[Celery workers] --> ScrapeLLM
  ScrapeLLM --> Postgres
  Cron[pg_cron] -->|POST digest| FastAPI
```

- **Queue:** Redis + Celery (PRD). Jobs: `extract_content`, `auto_tag`, `digest`.
- **Auth to FastAPI:** shared service secret for Next.js/pg_cron; FastAPI uses Supabase **service role** only for job writes, always scoped by `user_id` from the job payload.
- **Deploy:** FastAPI + Redis + worker as containers (Railway or Fly.io). Next.js stays as-is.
- **How enqueue actually works (same stack, not a new design):** Next.js does not open Redis. After a save, a Next.js API route (cookie session) POSTs FastAPI with `AI_SERVICE_SECRET`. FastAPI enqueues Celery. Workers run scrape/LLM in the same `services/ai/` package (no HTTP hop back to FastAPI). Extension saves only hit Postgres today — cover them with a DB webhook/trigger (or poll `pending` rows), not by teaching the extension Redis/FastAPI URLs. See [Implementation notes](#implementation-notes-do-not-change-scope).

## Schema ([`supabase/migrations/002_phase2.sql`](../supabase/migrations/002_phase2.sql))

Add (from PRD, plus settings Phase 1 omitted):

- `ai_summaries` — `user_id`, `collection_id`, `content`, `prompt_used`, `generated_at`; RLS
- `user_ai_settings` — `user_id` PK, `prompt_override text`, `digest_frequency` (`off` | `weekly` | `daily`), `updated_at`
- `links.content_raw` already present; add `links.scrape_status` (`pending` | `ready` | `failed`) and `links.auto_tag_status`
- Skip `embedding` / `vector` until Phase 3
- **Also needed for the planned UI (apply/dismiss tags):** `links.suggested_tag_names`, optional `links.suggested_collection_id`, optional `links.scrape_error`; default new rows to `pending`. Details below.

Enable `pg_cron` (or a Supabase scheduled function) to POST digest jobs for users with frequency != `off`.

## FastAPI (`services/ai/`)

- `POST /api/v1/extract` — Trafilatura → Mozilla Readability → Playwright for SPAs; parse title/OG/favicon; tiktoken truncate 4,000–6,000; write `content_raw`
- `POST /api/v1/auto-tag` — structured LLM output: existing tags to apply, up to 3 new tag names, optional collection id; honor free-tier tag cap (10) when inserting
- Digest worker — links from the last period (`created_at`; Phase 1 has no unread flag), custom prompt if set, persist markdown on `ai_summaries`

Keep Next.js `/api/extract-meta` for fast card save; Celery extract enriches `content_raw` in the background.

## Web app

- After insert/upsert link, enqueue extract + auto-tag (do not block the save UI). Web save: Next.js → FastAPI → Celery. Extension save: same jobs via DB webhook/trigger or pending-row poll.
- Card/detail: show scrape/tag status; apply or dismiss suggested tags
- Settings: custom digest/system prompt; daily vs weekly vs off
- Digests page: list `ai_summaries`, open markdown
- AI auto-tag is Pro in the PRD; **ship for all users in Phase 2**, gate with Stripe in Phase 3

## Env

- Next.js: `AI_SERVICE_URL`, `AI_SERVICE_SECRET`
- FastAPI: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`, `OPENAI_API_KEY` (or chosen LLM), `AI_SERVICE_SECRET`

## Out of scope

Stripe, reminders, Resend, Web Push, `pgvector` Q&A, Chrome store packaging.

## Verification

- Save a link → `content_raw` fills, tags suggested
- Custom prompt changes digest wording
- Weekly/daily cron creates an `ai_summaries` row
- RLS: user A cannot read user B summaries
- Extension save also gets `content_raw` and suggested tags
- Auto-tag does not exceed the 10-tag cap
- Private/loopback scrape URLs are rejected
- **Docs:** update [`documentation/`](../documentation/) (workspace, limits, troubleshooting) for auto-tag, digests, and prompt settings before calling Phase 2 done

## Implementation notes (do not change scope)

These close gaps in the Phase 1 app so the plan above can ship. Stack, jobs, tables, and product remain the same.

### Enqueue and workers

- Browser never holds `AI_SERVICE_SECRET`. Next.js server route authenticates the user, then POSTs FastAPI.
- FastAPI `POST /api/v1/jobs` (or extract + auto-tag) validates the secret and enqueues Redis/Celery.
- Celery workers import scrape/LLM from `services/ai/` directly. The architecture diagram’s `Celery --> API` line means “workers use the FastAPI service codebase,” not a second HTTP call.
- On upsert of the same `(user_id, url)`: re-run extract/auto-tag only if status is `failed` or `content_raw` is empty; skip if already `ready`.

### Extension

[`extension/background.js`](../extension/background.js) upserts `links` via REST and never sees Redis. Preferred: `pg_net` / trigger on `links` INSERT (and qualifying UPDATE) POSTs FastAPI. Fallback: worker polls `scrape_status = pending`. Do not add FastAPI URLs to the extension.

### Schema extras (same migration `002_phase2.sql`)

- `links.suggested_tag_names text[]` (or jsonb) — LLM names not yet applied; clear on apply or dismiss.
- `links.suggested_collection_id` — **suggest** a move; user confirms in the UI. Do not auto-move out of Inbox.
- `links.scrape_error text` — short failure reason for the card.
- New links: `scrape_status` and `auto_tag_status` default `pending`.
- `user_ai_settings`: insert on first Settings visit, or default row (frequency `weekly`) via trigger. Check constraint on `digest_frequency`.
- `ai_summaries.collection_id` nullable — **one digest per user per period** (all collections). Index `(user_id, generated_at desc)`.
- Digest window: daily = `created_at` last 24h; weekly = last 7d. Cron timezone UTC unless `digest_timezone` is added (default UTC).
- RLS on `ai_summaries` and `user_ai_settings`: `user_id = auth.uid()`. Service role bypasses RLS; workers always filter by job `user_id` and load the link row rather than trusting a client-supplied user.

### Scrape safety and local run

- Block private/loopback IPs and non-http(s) URLs (SSRF). Timeout and response size cap in addition to tiktoken 4,000–6,000.
- Playwright only when Trafilatura + Readability yield too little text; worker needs enough RAM.
- Celery retries with backoff; idempotent by `link_id`.
- Default LLM: OpenAI structured JSON; `OPENAI_API_KEY` stays swappable. At the 10-tag cap, attach existing tags only.
- Local: docker-compose for Redis + FastAPI + worker. Railway/Fly remains the deploy step (step 7 in the master plan).

### Cron

Enable `pg_cron` and `pg_net` in the Supabase dashboard. Schedule a job that selects `user_ai_settings` where `digest_frequency != 'off'` and POSTs FastAPI (`AI_SERVICE_SECRET`). If `pg_cron` is unavailable on the project, use a scheduled Edge Function with the same contract.

### Web UI

- Do not block save. Poll the link row or use Supabase Realtime for status.
- Card/detail: pending / ready / failed; apply/dismiss suggested tags; optional “Move to {collection}?”
- Settings and Digests routes under `src/app/`; extend [`src/lib/types.ts`](../src/lib/types.ts).
