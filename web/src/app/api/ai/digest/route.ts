import { NextResponse } from "next/server";
import { createUserDigest } from "@/lib/create-digest";
import { emptyJsonBodySchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = emptyJsonBodySchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const result = await createUserDigest();
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
