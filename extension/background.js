import { APP_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SET_SESSION" && message.session) {
    chrome.storage.local.set({ session: message.session }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
  return false;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SAVE_TAB") {
    saveTab(message)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "LIST_COLLECTIONS") {
    listCollections()
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  return false;
});

async function getValidAccessToken() {
  const stored = await chrome.storage.local.get(["session"]);
  const session = stored.session;
  if (!session?.refresh_token) {
    throw new Error("Not signed in");
  }

  const expiresAt = session.expires_at
    ? session.expires_at * 1000
    : 0;
  if (session.access_token && expiresAt && Date.now() < expiresAt - 30_000) {
    return session.access_token;
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.msg || "Session expired");
  }
  const next = {
    ...session,
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? session.refresh_token,
    expires_at: data.expires_at,
  };
  await chrome.storage.local.set({ session: next });
  return next.access_token;
}

async function supabaseFetch(path, options = {}) {
  const token = await getValidAccessToken();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
  }
  return data;
}

async function listCollections() {
  await supabaseFetch("rpc/ensure_inbox", {
    method: "POST",
    body: "{}",
  }).catch(() => null);
  const collections = await supabaseFetch(
    "collections?select=id,name,color,sort_order&order=sort_order.asc",
  );
  const stored = await chrome.storage.local.get(["lastCollectionId"]);
  return { ok: true, collections, lastCollectionId: stored.lastCollectionId ?? null };
}

function hostnameFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function saveTab({ url, title, collectionId }) {
  const domain = hostnameFromUrl(url);
  const payload = {
    url,
    title: title || domain,
    domain,
    favicon_url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
    collection_id: collectionId || null,
    updated_at: new Date().toISOString(),
  };
  const token = await getValidAccessToken();
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  const user = await userRes.json();
  if (!userRes.ok) throw new Error("Could not load user");

  const rows = await supabaseFetch("links?on_conflict=user_id,url", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({ ...payload, user_id: user.id }),
  });
  if (collectionId) {
    await chrome.storage.local.set({ lastCollectionId: collectionId });
  }
  return { ok: true, link: Array.isArray(rows) ? rows[0] : rows, appUrl: APP_URL };
}
