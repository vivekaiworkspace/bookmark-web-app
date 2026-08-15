# Reminders, Read Today, and notifications

These features are **Pro**. Upgrade from [Billing](billing.md).

## Set a reminder

1. Open a link → **Notes & tags**.
2. Pick a date and time under **Reminder**.
3. Click **Save reminder**. **Clear** dismisses it.

## Read Today

**Read Today** (top of the workspace) lists reminders due today and overdue items, plus later reminders.

- **Done** marks the reminder completed.
- **Dismiss** removes it from the queue without completing.

## Email and browser push

When a reminder is due, or a digest is created, the app can send:

- **Email** via Resend (if `RESEND_API_KEY` and `RESEND_FROM` are set)
- **Browser push** if you click **Enable browser push** on Settings (needs VAPID keys)

Each reminder is notified **once** (`is_triggered`). Digests are notified once (`notify_sent`).

The notify job is `POST /api/cron/notify` with header `X-Cron-Secret`. With Docker, Celery beat calls that URL every five minutes.
