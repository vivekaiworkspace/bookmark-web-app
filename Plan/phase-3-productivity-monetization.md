---
name: Phase 3 Productivity and Monetization
overview: "Phase 3 from the PRD (weeks 7–8): Stripe Pro gating, Resend + Web Push notifications, reminders / Read Today, and pgvector semantic search."
todos:
  - id: stripe
    content: Stripe billing, customer portal, Free vs Pro feature gates (collections, tags, AI, digests, semantic search)
    status: completed
  - id: reminders
    content: reminders table, datetime picker, Read Today queue, mark complete/dismiss
    status: completed
  - id: notify
    content: Resend transactional emails and Web Push for reminders and digest delivery
    status: completed
  - id: embeddings
    content: pgvector embeddings on saved content and natural-language semantic search / link Q&A
    status: completed
  - id: docs
    content: Update documentation/ for reminders, Read Today, notifications, billing, and semantic search
    status: completed
---

# Smart Bookmark Manager — Phase 3 Productivity, monetization, polish

**Status: implemented on `cursor/phase-3-productivity-monetization`.**  
PRD Phase 3 (weeks 7–8).

## Goals

- **Stripe** — customer portal; Free vs Pro from the PRD matrix
- **Reminders** — date/time on a link; **Read Today** queue; complete / dismiss
- **Notifications** — Resend email + Web Push for due reminders and digest delivery
- **Semantic search** — `vector` extension, `links.embedding vector(1536)`, embed on scrape; natural-language search (Pro)

## Free vs Pro (from PRD)

| Feature | Free | Pro |
| :--- | :--- | :--- |
| Collections | Up to 3 | Unlimited |
| Global tags | Up to 10 | Unlimited |
| Ingestion | Manual tagging | AI auto-tag (built in Phase 2) |
| Notes / reminders | Notes only | Notes + scheduled reminders + push |
| AI digest | 1 batch / week | Daily + custom prompts |
| Search | Keyword | Semantic (`pgvector`) |

Phase 1 already enforces 3 collections / 10 tags in the UI. Phase 3 should read plan from Stripe and lift those caps for Pro.

## Schema (new migration after Phase 2)

- `reminders` — PRD columns: `link_id`, `user_id`, `remind_at`, `is_triggered`, `status` (`pending` | `completed` | `dismissed`); RLS
- `links.embedding vector(1536)` + match RPC for similarity search
- Optional `profiles.plan` (`free` | `pro`) synced from Stripe webhooks

## Out of scope

Chrome Web Store listing, FastAPI scrape (Phase 2), new collection/tag CRUD (Phase 1).

## Verification

- Upgrade/downgrade via Stripe portal changes limits immediately
- Reminder appears in Read Today at `remind_at`; email/push fire once
- Semantic query returns relevant links Pro-only; Free still has keyword search
- **Docs:** update [`documentation/`](../documentation/) for billing, reminders, notifications, and semantic search before calling Phase 3 done
