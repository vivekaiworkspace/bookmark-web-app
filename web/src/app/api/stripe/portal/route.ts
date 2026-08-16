import { NextResponse } from "next/server";
import { getUserPlan } from "@/lib/plan-server";
import { appUrl, getStripe, stripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { emptyJsonBodySchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = emptyJsonBodySchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 },
    );
  }
  const session = await getUserPlan();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing customer yet. Upgrade first." },
      { status: 400 },
    );
  }

  const stripe = getStripe()!;
  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl()}/settings`,
  });
  return NextResponse.json({ url: portal.url });
}
