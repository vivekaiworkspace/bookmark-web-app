import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePro } from "@/lib/plan-server";
import { embedText } from "@/lib/embeddings";

type Match = {
  id: string;
  title: string;
  url: string;
  domain: string | null;
  similarity: number;
};

export async function POST(request: Request) {
  const gated = await requirePro();
  if ("error" in gated) {
    return NextResponse.json({ error: gated.error }, { status: gated.status });
  }

  const body = (await request.json()) as { question?: string };
  const question = body.question?.trim() ?? "";
  if (question.length < 4) {
    return NextResponse.json({ error: "Ask a longer question" }, { status: 400 });
  }

  const embedding = await embedText(question);
  if (!embedding) {
    return NextResponse.json(
      { error: "Could not embed question. Set OPENAI_API_KEY." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data: matches, error } = await supabase.rpc("match_links", {
    query_embedding: embedding,
    match_threshold: 0.2,
    match_count: 8,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = (matches ?? []) as Match[];
  if (!rows.length) {
    return NextResponse.json({
      answer: "No saved links were similar enough to answer that.",
      matches: [],
    });
  }

  const ids = rows.map((row) => row.id);
  const { data: links } = await supabase
    .from("links")
    .select("id,title,url,content_raw")
    .in("id", ids);

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({
      answer: rows
        .map((row) => `- ${row.title} (${row.url})`)
        .join("\n"),
      matches: rows,
    });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Answer using only the provided bookmarks. Cite titles. If the bookmarks are not enough, say so.",
        },
        {
          role: "user",
          content: JSON.stringify({
            question,
            bookmarks: (links ?? []).map((link) => ({
              title: link.title,
              url: link.url,
              excerpt: (link.content_raw ?? "").slice(0, 1200),
            })),
          }),
        },
      ],
    }),
  });
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const answer =
    json.choices?.[0]?.message?.content?.trim() ||
    "Could not generate an answer.";
  return NextResponse.json({ answer, matches: rows });
}
