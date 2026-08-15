const MODEL = "text-embedding-3-small";

export async function embedText(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY;
  const input = text.trim().slice(0, 8000);
  if (!key || !input) return null;
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, input }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    data?: { embedding?: number[] }[];
  };
  return data.data?.[0]?.embedding ?? null;
}
