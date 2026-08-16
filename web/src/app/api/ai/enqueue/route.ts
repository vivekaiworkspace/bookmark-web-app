import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enqueueBodySchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = enqueueBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { linkId, force } = parsed.data;

  const { data: link, error } = await supabase
    .from("links")
    .select("id,user_id,scrape_status,content_raw")
    .eq("id", linkId)
    .eq("user_id", user.id)
    .single();
  if (error || !link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (
    !force &&
    link.scrape_status === "ready" &&
    (link.content_raw ?? "").trim()
  ) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const url = process.env.AI_SERVICE_URL;
  const secret = process.env.AI_SERVICE_SECRET;
  if (!url || !secret) {
    return NextResponse.json(
      { error: "AI service is not configured" },
      { status: 503 },
    );
  }

  const res = await fetch(`${url.replace(/\/$/, "")}/api/v1/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AI-Service-Secret": secret,
    },
    body: JSON.stringify({
      type: "extract_and_tag",
      link_id: link.id,
      user_id: user.id,
      force: Boolean(force),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: text || "AI service error" },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
