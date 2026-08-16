import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSavePayload, hostnameFromUrl } from "./url.js";
import { extensionAuthUrl, parseSessionPayload } from "./session.js";

test("hostnameFromUrl strips www", () => {
  assert.equal(hostnameFromUrl("https://www.example.com/path"), "example.com");
});

test("buildSavePayload uses domain as title fallback", () => {
  const payload = buildSavePayload({
    url: "https://docs.example.com/a",
    title: "",
    collectionId: "col-1",
    now: new Date("2026-08-16T00:00:00.000Z"),
  });
  assert.equal(payload.title, "docs.example.com");
  assert.equal(payload.collection_id, "col-1");
  assert.match(payload.favicon_url, /docs\.example\.com/);
});

test("parseSessionPayload requires tokens", () => {
  const session = parseSessionPayload(
    JSON.stringify({ access_token: "a", refresh_token: "b", expires_at: 1 }),
  );
  assert.equal(session.access_token, "a");
  assert.throws(() => parseSessionPayload("{}"));
});

test("extensionAuthUrl points at localhost handoff", () => {
  const url = extensionAuthUrl("http://localhost:3000", "ext-id");
  assert.match(url, /\/login\?next=/);
  assert.match(url, /extension-auth/);
});
