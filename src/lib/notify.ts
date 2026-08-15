import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/stripe";

type PushRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function vapidReady() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

function configureVapid() {
  if (!vapidReady()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return true;
}

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from || !to) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
}

async function sendPush(subs: PushRow[], title: string, body: string, url: string) {
  if (!configureVapid() || !subs.length) return;
  const payload = JSON.stringify({ title, body, url });
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          const admin = createAdminClient();
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    }),
  );
}

async function userContact(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", userId);
  return {
    email: data.user?.email ?? "",
    push: (subs ?? []) as PushRow[],
  };
}

export async function notifyUser(
  userId: string,
  subject: string,
  html: string,
  pushTitle: string,
  pushBody: string,
  path: string,
) {
  const contact = await userContact(userId);
  await sendEmail(contact.email, subject, html);
  await sendPush(contact.push, pushTitle, pushBody, `${appUrl()}${path}`);
}

export async function dispatchDueReminders() {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: due, error } = await admin
    .from("reminders")
    .select("id,user_id,link_id,remind_at")
    .eq("status", "pending")
    .eq("is_triggered", false)
    .lte("remind_at", now)
    .limit(50);
  if (error || !due?.length) return { reminders: 0 };

  let sent = 0;
  for (const row of due) {
    const { data: link } = await admin
      .from("links")
      .select("title,url")
      .eq("id", row.link_id)
      .maybeSingle();
    const title = link?.title || "Saved link";
    await notifyUser(
      row.user_id,
      `Read today: ${title}`,
      `<p>Your reminder is due for <a href="${link?.url ?? appUrl() + "/read-today"}">${title}</a>.</p><p>Open <a href="${appUrl()}/read-today">Read Today</a>.</p>`,
      "Read Today",
      title,
      "/read-today",
    );
    await admin
      .from("reminders")
      .update({ is_triggered: true })
      .eq("id", row.id)
      .eq("is_triggered", false);
    sent += 1;
  }
  return { reminders: sent };
}

export async function dispatchUnsentDigests() {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("ai_summaries")
    .select("id,user_id,content,generated_at")
    .eq("notify_sent", false)
    .order("generated_at", { ascending: true })
    .limit(20);
  if (error || !rows?.length) return { digests: 0 };

  let sent = 0;
  for (const row of rows) {
    const preview = row.content.slice(0, 280);
    await notifyUser(
      row.user_id,
      "Your bookmark digest is ready",
      `<p>A new digest is available.</p><pre>${preview}</pre><p><a href="${appUrl()}/digests">Open digests</a></p>`,
      "Digest ready",
      preview,
      "/digests",
    );
    await admin.from("ai_summaries").update({ notify_sent: true }).eq("id", row.id);
    sent += 1;
  }
  return { digests: sent };
}

export async function dispatchNotifications() {
  const reminders = await dispatchDueReminders();
  const digests = await dispatchUnsentDigests();
  return { ...reminders, ...digests };
}
