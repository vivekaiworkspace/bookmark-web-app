# Billing (Free vs Pro)

Your plan is shown on **Settings**. New accounts start on **Free**.

## Free

- Up to **3 collections** and **10 tags**
- Notes and keyword search
- Weekly digest (**Run now** still works)
- Manual tags (AI suggested tags stay off)

## Pro

- Unlimited collections and tags
- AI auto-tag suggestions
- Reminders, **Read Today**, and browser push
- Daily digests and custom digest instructions
- Semantic search and **Ask links**

## Upgrade or manage billing

1. Open **Settings**.
2. Click **Upgrade to Pro** (Stripe Checkout) or **Manage billing** (customer portal) if you already subscribe.
3. After Stripe confirms, limits and Pro features apply immediately on refresh.

If billing buttons fail, Stripe is not configured on the server. Ask whoever runs the app to set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRO_PRICE_ID`.

Downgrade in the Stripe portal. When the subscription ends, the app returns to Free limits. Existing extra collections/tags stay, but you cannot add more until you are under the Free caps or upgrade again.
