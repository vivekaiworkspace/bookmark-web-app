# Smart Bookmark Manager - Master Product Requirements Document (PRD) & Technical Architecture

## 1. Project Overview & Problem Statement
* **Product Name:** Smart Bookmark Manager (Working Title)
* **Target Audience:** Developers, researchers, knowledge workers, and power users overwhelmed by browser bookmarks.
* **Core Problem:** Browser bookmarks function as static digital archives where saved links are easily forgotten, difficult to retrieve, and rarely revisited due to lack of categorization, context, and active discovery mechanisms.
* **Vision:** A dynamic bookmarking workspace that automates link ingestion, enforces global organization, and uses AI agents to synthesize, auto-categorize, and resurface saved knowledge.

---

## 2. Taxonomy & System Terminology
* **Collections:** Top-level thematic workspaces or project folders (e.g., "AI Research", "System Architecture", "Travel").
* **Global Tags:** Account-wide taxonomy tags shared across all Collections to ensure uniform filtering across the entire workspace.
* **Link Cards:** Visual UI components displaying title aliases, domain badges, favicons, OpenGraph preview images, user notes, and reminders.
* **AI Digest:** Synthesized briefings, summaries, or structured blog-style overviews generated on a configurable schedule from user-selected bookmarks.

---

## 3. Feature Specifications

### A. Organization & Taxonomy
* **Collections Management:** Full CRUD operations with color coding and custom ordering.
* **Account-Level Global Tags:** Tags created in any collection are immediately available globally.
* **Multi-Variable Filtering & Search:** Real-time multi-tag filtering (AND/OR logic), sorting by creation date, last accessed date, and favorite status.

### B. Ingestion & Visual Cards
* **Browser Extension (Manifest V3):** Single-click URL capturing from Chrome, Edge, and Brave with automatic collection pre-selection.
* **Automated Metadata Scraping:** Background workers automatically fetch website favicons, domain names, and OpenGraph preview images.
* **Interactive Link Cards:** Fast access to inline notes, reminder scheduling, favorite toggling, and manual tag adjustments.

### C. AI Processing & Automation
* **AI Auto-Categorization (Pro Tier):** Python microservice parses scraped page content to automatically suggest and assign relevant global tags and collection routing.
* **Automated Digest Engine:** Scheduled generation of daily/weekly executive summaries or long-form digest posts based on queued bookmarks.
* **Custom Prompt Overrides:** Users can configure custom system instructions for the LLM (e.g., "Extract code snippets only" or "Summarize into 3 key bullet points").
* **Semantic Search (`pgvector`):** Vector embeddings generated on saved content to enable natural-language semantic discovery and link Q&A.

### D. Productivity: Contextual Notes & Reminders
* **Contextual Markdown Notes:** Dedicated rich-text note section per card to record user intent and takeaways.
* **Actionable Reminders:** Date/time pickers that elevate due links to a prioritized "Read Today" queue alongside automated desktop and email digest notifications.

---

## 4. System Architecture & Technical Risk Mitigation

### Architecture Diagram
```
[Browser Extension / Web App (Next.js)]
                  │
                  ▼
         [Supabase Platform]
    ├── Auth (Google SSO + Email)
    ├── PostgreSQL (RLS + pgvector)
    └── pg_cron (Scheduled triggers)
                  │ (Async Webhook / Queue)
                  ▼
     [Python FastAPI AI Microservice]
    ├── Task Queue: Redis + Celery / Inngest
    ├── Scraper: Trafilatura + Mozilla Readability + Playwright
    ├── AI Pipeline: LangChain / LlamaIndex + LLM APIs
    └── Notifications: Resend (Email) + Web Push API
```

### Risk Analysis & Mitigation Matrix
| Technical Area | Architectural Decision | Risk Mitigation Strategy |
| :--- | :--- | :--- |
| **Content Scraping Pipeline** | **Trafilatura** + **Mozilla Readability** fallback | Static pages are parsed efficiently via Trafilatura. Dynamic Single-Page Applications (SPAs) are routed through headless **Playwright** workers. |
| **Asynchronous Task Queue** | **Redis + Celery** / **Inngest** | Prevents HTTP gateway timeouts. Supabase `pg_cron` enqueues job events, allowing the FastAPI microservice to process summaries asynchronously and write back to PostgreSQL. |
| **Token Capping & Cost Control** | **TikToken Chunking** | Scraped article text is truncated to 4,000–6,000 tokens before LLM ingestion, preventing context overflow and controlling API costs. |
| **Notification Engine** | **Resend** + **Web Push API** | Scheduled reminders trigger Supabase webhooks to dispatch transactional reminder emails and in-browser push alerts. |

---

## 5. PostgreSQL Database Schema (Supabase DDL & RLS)

```sql
-- Enable Required Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- 1. Collections Table
create table public.collections (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    color text default '#3B82F6',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Global Tags Table
create table public.tags (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    color text default '#6B7280',
    unique (user_id, name)
);

-- 3. Links Table
create table public.links (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    collection_id uuid references public.collections(id) on delete set null,
    url text not null,
    title text not null,
    domain text,
    favicon_url text,
    og_image_url text,
    is_favorite boolean default false,
    content_raw text,
    embedding vector(1536),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Many-to-Many Junction: Link Tags
create table public.link_tags (
    link_id uuid references public.links(id) on delete cascade not null,
    tag_id uuid references public.tags(id) on delete cascade not null,
    primary key (link_id, tag_id)
);

-- 5. Notes Table
create table public.notes (
    id uuid primary key default uuid_generate_v4(),
    link_id uuid references public.links(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    content text,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Reminders Table
create table public.reminders (
    id uuid primary key default uuid_generate_v4(),
    link_id uuid references public.links(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    remind_at timestamp with time zone not null,
    is_triggered boolean default false,
    status text default 'pending' check (status in ('pending', 'completed', 'dismissed'))
);

-- 7. AI Summaries Table
create table public.ai_summaries (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    collection_id uuid references public.collections(id) on delete set null,
    content text not null,
    prompt_used text,
    generated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.collections enable row level security;
alter table public.tags enable row level security;
alter table public.links enable row level security;
alter table public.link_tags enable row level security;
alter table public.notes enable row level security;
alter table public.reminders enable row level security;
alter table public.ai_summaries enable row level security;

-- Strict Isolation Policies
create policy "Users manage own collections" on public.collections for all using (auth.uid() = user_id);
create policy "Users manage own tags" on public.tags for all using (auth.uid() = user_id);
create policy "Users manage own links" on public.links for all using (auth.uid() = user_id);
create policy "Users manage own link_tags" on public.link_tags for all using (
    exists (select 1 from public.links where id = link_tags.link_id and user_id = auth.uid())
);
create policy "Users manage own notes" on public.notes for all using (auth.uid() = user_id);
create policy "Users manage own reminders" on public.reminders for all using (auth.uid() = user_id);
create policy "Users manage own summaries" on public.ai_summaries for all using (auth.uid() = user_id);
```

---

## 6. Microservice API Specifications & AI Pipelines

### A. Ingestion & Metadata Extraction Endpoint
* **Endpoint:** `POST /api/v1/extract`
* **Payload:** `{"url": "https://example.com/article", "user_id": "uuid"}`
* **Pipeline:**
  1. Extract HTML using `Trafilatura` (fallback to headless `Playwright` for SPAs).
  2. Parse metadata (Title, OpenGraph preview image, Favicon).
  3. Extract core text and truncate to 4,000 tokens using `tiktoken`.
  4. Return parsed metadata and clean text payload.

### B. AI Categorization & Auto-Tagging Endpoint
* **Endpoint:** `POST /api/v1/auto-tag`
* **Payload:** `{"content": "clean text...", "existing_tags": ["tag1", "tag2"]}`
* **Pipeline:**
  1. Execute structured prompt via LLM to map content to existing tags or suggest up to 3 new concise tags.
  2. Suggest primary collection based on content taxonomy.

### C. Scheduled AI Digest Worker (Background Task)
* **Trigger:** Supabase `pg_cron` invokes FastAPI webhook.
* **Worker Execution:**
  1. Fetch unread links designated for daily summary.
  2. Assemble multi-document context window.
  3. Apply custom user prompt override if configured.
  4. Persist structured markdown output into `ai_summaries` table.

---

## 7. Monetization & Feature Gating

| Feature Matrix | Free Tier | Pro Tier ($8–$12/month) |
| :--- | :--- | :--- |
| **Collections** | Up to 3 collections | Unlimited |
| **Global Tags** | Up to 10 tags | Unlimited |
| **Ingestion Workflow** | Manual tagging only | AI Auto-Categorization & Tagging |
| **Productivity Tools** | Basic Notes | Notes + Scheduled Reminders & Push Alerts |
| **AI Digest Engine** | 1 summary batch / week | Daily Scheduled Summaries + Custom Prompts |
| **Search Capabilities** | Keyword search | Semantic Vector Search (`pgvector`) |

---

## 8. Phased Development Roadmap

### Phase 1: Core Web & Extension MVP (Weeks 1–3)
* Set up Supabase project with database schema, RLS policies, and Google OAuth / Email Auth.
* Build responsive Next.js web application with Tailwind CSS and Shadcn UI (Collection views, Global Tag filtering, Link CRUD).
* Develop Manifest V3 browser extension for single-click link saving with pre-selected collections.

### Phase 2: AI Microservice & Background Queues (Weeks 4–6)
* Deploy FastAPI microservice on container infrastructure (Fly.io / Railway / AWS ECS).
* Build scraping pipeline using Trafilatura, Mozilla Readability, and OpenGraph extractors.
* Integrate LLM pipeline for AI auto-tagging and scheduled digest generation via `pg_cron` and Celery/Redis queue.

### Phase 3: Productivity, Monetization & Polish (Weeks 7–8)
* Implement Stripe billing integration for customer portal access and Pro tier gating.
* Implement notification dispatch via Resend transactional email digests and the Web Push API.
* Configure `pgvector` embeddings pipeline for natural language semantic search across saved links.
