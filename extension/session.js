export function parseSessionPayload(raw) {
  const parsed = JSON.parse(raw);
  if (!parsed?.access_token || !parsed?.refresh_token) {
    throw new Error("Invalid session JSON");
  }
  return {
    access_token: parsed.access_token,
    refresh_token: parsed.refresh_token,
    expires_at: parsed.expires_at,
  };
}

export function extensionAuthUrl(appUrl, extensionId) {
  const next = `/extension-auth?id=${extensionId}`;
  return `${appUrl}/login?next=${encodeURIComponent(next)}`;
}
