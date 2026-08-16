export function hostnameFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function faviconForDomain(domain) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

export function buildSavePayload({ url, title, collectionId, now = new Date() }) {
  const domain = hostnameFromUrl(url);
  return {
    url,
    title: title || domain,
    domain,
    favicon_url: faviconForDomain(domain),
    collection_id: collectionId || null,
    updated_at: now.toISOString(),
  };
}
