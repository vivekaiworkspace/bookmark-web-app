# Troubleshooting

## The website is blank or “can’t connect”

- Confirm `npm run dev` is running in the project folder.
- Open exactly [http://localhost:3000](http://localhost:3000).
- Wait until the terminal says the app is ready.

## I created an account but cannot sign in

- Use **Sign in** (not Sign up) with the same email and password.
- If you see **email not confirmed**, open the confirmation email, or ask the person who runs the app to disable Confirm email / confirm your user in Supabase.
- Password must be at least 6 characters.

## Google sign-in shows JSON (`provider is not enabled` / `missing OAuth secret`)

Google is not fully set up. Use **email and password** until Client ID, Client secret, and redirect URLs are configured. See the project [README](../README.md) for operator steps.

## Fetch on Save link does nothing useful

Some sites block previews. You can still save; edit the title yourself. The card may show the site name instead of an image.

## I cannot create another collection or tag

On **Free** you are capped at **3 collections** and **10 tags**. Upgrade to Pro in [Settings](billing.md), or remove one you do not need.

## Semantic search is empty or blocked

- Semantic search is **Pro**.
- Links need scraped text and an embedding (AI worker + `OPENAI_API_KEY`).
- The web app also needs `OPENAI_API_KEY` to embed your query.

## Reminders will not save

Reminders require Pro. The database rejects Free-plan inserts.

## Email or push never arrives

- Set `RESEND_API_KEY` / `RESEND_FROM` for email.
- Set VAPID keys and click **Enable browser push** on Settings (Pro).
- Hit `POST /api/cron/notify` with `X-Cron-Secret`, or run Docker so Celery beat calls it.

## Billing buttons fail

Stripe env vars are missing (`STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`). Checkout and the portal stay off until those are set. Webhooks must reach `/api/stripe/webhook`.

## The extension always asks me to sign in

Complete the connect step in [Browser extension](browser-extension.md) (automatic connect or paste session JSON). The web app must be running at the URL in `extension/config.js` (usually `http://localhost:3000`).

## Save current tab fails

- You must be signed in to the extension.
- Use a normal `http` or `https` page, not `chrome://`.
- Reload the extension after `extension` files change.

## I signed in on the website but the extension is a different user

The extension has its own stored session. Sign in again from the popup, or paste a fresh session from `/extension-auth`.

## I deleted a collection and my links vanished from that list

They should still be under **All links**. Open All links and assign a collection in **Notes & tags**.

## Suggested tags never appear

- Confirm the AI service is running (`docker compose up` in the project folder, after `services/ai/.env` has a service role key and optional `OPENAI_API_KEY`).
- Confirm `.env.local` has `AI_SERVICE_URL=http://localhost:8000` and the same `AI_SERVICE_SECRET` as the Python service.
- Wait a few seconds and refresh. Cards show **AI: reading page…** while work is queued.
- Some sites block scraping. Failed scrapes show an error on the card; tags need page text.
- Without `OPENAI_API_KEY`, scrape can still fill content, but auto-tag stays failed.

## Digests stay empty

Open **Settings** and set frequency to weekly or daily, or click **Run now** on the Digests page. Run now works from the website (it does not need Docker). For background scrape/auto-tag, start the AI service with `docker compose up`.

## Still stuck

Note what you clicked, the exact message, and whether you used the website or the extension. That helps whoever maintains the app.
