---
name: Phase 1 Bookmark MVP
overview: "Phase 1 is complete and merged to main (PR #1). Next.js web app + Manifest V3 extension on the Smart Bookmark Manager Supabase project."
todos:
  - id: scaffold
    content: Scaffold Next.js + Tailwind + shadcn, env example, folder layout
    status: completed
  - id: supabase
    content: Write Phase 1 SQL migration (tables, extra columns, RLS) and Supabase client helpers
    status: completed
  - id: auth
    content: Email + Google auth pages, middleware, first-login Inbox collection
    status: completed
  - id: web-core
    content: Collections, tags, links CRUD, cards, notes, search, AND/OR filters, sort
    status: completed
  - id: meta-api
    content: Next.js /api/extract-meta for title/OG/favicon on save
    status: completed
  - id: extension
    content: Manifest V3 popup, session handoff, one-click save with collection pre-select
    status: completed
  - id: docs
    content: Update documentation/ user guides for everything this phase shipped
    status: completed
---

# Smart Bookmark Manager — Phase 1 MVP

**Status: completed and merged (2026-08-15).**  
PR: [vivekaiworkspace/bookmark-web-app#1](https://github.com/vivekaiworkspace/bookmark-web-app/pull/1) → `main`.

Implemented **Phase 1 only** from the PRD: core web app + unpacked Manifest V3 extension.

**Next:** [Phase 2 — AI microservice and queues](phase-2-ai-microservice.md)

## What shipped

- Next.js App Router (v16) + TypeScript + Tailwind + shadcn-style UI (`src/app`, `src/components`)
- Supabase project **Smart Bookmark Manager** (`xpfkucssbdybylfcdqis`): schema, RLS, `ensure_inbox`
- Email/password + Google OAuth
- Collections, global tags, link cards, notes, keyword search, AND/OR tag filters, sort
- `POST /api/extract-meta` for title / OG image / favicon (lightweight; not the FastAPI scraper)
- Manifest V3 extension in `extension/`

Auth session refresh uses Next.js 16 `src/proxy.ts`.

## Stack (as built)

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS + shadcn-style UI
- **Supabase**: Auth (email + Google), PostgreSQL, RLS
- **Chrome/Edge/Brave Manifest V3** extension

Connected project URL: `https://xpfkucssbdybylfcdqis.supabase.co`.

## Schema

Shipped in [`supabase/migrations/001_phase1.sql`](../supabase/migrations/001_phase1.sql):

- `collections`, `tags`, `links`, `link_tags`, `notes` + RLS
- `collections.sort_order`, `links.last_accessed_at`, `links.updated_at`
- Unique `(user_id, url)` on `links`
- `ensure_inbox` RPC

Skipped (later phases): `reminders`, `ai_summaries`, `vector` / embeddings.

## Verification (done)

- Migration on the live Supabase project
- Email and Google sign-in
- Workspace CRUD, filters, extension save
- User guides in [`documentation/`](../documentation/) (getting started, sign-in, workspace, extension, limits, troubleshooting)

**Required at end of every phase:** update [`documentation/`](../documentation/) so new users can use the new features without reading the engineering plan.

## Out of scope (moved to Phase 2+)

AI auto-tag, digest engine, custom prompts, Celery/Redis, Playwright scraper, Resend/Web Push, Stripe, semantic search.
