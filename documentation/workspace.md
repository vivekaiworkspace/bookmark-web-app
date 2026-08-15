# Your workspace

After you sign in, the screen has a **left sidebar** (collections) and a **main area** (your links).

## Collections

A collection is a folder for a topic or project (for example Inbox, Work, Reading).

- **All links** shows every bookmark.
- Click a collection name to show only that collection.
- **Inbox** is created the first time you sign in. New saves often go there unless you pick another collection.

### Create a collection

1. Click the folder-plus button next to **Collections**.
2. Enter a name, pick a color, click **Save**.

You can have **up to 3 collections** on the current free plan. The sidebar shows how many you have used.

### Rename, reorder, or delete

Hover a collection:

- **Up / down arrows** change the order
- **Pencil** edits name and color
- **Trash** deletes the collection. Your links are **not** deleted; they stay in All links (with no collection).

## Save a link (website)

1. Click **Save link** at the top right.
2. Paste a URL (you can omit `https://`).
3. Click **Fetch**. The app fills in a title, site name, and preview image when the page allows it.
4. Edit the title if you want.
5. Choose a **collection**.
6. Optionally click existing **tags** or type a new tag name and click **Add**.
7. Click **Save bookmark**.

If Fetch fails, you can still save: the title may be just the website name.

## Link cards

Each card can show a preview image, favicon, title, site name, tags, and a short note.

- Click the **title** or **image** to open the site in a new tab. That also records “last opened.”
- Click the **star** to mark a favorite (click again to remove).
- Click **Notes & tags** for the full editor.

## Notes and tags on a card

In **Notes & tags** you can:

- **Open** the URL
- **Favorite** / **Unfavorite**
- **Delete** the bookmark (asks for confirmation)
- Move it to another **collection**
- Turn **tags** on or off, or add a new tag
- Write a **note** (plain text; you can use markdown). **Preview** shows it as text. Click **Save note**.

Tags are **global**: a tag you create is available on every collection.

You can have **up to 10 tags** on the current free plan.

## Search, tags filter, and sort

Above the cards:

- **Search** looks in titles, URLs, and notes.
- **Newest / Last opened / Favorites** changes the order.
- Click tag chips to filter. **Tags: AND** means the link must have *all* selected tags. Click the button to switch to **OR** (*any* selected tag).

Click a tag chip again to stop filtering by it.

## What is not in this screen yet

Reminders, email/push notifications, and search by meaning are Phase 3. See [Limits and what’s next](limits-and-whats-next.md).

## AI on a saved link

After you save, the app reads the page in the background (the save itself stays instant).

- **AI: reading page…** on a card means scrape or tagging is still running.
- Open **Notes & tags** to **Apply** or **Dismiss** suggested tags.
- If a collection is suggested, confirm **Move** — the link is not moved automatically.
- Scrape can fail on pages that block bots or private/internal URLs.

## Digests and prompt settings

- **Digests** (top right) lists summaries of links saved in the last day or week. **Run now** creates one immediately.
- **Settings** (top right) sets digest frequency (off / weekly / daily, UTC) and optional instructions for how summaries are written.

The AI worker (`docker compose up`) is only needed for **suggested tags** and filling page text. **Run now** on Digests works from the website alone. If the worker is not running, links still save; suggestions stay empty.
