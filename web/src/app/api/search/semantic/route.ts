import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePro } from "@/lib/plan-server";
import { embedText } from "@/lib/embeddings";
import { semanticSearchBodySchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const gated = await requirePro();
  if ("error" in gated) {
    return NextResponse.json({ error: gated.error }, { status: gated.status });
  }

  const parsed = semanticSearchBodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }
  const query = parsed.data.query.trim();

  const embedding = await embedText(query);
  if (!embedding) {
    return NextResponse.json(
      { error: "Could not embed query. Set OPENAI_API_KEY." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_links", {
    query_embedding: embedding,
    match_threshold: 0.25,
    match_count: 20,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ results: data ?? [] });
}
