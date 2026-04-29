const STORAGE_KEY = "captured_credentials_v1";

function emptyState() {
  return {
    aliyun: null,
    cfm: null,
    lastUpdatedAt: 0,
  };
}

function normalizeHeaders(headers = []) {
  const out = {};
  headers.forEach((h) => {
    if (!h || !h.name) return;
    out[h.name.toLowerCase()] = h.value || "";
  });
  return out;
}

function classifyProvider(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("aliyun.com")) return "aliyun";
  if (u.includes("cycor.io") || u.includes("cfm")) return "cfm";
  return null;
}

function pickToken(headerMap) {
  const auth = headerMap["authorization"] || "";
  if (auth.trim()) return auth.trim();
  const csrf = headerMap["x-csrf-token"] || headerMap["sec_token"] || "";
  if (csrf.trim()) return csrf.trim();
  return "";
}

function buildCredentialPayload(provider, details, headerMap) {
  return {
    provider,
    capturedAt: Date.now(),
    request: {
      method: details.method || "GET",
      url: details.url || "",
    },
    credential: {
      apiUrl: details.url || "",
      token: pickToken(headerMap),
      csrfToken: headerMap["x-csrf-token"] || "",
      cookie: headerMap["cookie"] || "",
      authorization: headerMap["authorization"] || "",
    },
  };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ [STORAGE_KEY]: emptyState() });
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  async (details) => {
    const provider = classifyProvider(details.url);
    if (!provider) return;

    const headerMap = normalizeHeaders(details.requestHeaders);
    const payload = buildCredentialPayload(provider, details, headerMap);

    const store = await chrome.storage.local.get(STORAGE_KEY);
    const current = store[STORAGE_KEY] || emptyState();
    current[provider] = payload;
    current.lastUpdatedAt = Date.now();
    await chrome.storage.local.set({ [STORAGE_KEY]: current });
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"],
);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "GET_CAPTURED_CREDENTIALS") {
    chrome.storage.local.get(STORAGE_KEY).then((store) => {
      sendResponse({ ok: true, data: store[STORAGE_KEY] || emptyState() });
    });
    return true;
  }

  if (msg?.type === "CLEAR_CAPTURED_CREDENTIALS") {
    chrome.storage.local.set({ [STORAGE_KEY]: emptyState() }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});
