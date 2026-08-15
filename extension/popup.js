import { APP_URL } from "./config.js";

const statusEl = document.getElementById("status");
const form = document.getElementById("save-form");
const signin = document.getElementById("signin");
const pasteWrap = document.getElementById("paste-wrap");
const titleInput = document.getElementById("title");
const collectionSelect = document.getElementById("collection");
const message = document.getElementById("message");

function show(el, visible) {
  el.hidden = !visible;
}

signin.addEventListener("click", () => {
  const url = `${APP_URL}/login?next=${encodeURIComponent(`/extension-auth?id=${chrome.runtime.id}`)}`;
  chrome.tabs.create({ url });
});

document.getElementById("save-session").addEventListener("click", async () => {
  const raw = document.getElementById("session-json").value.trim();
  try {
    const parsed = JSON.parse(raw);
    await chrome.storage.local.set({
      session: {
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
        expires_at: parsed.expires_at,
      },
    });
    message.textContent = "Session stored.";
    await boot();
  } catch {
    message.textContent = "Invalid JSON.";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    message.textContent = "No active tab URL.";
    return;
  }
  chrome.runtime.sendMessage(
    {
      type: "SAVE_TAB",
      url: tab.url,
      title: titleInput.value || tab.title,
      collectionId: collectionSelect.value || null,
    },
    (result) => {
      if (chrome.runtime.lastError || !result?.ok) {
        message.textContent = result?.error || chrome.runtime.lastError?.message || "Save failed";
        return;
      }
      message.textContent = "Saved.";
    },
  );
});

async function boot() {
  show(form, false);
  show(signin, false);
  show(pasteWrap, false);
  statusEl.textContent = "Checking session…";
  chrome.runtime.sendMessage({ type: "LIST_COLLECTIONS" }, async (result) => {
    if (chrome.runtime.lastError || !result?.ok) {
      statusEl.textContent = "Sign in to save tabs.";
      show(signin, true);
      show(pasteWrap, true);
      return;
    }
    statusEl.textContent = "Choose a collection, then save.";
    show(form, true);
    collectionSelect.innerHTML = "";
    for (const col of result.collections ?? []) {
      const option = document.createElement("option");
      option.value = col.id;
      option.textContent = col.name;
      collectionSelect.appendChild(option);
    }
    if (result.lastCollectionId) {
      collectionSelect.value = result.lastCollectionId;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    titleInput.value = tab?.title ?? "";
  });
}

void boot();
