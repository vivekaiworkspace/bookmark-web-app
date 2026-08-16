# Schema divergence from the master PRD

Source of truth: [Requirments/Smart_Bookmark_Manager_Master_PRD.md](../Requirments/Smart_Bookmark_Manager_Master_PRD.md).

These additions are intentional (ordering, AI jobs, billing) and must stay documented here if they change.

## Extra columns

| Table | Column | Why |
| :--- | :--- | :--- |
| `collections` | `sort_order` | Custom collection ordering (PRD §3.A) |
| `links` | `last_accessed_at`, `updated_at` | Sort by last opened; upsert timestamps |
| `links` | unique `(user_id, url)` | Deduplicate saves |
| `links` | `scrape_status`, `auto_tag_status`, `scrape_error` | Phase 2 job UI |
| `links` | `suggested_tag_names`, `suggested_collection_id` | Confirm AI routing |
| `notes` | unique `link_id` | One note per card |

## Extra tables (not in original PRD DDL)

| Table | Why |
| :--- | :--- |
| `user_ai_settings` | Digest frequency and custom prompt override |
| `profiles` | Stripe plan (`free` \| `pro`) |
| `push_subscriptions` | Web Push endpoints |

Embeddings use `extensions.vector(1536)` and cosine distance (`<=>`) via `match_links`.
