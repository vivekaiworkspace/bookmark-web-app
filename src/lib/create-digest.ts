import { createClient } from "@/lib/supabase/server";

type LinkBrief = {
  title: string | null;
  url: string;
  domain: string | null;
  content_raw: string | null;
};

function windowHours(frequency: string | null | undefined) {
  return frequency === "daily" ? 24 : 24 * 7;
}

function markdownFallback(links: LinkBrief[]) {
  if (!links.length) return "_No links saved in this period._";
  const items = links
    .map((link) => `- [${link.title || link.url}](${link.url})`)
    .join("\n");
  return `## Recent bookmarks\n\n${items}`;
}

async function llmDigest(
  links: LinkBrief[],
  promptOverride: string | null,
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Write a markdown digest of the user's recently saved bookmarks. Use headings and bullet points. Be concise. Honor any extra instructions from the user.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instructions: promptOverride?.trim() || "No extra instructions.",
            links: links.map((link) => ({
              title: link.title,
              url: link.url,
              domain: link.domain,
              excerpt: (link.content_raw ?? "").slice(0, 800),
            })),
          }),
        },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

export async function createUserDigest() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const { data: settings } = await supabase
    .from("user_ai_settings")
    .select("prompt_override,digest_frequency")
    .eq("user_id", user.id)
    .maybeSingle();

  const since = new Date(
    Date.now() - windowHours(settings?.digest_frequency) * 3600 * 1000,
  ).toISOString();

  const { data: links, error: linkError } = await supabase
    .from("links")
    .select("title,url,domain,content_raw")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(40);
  if (linkError) {
    return { error: linkError.message, status: 500 as const };
  }

  const list = (links ?? []) as LinkBrief[];
  const prompt = settings?.prompt_override ?? null;
  let content = await llmDigest(list, prompt);
  if (!content) content = markdownFallback(list);

  const { data, error } = await supabase
    .from("ai_summaries")
    .insert({
      user_id: user.id,
      collection_id: null,
      content,
      prompt_used: prompt,
    })
    .select()
    .single();
  if (error || !data) {
    return { error: error?.message ?? "Could not save digest", status: 500 as const };
  }
  return { data };
}
