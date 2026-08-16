# Browser extension

The extension saves **the page you are looking at** into your Smart Bookmark Manager account, without copying the URL by hand.

It works in **Chrome**, **Edge**, and **Brave**. The website must be running (for local use: [http://localhost:3000](http://localhost:3000) with `npm run dev` from `web/`).

## Install (unpacked)

The extension is not in the Chrome Web Store yet. You load it from this project.

1. Keep the web app running.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the project’s `extension` folder.
6. Pin **Smart Bookmark Manager** on the toolbar.

After someone changes files in `extension`, click **Reload** on that card on the extensions page.

## Connect your account (once)

The popup cannot show Google/email by itself. It uses the website, then copies your login into the extension.

1. Click the extension icon.
2. Click **Sign in**. A tab opens at the web app login.
3. Sign in as usual.
4. You should see **Connect the browser extension**.

**If it says the extension is connected:** close that tab. Click the extension icon again. You should see a collection list and **Save current tab**.

**If it does not say connected:** the page shows a block of text (session JSON). That is your login token, not a bookmark.

1. Click **Copy session**.
2. Open the extension popup.
3. Paste into **Paste session JSON**.
4. Click **Store session**.

You only do this until you sign out of the extension or the login expires.

Saves from the extension still get background scrape and suggested tags **when the AI worker is running** (it polls new rows). You apply or dismiss tags in the website. Digests use **Run now** on the website and do not need the extension.

## Save the current tab

1. Open a normal website. Do **not** use `chrome://` or `edge://` pages — those often cannot be saved.
2. Click the extension.
3. Check the **title** (you can edit it).
4. Choose a **collection** (the last one you used is remembered).
5. Click **Save current tab**. You should see **Saved.**

Refresh the web app. The link should appear in that collection.

If the popup still says **Sign in**, complete the connect step above.

## Privacy note

Session JSON is a login token. Do not paste it in chat or email. Store it only in the extension popup if automatic connect failed.
