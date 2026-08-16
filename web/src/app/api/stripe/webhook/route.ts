import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeSignatureSchema, stripeWebhookBodySchema } from "@/lib/schemas";

export const runtime = "nodejs";

async function setPlan(opts: {
  userId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  plan: "free" | "pro";
}) {
  const admin = createAdminClient();
  let userId = opts.userId ?? null;
  if (!userId && opts.customerId) {
    const { data } = await admin
      .from("profiles")
      .select("user_id")
      .eq("stripe_customer_id", opts.customerId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) return;
  const patch: Record<string, string> = {
    user_id: userId,
    plan: opts.plan,
    updated_at: new Date().toISOString(),
  };
  if (opts.customerId) patch.stripe_customer_id = opts.customerId;
  if (opts.subscriptionId) patch.stripe_subscription_id = opts.subscriptionId;
  await admin.from("profiles").upsert(patch);
}

function isActive(status: Stripe.Subscription.Status) {
  return status === "active" || status === "trialing";
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  }

  const bodyParsed = stripeWebhookBodySchema.safeParse(await request.text());
  const signatureParsed = stripeSignatureSchema.safeParse(
    request.headers.get("stripe-signature"),
  );
  if (!bodyParsed.success || !signatureParsed.success) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  const body = bodyParsed.data;
  const signature = signatureParsed.data;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    await setPlan({
      userId: session.metadata?.user_id || session.client_reference_id,
      customerId:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id,
      subscriptionId: subId,
      plan: "pro",
    });
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.created"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    await setPlan({
      userId: sub.metadata?.user_id,
      customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      subscriptionId: sub.id,
      plan: isActive(sub.status) ? "pro" : "free",
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await setPlan({
      userId: sub.metadata?.user_id,
      customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      subscriptionId: sub.id,
      plan: "free",
    });
  }

  return NextResponse.json({ received: true });
}
