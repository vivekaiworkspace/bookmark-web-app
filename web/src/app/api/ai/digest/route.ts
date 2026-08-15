import { NextResponse } from "next/server";
import { createUserDigest } from "@/lib/create-digest";

export async function POST() {
  const result = await createUserDigest();
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
