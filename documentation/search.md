# Search

## Keyword (everyone)

The search box matches **title, URL, and notes**. Tag chips and **Tags: AND/OR** still filter the grid.

## Semantic (Pro)

Turn on **Semantic**. Queries use meaning (`pgvector`) over scraped page text, not just exact words. Example: “article about Postgres RLS”.

Embeddings are filled after a scrape (AI worker). Links without page text will not appear in semantic results.

## Ask links (Pro)

**Ask links** answers a question using the closest saved bookmarks. Type a question in the search box first, or you will be prompted. The answer cites those links.

Requires `OPENAI_API_KEY` on the web app. Free accounts keep keyword search only.
