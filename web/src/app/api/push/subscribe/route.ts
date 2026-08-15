import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePro } from "@/lib/plan-server";

export async function POST(request: Request) {
  const gated = await requirePro();
  if ("error" in gated) {
    return NextResponse.json({ error: gated.error }, { status: gated.status });
  }

  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: gated.session.userId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const gated = await requirePro();
  if ("error" in gated) {
    return NextResponse.json({ error: gated.error }, { status: gated.status });
  }
  const body = (await request.json().catch(() => ({}))) as { endpoint?: string };
  const supabase = await createClient();
  let q = supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", gated.session.userId);
  if (body.endpoint) q = q.eq("endpoint", body.endpoint);
  const { error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
