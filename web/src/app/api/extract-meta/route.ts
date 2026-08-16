import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { faviconForDomain, hostnameFromUrl, normalizeUrl } from "@/lib/utils";
import { extractMetaBodySchema } from "@/lib/schemas";

function attr(html: string, names: string[]) {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    const match = html.match(re);
    if (match?.[1]) return decode(match[1]);
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`,
      "i",
    );
    const match2 = html.match(re2);
    if (match2?.[1]) return decode(match2[1]);
  }
  return null;
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absoluteUrl(maybe: string | null, base: string) {
  if (!maybe) return null;
  try {
    return new URL(maybe, base).toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = extractMetaBodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  const url = normalizeUrl(parsed.data.url);
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const domain = hostnameFromUrl(url);
  const fallback = {
    url,
    title: domain,
    domain,
    favicon_url: faviconForDomain(domain),
    og_image_url: null as string | null,
  };

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SmartBookmarkManager/1.0; +https://localhost)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    const title = attr(html, ["og:title", "twitter:title"]) || titleTag || domain;
    const og = attr(html, ["og:image", "twitter:image"]);
    return NextResponse.json({
      url,
      title: decode(title).slice(0, 300),
      domain,
      favicon_url: faviconForDomain(domain),
      og_image_url: absoluteUrl(og, url),
    });
  } catch {
    return NextResponse.json(fallback);
  }
}
