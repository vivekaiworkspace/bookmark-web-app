import { NextResponse } from "next/server";
import { dispatchNotifications } from "@/lib/notify";
import { cronSecretHeaderSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = cronSecretHeaderSchema.safeParse(
    request.headers.get("x-cron-secret"),
  );
  if (!secret || !header.success || header.data !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await dispatchNotifications();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notify failed" },
      { status: 500 },
    );
  }
}
